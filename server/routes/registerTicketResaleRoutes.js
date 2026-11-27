/**
 * Revente de billets via NOX : mise en vente, retrait, annonces d’un événement, achat Stripe.
 */
const prisma = require('../lib/prisma');
const { tierLabelForTicket } = require('../utils/ticketTierDisplay');
const {
  RESERVATION_MS,
  OPEN_STATUSES,
  availableListingWhere,
  resaleEligibility,
  fulfilResalePayment,
  makeTicketQrCode,
} = require('../utils/ticketResale');

module.exports = function registerTicketResaleRoutes(app, deps) {
  const { authenticateToken, uuidv4, stripe, stripePublishableKey } = deps;
  const makeQrCode = () => makeTicketQrCode(uuidv4);

  /**
   * Mettre un billet en vente au prix payé. Le QR est régénéré et le billet gelé (refusé au scan).
   * @route POST /api/tickets/:ticketId/resale
   */
  app.post('/api/tickets/:ticketId/resale', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const ticket = await prisma.ticket.findUnique({
        where: { id: req.params.ticketId },
        include: {
          event: { select: { status: true } },
          payment: { select: { userId: true } },
        },
      });
      const reason = resaleEligibility(ticket, userId);
      if (reason) return res.status(400).json({ success: false, message: reason });

      const priceCents = Math.round(Number(ticket.price) * 100);
      const listing = await prisma.$transaction(async (tx) => {
        const frozen = await tx.ticket.updateMany({
          where: { id: ticket.id, userId, status: 'valid', scannedAt: null },
          data: { status: 'on_resale', qrCode: makeQrCode() },
        });
        if (frozen.count === 0) return null;
        return tx.ticketResale.create({
          data: {
            ticketId: ticket.id,
            sellerId: userId,
            eventId: ticket.eventId,
            priceCents,
            sellerPaymentIntentId: ticket.paymentIntentId,
          },
        });
      });
      if (!listing) {
        return res.status(409).json({ success: false, message: 'Le billet a changé entre-temps, réessaie.' });
      }
      return res.json({
        success: true,
        message: 'Billet mis en vente.',
        resale: { id: listing.id, status: listing.status, priceCents: listing.priceCents },
      });
    } catch (error) {
      console.error('Erreur mise en revente:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Retirer son billet de la revente (impossible pendant un paiement en cours).
   * @route DELETE /api/tickets/:ticketId/resale
   */
  app.delete('/api/tickets/:ticketId/resale', authenticateToken, async (req, res) => {
    try {
      const userId = req.user.id;
      const now = new Date();
      const listing = await prisma.ticketResale.findFirst({
        where: { ticketId: req.params.ticketId, sellerId: userId, status: { in: OPEN_STATUSES } },
      });
      if (!listing) return res.status(404).json({ success: false, message: 'Aucune revente en cours pour ce billet.' });

      const done = await prisma.$transaction(async (tx) => {
        const cancelled = await tx.ticketResale.updateMany({
          where: { id: listing.id, ...availableListingWhere(now) },
          data: { status: 'CANCELLED', reservedUntil: null },
        });
        if (cancelled.count === 0) return false;
        await tx.ticket.updateMany({
          where: { id: listing.ticketId, userId, status: 'on_resale' },
          data: { status: 'valid', qrCode: makeQrCode() },
        });
        return true;
      });
      if (!done) {
        return res.status(409).json({
          success: false,
          message: 'Un acheteur est en train de payer ce billet. Réessaie dans quelques minutes.',
        });
      }
      return res.json({ success: true, message: 'Billet retiré de la revente.' });
    } catch (error) {
      console.error('Erreur retrait revente:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Annonces achetables d’un événement (hors les siennes).
   * @route GET /api/events/:eventId/resale
   */
  app.get('/api/events/:eventId/resale', authenticateToken, async (req, res) => {
    try {
      const event = await prisma.event.findUnique({
        where: { id: req.params.eventId },
        select: { status: true, ticketTiers: true },
      });
      if (!event || event.status !== 'UPCOMING') return res.json({ success: true, listings: [] });
      const listings = await prisma.ticketResale.findMany({
        where: { eventId: req.params.eventId, sellerId: { not: req.user.id }, ...availableListingWhere() },
        orderBy: [{ priceCents: 'asc' }, { createdAt: 'asc' }],
        take: 20,
        select: { id: true, priceCents: true, ticket: { select: { tierId: true } } },
      });
      return res.json({
        success: true,
        listings: listings.map((l) => ({
          id: l.id,
          priceCents: l.priceCents,
          tierLabel: tierLabelForTicket(event.ticketTiers, l.ticket?.tierId),
        })),
      });
    } catch (error) {
      console.error('Erreur annonces revente:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Réserve une annonce 15 min et crée le PaymentIntent de l’acheteur.
   * @route POST /api/resale/:resaleId/intent
   */
  app.post('/api/resale/:resaleId/intent', authenticateToken, async (req, res) => {
    try {
      if (!stripe || !stripePublishableKey) {
        return res.status(500).json({ success: false, message: 'Stripe n’est pas configuré côté serveur.' });
      }
      const userId = req.user.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { activeProfileType: true, communities: { select: { id: true }, take: 1 } },
      });
      if (user?.activeProfileType !== 'COMMUNITY' || !user.communities?.length) {
        return res.status(403).json({ success: false, message: 'Bascule sur ton profil Communauté pour acheter un billet.' });
      }

      const listing = await prisma.ticketResale.findUnique({
        where: { id: req.params.resaleId },
        include: { event: { select: { status: true } } },
      });
      if (!listing || listing.event?.status !== 'UPCOMING') {
        return res.status(404).json({ success: false, message: 'Cette revente n’est plus disponible.' });
      }
      if (listing.sellerId === userId) {
        return res.status(400).json({ success: false, message: 'C’est ton propre billet.' });
      }

      const now = new Date();
      const reserved = await prisma.ticketResale.updateMany({
        where: { id: listing.id, ...availableListingWhere(now) },
        data: { status: 'RESERVED', buyerId: userId, reservedUntil: new Date(now.getTime() + RESERVATION_MS) },
      });
      if (reserved.count === 0) {
        return res.status(409).json({ success: false, message: 'Quelqu’un est déjà en train d’acheter ce billet.' });
      }

      let intent;
      try {
        intent = await stripe.paymentIntents.create({
          amount: listing.priceCents,
          currency: 'eur',
          automatic_payment_methods: { enabled: true },
          metadata: { type: 'resale', resaleId: listing.id, userId, eventId: listing.eventId },
        });
      } catch (error) {
        await prisma.ticketResale.updateMany({
          where: { id: listing.id, buyerId: userId, status: 'RESERVED' },
          data: { status: 'ACTIVE', buyerId: null, reservedUntil: null },
        });
        throw error;
      }

      await prisma.$transaction([
        prisma.ticketResale.update({ where: { id: listing.id }, data: { buyerPaymentIntentId: intent.id } }),
        prisma.payment.create({
          data: {
            userId,
            eventId: listing.eventId,
            paymentIntentId: intent.id,
            amount: listing.priceCents,
            currency: 'eur',
            quantity: 1,
            resaleId: listing.id,
            status: 'created',
          },
        }),
      ]);

      return res.json({
        success: true,
        publishableKey: stripePublishableKey,
        paymentIntentClientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: listing.priceCents,
        currency: 'eur',
      });
    } catch (error) {
      console.error('Erreur intent revente:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });

  /**
   * Confirmation côté app après le PaymentSheet (le webhook fait la même chose, idempotent).
   * @route POST /api/resale/confirm
   */
  app.post('/api/resale/confirm', authenticateToken, async (req, res) => {
    try {
      const { paymentIntentId } = req.body ?? {};
      if (!paymentIntentId) return res.status(400).json({ success: false, message: 'paymentIntentId est requis.' });
      const payment = await prisma.payment.findUnique({ where: { paymentIntentId } });
      if (!payment?.resaleId || payment.userId !== req.user.id) {
        return res.status(404).json({ success: false, message: 'Paiement introuvable.' });
      }

      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({ success: false, message: `Paiement non validé (status: ${intent.status}).` });
      }
      if (intent.amount !== payment.amount) {
        return res.status(400).json({ success: false, message: 'Paiement invalide (montant).' });
      }

      const result = await fulfilResalePayment({ stripe, paymentIntentId, makeQrCode });
      if (result.status === 'conflict') {
        return res.status(409).json({
          success: false,
          message: 'Ce billet vient d’être vendu à quelqu’un d’autre : ton paiement est intégralement remboursé.',
        });
      }
      return res.json({ success: true, message: 'Billet acheté en revente.', ticketId: result.ticketId });
    } catch (error) {
      console.error('Erreur confirmation revente:', error);
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  });
};

