/**
 * Signature électronique des contrats via Yousign.
 *
 * Flux : les deux parties acceptent → PENDING_PAYMENT (booker paie via Stripe)
 * → paiement reçu → PENDING_SIGNATURE (emails Yousign) → webhook done → SIGNED.
 * Refus / expiration signature → PENDING_PAYMENT si déjà payé, sinon SENT.
 *
 * Sans YOUSIGN_API_KEY : après paiement, passage direct en SIGNED (flux historique).
 */

const prisma = require('../lib/prisma');
const { createContractSignatureRequest, isYousignConfigured } = require('./yousign');
const { resolveContractAmountCents, makeInvoiceNumber, loadBookingByKind } = require('./contractPayment');
const {
  generateDjContractPdf,
  generateVenueContractPdf,
  generatePrestataireContractPdf,
  resolveVenueProfileForVenueContract,
} = require('./contractPdf');
const {
  createContractNotificationMessage,
  createContractNotificationMessageVenue,
  createContractNotificationMessagePrestataire,
} = require('./contractHelpers');

const userEmail = async (userId) =>
  userId ? prisma.user.findUnique({ where: { id: userId }, select: { email: true } }) : null;

const organizerSignerName = (booker) =>
  [booker?.prenom, booker?.nom].filter(Boolean).join(' ') || booker?.companyName || 'Organisateur';

const safeFilename = (s) => String(s || 'contrat').replace(/[^a-zA-Z0-9_.-]/g, '_');

/**
 * Démarre la signature Yousign d'un contrat DJ. Retourne l'id de la demande.
 */
async function startDjContractSignature(eventDjId) {
  const ed = await prisma.eventDj.findUnique({
    where: { id: eventDjId },
    include: { event: { include: { booker: true, venue: true } } },
  });
  if (!ed) throw new Error('EventDj introuvable.');

  const [bookerUser, djUser, djProfile] = await Promise.all([
    userEmail(ed.event?.booker?.userId),
    userEmail(ed.djId),
    prisma.userDj.findFirst({ where: { userId: ed.djId } }),
  ]);
  if (!bookerUser?.email || !djUser?.email) {
    throw new Error('Email signataire manquant (organisateur ou DJ).');
  }

  const pdfBuffer = await generateDjContractPdf({
    event: ed.event,
    booker: ed.event?.booker,
    dj: djProfile,
    eventDj: ed,
    venue: ed.event?.venue,
    organizerEmail: bookerUser.email,
    djEmail: djUser.email,
    signatureAnchors: true,
  });

  const artistName = djProfile?.legalName || djProfile?.artistName || 'DJ';
  return createContractSignatureRequest({
    name: `Contrat DJ — ${ed.event?.title || 'Événement'} — ${artistName}`,
    externalId: `eventdj_${ed.id}`,
    pdfBuffer,
    filename: `Contrat_DJ_${safeFilename(ed.event?.title)}.pdf`,
    signers: [
      { name: organizerSignerName(ed.event?.booker), email: bookerUser.email },
      { name: artistName, email: djUser.email },
    ],
  });
}

/**
 * Démarre la signature Yousign d'un contrat Lieu.
 */
async function startVenueContractSignature(eventVenueId) {
  const ev = await prisma.eventVenue.findUnique({
    where: { id: eventVenueId },
    include: { event: { include: { booker: true, venue: true } }, venue: true },
  });
  if (!ev) throw new Error('EventVenue introuvable.');

  const venueResolved = resolveVenueProfileForVenueContract(ev.event, ev.venue, ev);
  const [bookerUser, venueUser] = await Promise.all([
    userEmail(ev.event?.booker?.userId),
    userEmail(venueResolved?.userId || ev.venue?.userId),
  ]);
  if (!bookerUser?.email || !venueUser?.email) {
    throw new Error('Email signataire manquant (organisateur ou lieu).');
  }

  const pdfBuffer = await generateVenueContractPdf({
    event: ev.event,
    booker: ev.event?.booker,
    venue: ev.venue,
    eventVenue: ev,
    organizerEmail: bookerUser.email,
    venueEmail: venueUser.email,
    signatureAnchors: true,
  });

  const venueName = venueResolved?.venueName || ev.venue?.venueName || 'Lieu';
  return createContractSignatureRequest({
    name: `Contrat Lieu — ${ev.event?.title || 'Événement'} — ${venueName}`,
    externalId: `eventvenue_${ev.id}`,
    pdfBuffer,
    filename: `Contrat_Lieu_${safeFilename(ev.event?.title)}.pdf`,
    signers: [
      { name: organizerSignerName(ev.event?.booker), email: bookerUser.email },
      { name: venueResolved?.legalRepresentative || venueName, email: venueUser.email },
    ],
  });
}

