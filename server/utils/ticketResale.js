/**
 * Revente de billets via NOX (sans Stripe Connect).
 * Le vendeur met son billet en vente au prix payé ; l’acheteur paie NOX, récupère le billet
 * (nouveau QR) et le vendeur est remboursé de ce montant sur son paiement Stripe d’origine.
 */
const prisma = require('../lib/prisma');
const { notifyUsers } = require('./appNotifications');
const { sendTicketEmail } = require('./ticketEmail');

const RESERVATION_MS = 15 * 60 * 1000;
const OPEN_STATUSES = ['ACTIVE', 'RESERVED'];

function makeTicketQrCode(uuidv4) {
  return `TICKET_${uuidv4().replace(/-/g, '').slice(0, 24).toUpperCase()}`;
}

/** Annonces achetables : actives, ou réservées dont la réservation a expiré. */
function availableListingWhere(now = new Date()) {
  return {
    OR: [{ status: 'ACTIVE' }, { status: 'RESERVED', reservedUntil: { lt: now } }],
  };
}

/** Un billet ne se revend que s’il a été payé par son détenteur actuel (le remboursement part sur sa carte). */
function resaleEligibility(ticket, userId) {
  if (!ticket || ticket.userId !== userId) return 'Billet introuvable.';
  if (ticket.status !== 'valid' || ticket.scannedAt || (ticket.scannedVenueIds || []).length > 0) {
    return 'Ce billet a déjà servi : il ne peut pas être revendu.';
  }
  if (!ticket.event || ticket.event.status !== 'UPCOMING') return 'La revente est fermée pour cet événement.';
  if (!(ticket.price > 0) || !ticket.paymentIntentId) return 'Seuls les billets payants peuvent être revendus.';
  if (ticket.payment?.userId !== userId) {
    return 'Ce billet t’a été transféré : seul l’acheteur d’origine peut le revendre.';
  }
  return null;
}

async function refundSeller(stripe, listing) {
  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: listing.sellerPaymentIntentId,
        amount: listing.priceCents,
        metadata: { type: 'ticket_resale', resaleId: listing.id },
      },
      { idempotencyKey: `ticket-resale-refund-${listing.id}` },
    );
    await prisma.ticketResale.update({
      where: { id: listing.id },
      data: { sellerRefundId: refund.id, refundStatus: refund.status === 'failed' ? 'failed' : 'succeeded' },
    });
    return true;
  } catch (error) {
    console.error('[ticketResale] remboursement vendeur échoué', listing.id, error?.message || error);
    await prisma.ticketResale.update({ where: { id: listing.id }, data: { refundStatus: 'failed' } });
    return false;
  }
}

/**
 * Finalise l’achat d’une annonce après paiement réussi (webhook ou confirmation app). Idempotent.
 * Si l’annonce n’est plus réservée pour ce paiement (expirée puis vendue, retirée…), l’acheteur est remboursé.
 * @returns {{ status: 'fulfilled'|'already'|'conflict'|'not_found', ticketId?: string }}
 */
