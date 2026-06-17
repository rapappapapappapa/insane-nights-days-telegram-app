/**
 * Montants et recherche des bookings pour le paiement Stripe des contrats.
 */

const prisma = require('../lib/prisma');

/** Montant du contrat en centimes (priorité au payload en euros). */
function resolveContractAmountCents(row) {
  const payload = row?.contractPayload ?? {};
  const eurosRaw = payload.priceEur ?? payload.amount ?? payload.rentAmount;
  if (eurosRaw != null) {
    const euros = Number(eurosRaw);
    if (Number.isFinite(euros) && euros > 0) return Math.round(euros * 100);
  }
  if (typeof row?.paymentAmount === 'number' && row.paymentAmount >= 50) {
    return Math.floor(row.paymentAmount);
  }
  return null;
}

function makeInvoiceNumber() {
  return `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random()
    .toString(16)
    .slice(2, 8)
    .toUpperCase()}`;
}

const bookingInclude = { event: { include: { booker: true } } };

async function loadBookingByKind(kind, bookingId) {
  if (kind === 'dj') {
    return prisma.eventDj.findUnique({ where: { id: bookingId }, include: bookingInclude });
  }
  if (kind === 'venue') {
    return prisma.eventVenue.findUnique({ where: { id: bookingId }, include: bookingInclude });
  }
  if (kind === 'prestataire') {
    return prisma.eventPrestataire.findUnique({ where: { id: bookingId }, include: bookingInclude });
  }
  return null;
}

async function findBookingByStripeIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  const where = { stripePaymentIntentId: paymentIntentId };
  const [ed, ev, ep] = await Promise.all([
    prisma.eventDj.findFirst({ where, include: bookingInclude }),
    prisma.eventVenue.findFirst({ where, include: bookingInclude }),
    prisma.eventPrestataire.findFirst({ where, include: bookingInclude }),
  ]);
  if (ed) return { kind: 'dj', row: ed };
  if (ev) return { kind: 'venue', row: ev };
  if (ep) return { kind: 'prestataire', row: ep };
  return null;
}

function assertBookerOwnsBooking(row, userId) {
  return row?.event?.booker?.userId === userId;
}

module.exports = {
  resolveContractAmountCents,
  makeInvoiceNumber,
  loadBookingByKind,
  findBookingByStripeIntent,
  assertBookerOwnsBooking,
};