/**
 * Démarre la signature Yousign d'un contrat Prestataire.
 */
async function startPrestataireContractSignature(eventPrestataireId) {
  const ep = await prisma.eventPrestataire.findUnique({
    where: { id: eventPrestataireId },
    include: { event: { include: { booker: true, venue: true } }, prestataire: true },
  });
  if (!ep) throw new Error('EventPrestataire introuvable.');

  const [bookerUser, prestUser] = await Promise.all([
    userEmail(ep.event?.booker?.userId),
    userEmail(ep.prestataire?.userId),
  ]);
  if (!bookerUser?.email || !prestUser?.email) {
    throw new Error('Email signataire manquant (organisateur ou prestataire).');
  }

  const pdfBuffer = await generatePrestataireContractPdf({
    event: ep.event,
    booker: ep.event?.booker,
    prestataire: ep.prestataire,
    eventPrestataire: ep,
    organizerEmail: bookerUser.email,
    prestataireEmail: prestUser.email,
    signatureAnchors: true,
  });

  const businessName = ep.prestataire?.businessName || 'Prestataire';
  return createContractSignatureRequest({
    name: `Contrat Prestataire — ${ep.event?.title || 'Événement'} — ${businessName}`,
    externalId: `eventprestataire_${ep.id}`,
    pdfBuffer,
    filename: `Contrat_Prestataire_${safeFilename(ep.event?.title)}.pdf`,
    signers: [
      { name: organizerSignerName(ep.event?.booker), email: bookerUser.email },
      { name: businessName, email: prestUser.email },
    ],
  });
}

async function findContractBySignatureRequestId(signatureRequestId) {
  if (!signatureRequestId) return null;
  const where = { yousignSignatureRequestId: signatureRequestId };
  const [ed, ev, ep] = await Promise.all([
    prisma.eventDj.findFirst({ where, include: { event: { include: { booker: true } } } }),
    prisma.eventVenue.findFirst({ where, include: { event: { include: { booker: true } } } }),
    prisma.eventPrestataire.findFirst({ where, include: { event: { include: { booker: true } } } }),
  ]);
  if (ed) return { kind: 'dj', row: ed };
  if (ev) return { kind: 'venue', row: ev };
  if (ep) return { kind: 'prestataire', row: ep };
  return null;
}

async function updateBookingByKind(kind, bookingId, data) {
  if (kind === 'dj') return prisma.eventDj.update({ where: { id: bookingId }, data });
  if (kind === 'venue') return prisma.eventVenue.update({ where: { id: bookingId }, data });
  return prisma.eventPrestataire.update({ where: { id: bookingId }, data });
}

async function notifyContract(kind, bookingId, senderId, content) {
  if (kind === 'dj') return createContractNotificationMessage(bookingId, senderId, content);
  if (kind === 'venue') return createContractNotificationMessageVenue(bookingId, senderId, content);
  return createContractNotificationMessagePrestataire(bookingId, senderId, content);
}

async function sendSignedEmail(kind, bookingId) {
  const { sendContractSignedEmailDj, sendContractSignedEmailVenue, sendContractSignedEmailPrestataire } =
    require('./contractEmail');
  if (kind === 'dj') {
    sendContractSignedEmailDj(bookingId).catch((err) => console.error('[contractSignature] Email DJ:', err));
  } else if (kind === 'venue') {
    sendContractSignedEmailVenue(bookingId).catch((err) => console.error('[contractSignature] Email Lieu:', err));
  } else {
    sendContractSignedEmailPrestataire(bookingId).catch((err) =>
      console.error('[contractSignature] Email Prestataire:', err)
    );
  }
}