async function fulfilResalePayment({ stripe, paymentIntentId, makeQrCode }) {
  const outcome = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { paymentIntentId } });
    if (!payment?.resaleId) return { status: 'not_found' };
    if (payment.status === 'fulfilled') {
      const sold = await tx.ticketResale.findUnique({ where: { id: payment.resaleId }, select: { ticketId: true } });
      return { status: 'already', ticketId: sold?.ticketId };
    }
    if (payment.status === 'refunded') return { status: 'conflict', payment };

    const listing = await tx.ticketResale.findUnique({ where: { id: payment.resaleId } });
    const stillOurs =
      listing && listing.status === 'RESERVED' && listing.buyerPaymentIntentId === paymentIntentId;
    if (!stillOurs) {
      await tx.payment.update({ where: { paymentIntentId }, data: { status: 'refunded' } });
      return { status: 'conflict', payment, refundBuyer: true };
    }

    const moved = await tx.ticket.updateMany({
      where: { id: listing.ticketId, userId: listing.sellerId, status: 'on_resale' },
      data: {
        userId: payment.userId,
        status: 'valid',
        qrCode: makeQrCode(),
        paymentIntentId,
      },
    });
    if (moved.count === 0) {
      await tx.payment.update({ where: { paymentIntentId }, data: { status: 'refunded' } });
      await tx.ticketResale.update({ where: { id: listing.id }, data: { status: 'CANCELLED' } });
      return { status: 'conflict', payment, refundBuyer: true };
    }

    await tx.ticketResale.update({
      where: { id: listing.id },
      data: { status: 'SOLD', buyerId: payment.userId, soldAt: new Date(), reservedUntil: null, refundStatus: 'pending' },
    });
    await tx.payment.update({ where: { paymentIntentId }, data: { status: 'fulfilled' } });
    return { status: 'fulfilled', listing, payment, ticketId: listing.ticketId };
  });

  if (outcome.refundBuyer && stripe) {
    try {
      await stripe.refunds.create(
        { payment_intent: paymentIntentId, metadata: { type: 'ticket_resale_conflict' } },
        { idempotencyKey: `ticket-resale-buyer-refund-${paymentIntentId}` },
      );
    } catch (error) {
      console.error('[ticketResale] remboursement acheteur échoué', paymentIntentId, error?.message || error);
    }
    notifyUsers([outcome.payment.userId], {
      category: 'events',
      type: 'resale_conflict',
      title: 'Billet déjà revendu',
      body: 'Quelqu’un a été plus rapide : ton paiement est intégralement remboursé.',
      eventId: outcome.payment.eventId,
      dedupeKey: `resale-conflict:${paymentIntentId}`,
    });
  }

  if (outcome.status === 'fulfilled') {
    const { listing, payment } = outcome;
    const refunded = stripe ? await refundSeller(stripe, listing) : false;
    const event = await prisma.event.findUnique({
      where: { id: listing.eventId },
      select: { id: true, title: true, image: true },
    });
    const euros = (listing.priceCents / 100).toFixed(2).replace('.', ',');
    notifyUsers([payment.userId], {
      category: 'events',
      type: 'ticket_purchased',
      title: 'Billet confirmé',
      body: `${event?.title || 'Ton événement'} — billet de revente, retrouve ton QR code dans Billets.`,
      eventId: listing.eventId,
      imageUrl: event?.image,
      dedupeKey: `ticket:${paymentIntentId}`,
    }).then((created) => {
      if (created > 0) {
        sendTicketEmail({
          userId: payment.userId,
          ticketIds: [listing.ticketId],
          kind: 'resale',
          amountPaid: listing.priceCents / 100,
        });
      }
    });
    notifyUsers([listing.sellerId], {
      category: 'events',
      type: 'resale_sold',
      title: 'Billet revendu',
      body: refunded
        ? `Ton billet pour ${event?.title || 'l’événement'} a trouvé preneur : ${euros} € remboursés sur ta carte (5 à 10 jours).`
        : `Ton billet pour ${event?.title || 'l’événement'} a trouvé preneur. Le remboursement de ${euros} € est en cours de traitement.`,
      eventId: listing.eventId,
      imageUrl: event?.image,
      dedupeKey: `resale-sold:${listing.id}`,
    });
  }

  return { status: outcome.status, ticketId: outcome.ticketId };
}

const REFUND_RETRY_EVERY_MS = 30 * 60 * 1000;
const REFUND_STUCK_PENDING_MS = 15 * 60 * 1000;
const REFUND_GIVE_UP_AFTER_MS = 48 * 60 * 60 * 1000;
let lastRefundRetryAt = 0;

/** Remboursement vendeur déjà créé chez Stripe pour cette annonce (évite un double remboursement). */
async function findSellerRefund(stripe, listing) {
  const refunds = await stripe.refunds.list({ payment_intent: listing.sellerPaymentIntentId, limit: 100 });
  return refunds.data.find((r) => r.metadata?.resaleId === listing.id && !['failed', 'canceled'].includes(r.status)) || null;
}

async function alertManualRefund(listing, reason) {
  console.error('[ticketResale] remboursement vendeur à traiter à la main', listing.id, reason);
  const { sendMail, isConfigured } = require('./mailer');
  const to = process.env.ADMIN_ALERT_EMAIL || 'support@nox.world';
  if (!isConfigured()) return;
  try {
    await sendMail({
      to,
      subject: `[NOX] Remboursement de revente à traiter — ${(listing.priceCents / 100).toFixed(2)} €`,
      html: `<p>Le remboursement automatique du vendeur a échoué pendant 48 h.</p>
<ul>
  <li>Annonce : ${listing.id}</li>
  <li>Vendeur (userId) : ${listing.sellerId}</li>
  <li>Paiement Stripe à rembourser : ${listing.sellerPaymentIntentId}</li>
  <li>Montant : ${(listing.priceCents / 100).toFixed(2)} €</li>
  <li>Dernière erreur : ${String(reason || '—').replace(/</g, '&lt;')}</li>
</ul>
<p>À rembourser depuis le dashboard Stripe (métadonnée resaleId = ${listing.id}), puis passer <code>refundStatus</code> à <code>succeeded</code>.</p>`,
    });
  } catch (error) {
    console.error('[ticketResale] alerte remboursement non envoyée', error?.message || error);
  }
}

