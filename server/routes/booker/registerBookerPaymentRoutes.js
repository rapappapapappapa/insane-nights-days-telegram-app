/**
 * Booker : publication feed, paiements DJ/lieu/prestataire.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerBookerPaymentRoutes(app, deps) {
  const { authenticateToken } = deps;

app.post('/api/booker/events/:eventId/publish-to-feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, bookerId: booker.id },
      include: { eventDjs: true, eventVenues: true, eventPrestataires: true },
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable ou accès refusé.' });
    }

    if (event.publishedOnFeed) {
      return res.status(400).json({ success: false, message: "L'événement est déjà publié sur le feed." });
    }

    const allDjSigned = event.eventDjs.length > 0 && event.eventDjs.every((ed) => ed.contractStatus === 'SIGNED');
    const allVenueSigned = !event.eventVenues?.length || event.eventVenues.every((ev) => ev.contractStatus === 'SIGNED');
    const allPrestataireSigned =
      !event.eventPrestataires?.length || event.eventPrestataires.every((ep) => ep.contractStatus === 'SIGNED');
    if (!allDjSigned || !allVenueSigned || !allPrestataireSigned) {
      return res.status(400).json({
        success: false,
        message:
          "Tous les contrats (DJ, lieu et prestataire le cas échéant) doivent être signés avant de publier sur le feed.",
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { publishedOnFeed: true },
    });

    return res.json({ success: true, message: "L'événement a été publié sur le feed." });
  } catch (error) {
    console.error('Erreur publication feed:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ MVP: Mettre à jour le statut de paiement d'un booking (Booker -> DJ)
 * @route PUT /api/booker/event-djs/:eventDjId/payment
 * body: { status: 'UPCOMING'|'PENDING'|'PAID', amount?: number (cents), currency?: 'eur', invoiceNumber?: string }
 */
app.put('/api/booker/event-djs/:eventDjId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ed = await prisma.eventDj.findUnique({
      where: { id: eventDjId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ed) return res.status(404).json({ success: false, message: 'Booking (EventDj) introuvable.' });

    // Vérifier que le booker connecté possède cet event
    const isOwner = ed.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ed.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ed.invoiceNumber;

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ed.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ed.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    if (status === 'PAID' && ed.contractStatus === 'PENDING_PAYMENT') {
      const { fulfillContractPaymentAndStartSignature } = require('../../utils/contractSignature');
      await fulfillContractPaymentAndStartSignature('dj', eventDjId, {
        paymentIntentId: ed.stripePaymentIntentId || undefined,
      });
    }

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment booking:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Mettre à jour le statut de paiement d'un booking lieu (Booker -> Venue)
 * @route PUT /api/booker/event-venues/:eventVenueId/payment
 * body: { status: 'UPCOMING'|'PENDING'|'PAID', amount?: number (cents), currency?: 'eur', invoiceNumber?: string }
 */
app.put('/api/booker/event-venues/:eventVenueId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ev) return res.status(404).json({ success: false, message: 'Booking (EventVenue) introuvable.' });

    const isOwner = ev.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ev.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ev.invoiceNumber;

    const next = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ev.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ev.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    if (status === 'PAID' && ev.contractStatus === 'PENDING_PAYMENT') {
      const { fulfillContractPaymentAndStartSignature } = require('../../utils/contractSignature');
      await fulfillContractPaymentAndStartSignature('venue', eventVenueId, {
        paymentIntentId: ev.stripePaymentIntentId || undefined,
      });
    }

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment event-venue:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Mettre à jour le statut de paiement d'un booking prestataire (Booker → Prestataire)
 * @route PUT /api/booker/event-prestataires/:eventPrestataireId/payment
 */
app.put('/api/booker/event-prestataires/:eventPrestataireId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ep) return res.status(404).json({ success: false, message: 'Booking (EventPrestataire) introuvable.' });

    const isOwner = ep.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ep.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ep.invoiceNumber;

    const next = await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ep.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ep.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    if (status === 'PAID' && ep.contractStatus === 'PENDING_PAYMENT') {
      const { fulfillContractPaymentAndStartSignature } = require('../../utils/contractSignature');
      await fulfillContractPaymentAndStartSignature('prestataire', eventPrestataireId, {
        paymentIntentId: ep.stripePaymentIntentId || undefined,
      });
    }

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment event-prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