/**
 * Les deux parties ont accepté : en attente du paiement Stripe du booker.
 */
async function afterBothPartiesAccepted(kind, bookingId) {
  const row = await loadBookingByKind(kind, bookingId);
  if (!row) throw new Error('Booking introuvable.');
  const amountCents = resolveContractAmountCents(row);
  if (amountCents == null || amountCents < 50) {
    throw new Error('Montant du contrat invalide ou manquant (minimum 0,50 €).');
  }
  const next = await updateBookingByKind(kind, bookingId, {
    contractStatus: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    paymentAmount: amountCents,
    paymentCurrency: 'eur',
  });
  return { row: next, pendingPayment: true, status: 'PENDING_PAYMENT' };
}

/**
 * Paiement reçu (Stripe ou manuel) → envoi Yousign ou signature directe.
 * Idempotent si déjà en PENDING_SIGNATURE ou SIGNED.
 */
async function fulfillContractPaymentAndStartSignature(kind, bookingId, { paymentIntentId } = {}) {
  const row = await loadBookingByKind(kind, bookingId);
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.contractStatus === 'PENDING_SIGNATURE' || row.contractStatus === 'SIGNED') {
    return { ok: true, reason: 'already_processed', status: row.contractStatus };
  }
  if (row.contractStatus !== 'PENDING_PAYMENT') {
    return { ok: false, reason: 'invalid_state', status: row.contractStatus };
  }

  const paidData = {
    paymentStatus: 'PAID',
    paidAt: row.paidAt || new Date(),
    invoiceNumber: row.invoiceNumber || makeInvoiceNumber(),
    ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
  };

  const eventTitle = row.event?.title ? ` (${row.event.title})` : '';
  const senderId = row.event?.booker?.userId;

  if (isYousignConfigured()) {
    try {
      let requestId;
      if (kind === 'dj') requestId = await startDjContractSignature(bookingId);
      else if (kind === 'venue') requestId = await startVenueContractSignature(bookingId);
      else requestId = await startPrestataireContractSignature(bookingId);

      await updateBookingByKind(kind, bookingId, {
        ...paidData,
        contractStatus: 'PENDING_SIGNATURE',
        yousignSignatureRequestId: requestId,
      });
      if (senderId) {
        await notifyContract(
          kind,
          bookingId,
          senderId,
          `✍️ Paiement reçu — signature électronique envoyée par email${eventTitle}`
        );
      }
      return { ok: true, status: 'PENDING_SIGNATURE', pendingSignature: true };
    } catch (e) {
      console.error('[contractSignature] Yousign indisponible après paiement:', e?.message || e);
    }
  }

  await updateBookingByKind(kind, bookingId, { ...paidData, contractStatus: 'SIGNED' });
  if (senderId) {
    await notifyContract(kind, bookingId, senderId, `📋 Contrat signé !${eventTitle}`);
  }
  sendSignedEmail(kind, bookingId);
  return { ok: true, status: 'SIGNED', pendingSignature: false };
}

/**
 * Relance l'envoi Yousign après paiement (signature refusée / expirée).
 */
async function retryContractSignatureAfterPayment(kind, bookingId, userId) {
  const row = await loadBookingByKind(kind, bookingId);
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.event?.booker?.userId !== userId) return { ok: false, reason: 'forbidden' };
  if (row.contractStatus !== 'PENDING_PAYMENT' || row.paymentStatus !== 'PAID') {
    return { ok: false, reason: 'invalid_state' };
  }
  if (!isYousignConfigured()) {
    return fulfillContractPaymentAndStartSignature(kind, bookingId);
  }
  return fulfillContractPaymentAndStartSignature(kind, bookingId, {
    paymentIntentId: row.stripePaymentIntentId || undefined,
  });
}

/**
 * Webhook `signature_request.done` : contrat → SIGNED (paiement déjà effectué) + notif + email PDF.
 * Idempotent (ignore si le contrat n'est plus en PENDING_SIGNATURE).
 */