/**
 * Relance les remboursements vendeur en échec (ou bloqués « pending » après un arrêt du serveur),
 * au plus toutes les 30 min. Au-delà de 48 h : statut `manual` et alerte par email.
 */
async function retryFailedResaleRefunds({ stripe, force = false }) {
  if (!stripe) return;
  const now = Date.now();
  if (!force && now - lastRefundRetryAt < REFUND_RETRY_EVERY_MS) return;
  lastRefundRetryAt = now;
  try {
    const listings = await prisma.ticketResale.findMany({
      where: {
        status: 'SOLD',
        OR: [
          { refundStatus: 'failed' },
          { refundStatus: 'pending', soldAt: { lt: new Date(now - REFUND_STUCK_PENDING_MS) } },
        ],
      },
      include: { event: { select: { title: true, image: true } } },
      take: 50,
    });
    for (const listing of listings) {
      try {
        let refund = await findSellerRefund(stripe, listing);
        if (!refund) {
          if (listing.soldAt && now - new Date(listing.soldAt).getTime() > REFUND_GIVE_UP_AFTER_MS) {
            await prisma.ticketResale.update({ where: { id: listing.id }, data: { refundStatus: 'manual' } });
            await alertManualRefund(listing, 'aucun remboursement abouti après 48 h');
            continue;
          }
          refund = await stripe.refunds.create(
            {
              payment_intent: listing.sellerPaymentIntentId,
              amount: listing.priceCents,
              metadata: { type: 'ticket_resale', resaleId: listing.id },
            },
            { idempotencyKey: `ticket-resale-refund-${listing.id}-retry-${Math.floor(now / REFUND_RETRY_EVERY_MS)}` },
          );
        }
        if (refund.status === 'failed') throw new Error('Stripe a refusé le remboursement');
        await prisma.ticketResale.update({
          where: { id: listing.id },
          data: { sellerRefundId: refund.id, refundStatus: 'succeeded' },
        });
        const euros = (listing.priceCents / 100).toFixed(2).replace('.', ',');
        notifyUsers([listing.sellerId], {
          category: 'events',
          type: 'resale_refunded',
          title: 'Remboursement effectué',
          body: `${euros} € remboursés sur ta carte pour ton billet revendu${listing.event?.title ? ` (${listing.event.title})` : ''}. Compte 5 à 10 jours.`,
          eventId: listing.eventId,
          imageUrl: listing.event?.image,
          dedupeKey: `resale-refunded:${listing.id}`,
        });
      } catch (error) {
        console.error('[ticketResale] relance remboursement vendeur échouée', listing.id, error?.message || error);
        await prisma.ticketResale.update({ where: { id: listing.id }, data: { refundStatus: 'failed' } });
      }
    }
  } catch (error) {
    console.error('[ticketResale] relance des remboursements', error?.message || error);
  }
}

/**
 * Soirée commencée : les annonces sans acheteur sont retirées et le billet redevient valable
 * (sinon le vendeur serait refusé au scan). Une annonce réservée attend la fin de sa réservation.
 */
async function closeResalesForStartedEvents({ makeQrCode }) {
  try {
    const listings = await prisma.ticketResale.findMany({
      where: { ...availableListingWhere(), event: { status: { not: 'UPCOMING' } } },
      select: { id: true, ticketId: true, sellerId: true, eventId: true, event: { select: { title: true, image: true } } },
    });
    for (const listing of listings) {
      const closed = await prisma.$transaction(async (tx) => {
        const cancelled = await tx.ticketResale.updateMany({
          where: { id: listing.id, ...availableListingWhere() },
          data: { status: 'CANCELLED', reservedUntil: null },
        });
        if (cancelled.count === 0) return false;
        await tx.ticket.updateMany({
          where: { id: listing.ticketId, userId: listing.sellerId, status: 'on_resale' },
          data: { status: 'valid', qrCode: makeQrCode() },
        });
        return true;
      });
      if (!closed) continue;
      notifyUsers([listing.sellerId], {
        category: 'events',
        type: 'resale_closed',
        title: 'Revente clôturée',
        body: `${listing.event?.title || 'La soirée'} a commencé sans acheteur : ton billet est de nouveau valable, ton QR code est dans Billets.`,
        eventId: listing.eventId,
        imageUrl: listing.event?.image,
        dedupeKey: `resale-closed:${listing.id}`,
      });
    }
  } catch (error) {
    console.error('[ticketResale] clôture des reventes', error?.message || error);
  }
}

module.exports = {
  RESERVATION_MS,
  OPEN_STATUSES,
  availableListingWhere,
  resaleEligibility,
  fulfilResalePayment,
  closeResalesForStartedEvents,
  retryFailedResaleRefunds,
  makeTicketQrCode,
};
