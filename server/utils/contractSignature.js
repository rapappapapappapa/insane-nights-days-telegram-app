/**
 * Signature électronique des contrats via Yousign.
 *
 * Déclenchée quand les deux parties ont accepté le contrat sur Nox :
 * le contrat passe en PENDING_SIGNATURE, chaque partie reçoit un email Yousign
 * pour signer le PDF. Le webhook `signature_request.done` finalise en SIGNED.
 * Refus / expiration → retour à SENT (état post-envoi).
 *
 * Sans YOUSIGN_API_KEY, rien ne change : l'acceptation vaut signature (flux historique).
 */

const prisma = require('../lib/prisma');
const { createContractSignatureRequest } = require('./yousign');
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

/**
 * Retrouve le contrat (3 tables) lié à une demande de signature Yousign.
 * @returns {Promise<{ kind: 'dj'|'venue'|'prestataire', row } | null>}
 */
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

/**
 * Webhook `signature_request.done` : contrat → SIGNED + paiement PENDING + notif + email PDF.
 * Idempotent (ignore si le contrat n'est plus en PENDING_SIGNATURE).
 */
async function finalizeSignedContract(signatureRequestId) {
  const found = await findContractBySignatureRequestId(signatureRequestId);
  if (!found) return { ok: false, reason: 'unknown_request' };
  const { kind, row } = found;
  if (row.contractStatus !== 'PENDING_SIGNATURE') return { ok: true, reason: 'already_processed' };

  const signData = {
    contractStatus: 'SIGNED',
    ...(row.paymentStatus !== 'PAID' && !row.paidAt ? { paymentStatus: 'PENDING' } : {}),
  };
  const senderId = row.event?.booker?.userId;
  const eventTitle = row.event?.title ? ` (${row.event.title})` : '';
  const notif = `📋 Contrat signé électroniquement !${eventTitle}`;
  const { sendContractSignedEmailDj, sendContractSignedEmailVenue, sendContractSignedEmailPrestataire } =
    require('./contractEmail');

  if (kind === 'dj') {
    await prisma.eventDj.update({ where: { id: row.id }, data: signData });
    if (senderId) await createContractNotificationMessage(row.id, senderId, notif);
    sendContractSignedEmailDj(row.id).catch((err) => console.error('[contractSignature] Email DJ:', err));
  } else if (kind === 'venue') {
    await prisma.eventVenue.update({ where: { id: row.id }, data: signData });
    if (senderId) await createContractNotificationMessageVenue(row.id, senderId, notif);
    sendContractSignedEmailVenue(row.id).catch((err) => console.error('[contractSignature] Email Lieu:', err));
  } else {
    await prisma.eventPrestataire.update({ where: { id: row.id }, data: signData });
    if (senderId) await createContractNotificationMessagePrestataire(row.id, senderId, notif);
    sendContractSignedEmailPrestataire(row.id).catch((err) =>
      console.error('[contractSignature] Email Prestataire:', err)
    );
  }
  return { ok: true, kind, id: row.id };
}

/**
 * Webhook refus / expiration : retour à l'état post-envoi (SENT, seule la partie
 * émettrice garde son acceptation) pour permettre une nouvelle négociation.
 */
async function revertContractSignature(signatureRequestId, reason = 'declined') {
  const found = await findContractBySignatureRequestId(signatureRequestId);
  if (!found) return { ok: false, reason: 'unknown_request' };
  const { kind, row } = found;
  if (row.contractStatus !== 'PENDING_SIGNATURE') return { ok: true, reason: 'already_processed' };

  const sentBy = row.contractSentBy ?? 'BOOKER';
  const base = { contractStatus: 'SENT', yousignSignatureRequestId: null };
  const senderId = row.event?.booker?.userId;
  const eventTitle = row.event?.title ? ` (${row.event.title})` : '';
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
    if (senderId) await createContractNotificationMessage(row.id, senderId, notif);
  } else if (kind === 'venue') {
    await prisma.eventVenue.update({
      where: { id: row.id },
      data: {
        ...base,
        bookerAcceptedAt: sentBy === 'BOOKER' ? row.bookerAcceptedAt : null,
        venueAcceptedAt: sentBy === 'VENUE' ? row.venueAcceptedAt : null,
      },
    });
    if (senderId) await createContractNotificationMessageVenue(row.id, senderId, notif);
  } else {
    await prisma.eventPrestataire.update({
      where: { id: row.id },
      data: {
        ...base,
        bookerAcceptedAt: sentBy === 'BOOKER' ? row.bookerAcceptedAt : null,
        prestataireAcceptedAt: sentBy === 'PRESTATAIRE' ? row.prestataireAcceptedAt : null,
      },
    });
    if (senderId) await createContractNotificationMessagePrestataire(row.id, senderId, notif);
  }
  return { ok: true, kind, id: row.id };
}

module.exports = {
  startDjContractSignature,
  startVenueContractSignature,
  startPrestataireContractSignature,
  finalizeSignedContract,
  revertContractSignature,
};