async function finalizeSignedContract(signatureRequestId) {
  const found = await findContractBySignatureRequestId(signatureRequestId);
  if (!found) return { ok: false, reason: 'unknown_request' };
  const { kind, row } = found;
  if (row.contractStatus !== 'PENDING_SIGNATURE') return { ok: true, reason: 'already_processed' };

  const signData = { contractStatus: 'SIGNED' };
  const senderId = row.event?.booker?.userId;
  const eventTitle = row.event?.title ? ` (${row.event.title})` : '';
  const notif = `📋 Contrat signé électroniquement !${eventTitle}`;

  await updateBookingByKind(kind, row.id, signData);
  if (senderId) await notifyContract(kind, row.id, senderId, notif);
  sendSignedEmail(kind, row.id);
  return { ok: true, kind, id: row.id };
}

/**
 * Webhook refus / expiration : si déjà payé → PENDING_PAYMENT (relance signature possible),
 * sinon retour à SENT pour renégociation.
 */
async function revertContractSignature(signatureRequestId, reason = 'declined') {
  const found = await findContractBySignatureRequestId(signatureRequestId);
  if (!found) return { ok: false, reason: 'unknown_request' };
  const { kind, row } = found;
  if (row.contractStatus !== 'PENDING_SIGNATURE') return { ok: true, reason: 'already_processed' };

  const senderId = row.event?.booker?.userId;
  const eventTitle = row.event?.title ? ` (${row.event.title})` : '';
  const alreadyPaid = row.paymentStatus === 'PAID' || !!row.paidAt;

  if (alreadyPaid) {
    await updateBookingByKind(kind, row.id, {
      contractStatus: 'PENDING_PAYMENT',
      yousignSignatureRequestId: null,
    });
    const notif =
      reason === 'expired'
        ? `📋 Signature expirée — paiement reçu, relance la signature depuis l'app${eventTitle}`
        : `📋 Signature refusée — paiement reçu, relance la signature depuis l'app${eventTitle}`;
    if (senderId) await notifyContract(kind, row.id, senderId, notif);
    return { ok: true, kind, id: row.id, paid: true };
  }

  const sentBy = row.contractSentBy ?? 'BOOKER';
  const base = { contractStatus: 'SENT', yousignSignatureRequestId: null, paymentStatus: 'UPCOMING' };
  const notif =
    reason === 'expired'
      ? `📋 Signature électronique expirée — le contrat est de nouveau ouvert${eventTitle}`
      : `📋 Signature électronique refusée — le contrat est de nouveau ouvert${eventTitle}`;

  if (kind === 'dj') {
    await prisma.eventDj.update({
      where: { id: row.id },
      data: {
        ...base,
        bookerAcceptedAt: sentBy === 'BOOKER' ? row.bookerAcceptedAt : null,
        djAcceptedAt: sentBy === 'DJ' ? row.djAcceptedAt : null,
      },
    });
  } else if (kind === 'venue') {
    await prisma.eventVenue.update({
      where: { id: row.id },
      data: {
        ...base,
        bookerAcceptedAt: sentBy === 'BOOKER' ? row.bookerAcceptedAt : null,
        venueAcceptedAt: sentBy === 'VENUE' ? row.venueAcceptedAt : null,
      },
    });
  } else {
    await prisma.eventPrestataire.update({
      where: { id: row.id },
      data: {
        ...base,
        bookerAcceptedAt: sentBy === 'BOOKER' ? row.bookerAcceptedAt : null,
        prestataireAcceptedAt: sentBy === 'PRESTATAIRE' ? row.prestataireAcceptedAt : null,
      },
    });
  }
  if (senderId) await notifyContract(kind, row.id, senderId, notif);
  return { ok: true, kind, id: row.id, paid: false };
}

module.exports = {
  startDjContractSignature,
  startVenueContractSignature,
  startPrestataireContractSignature,
  afterBothPartiesAccepted,
  fulfillContractPaymentAndStartSignature,
  retryContractSignatureAfterPayment,
  finalizeSignedContract,
  revertContractSignature,
};
