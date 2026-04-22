/**
 * Génération PDF « prévisualisation » (même rendu que l’email, sans dates de signature).
 */

const {
  generateDjContractPdf,
  generateVenueContractPdf,
  resolveVenueProfileForVenueContract,
} = require('./contractPdf');

/** Payload JSON sain pour PDF (pas de tableau racine / types exotiques / références circulaires). */
function normalizeContractPayload(raw) {
  if (raw == null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) return {};
  try {
    return JSON.parse(JSON.stringify(raw));
  } catch (e) {
    return {};
  }
}

/**
 * ed.djId est normalement le User.id du DJ ; en secours, anciennes données avec UserDj.id.
 */
async function resolveDjProfileForPreview(prisma, ed) {
  let djProfile = await prisma.userDj.findFirst({ where: { userId: ed.djId } });
  if (!djProfile) {
    djProfile = await prisma.userDj.findUnique({ where: { id: ed.djId } });
  }
  return djProfile;
}

async function buildDjContractPreviewPdf(prisma, ed, payloadForPdf) {
  const payload = normalizeContractPayload(payloadForPdf);
  const djProfile = await resolveDjProfileForPreview(prisma, ed);
  const djUserId = djProfile?.userId ?? ed.djId;
  const [bookerUser, djUser] = await Promise.all([
    ed.event?.booker?.userId
      ? prisma.user.findUnique({ where: { id: ed.event.booker.userId }, select: { email: true } })
      : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: djUserId }, select: { email: true } }),
  ]);
  const eventDjPreview = {
    id: ed.id,
    eventId: ed.eventId,
    djId: ed.djId,
    status: ed.status,
    paymentAmount: ed.paymentAmount,
    paymentCurrency: ed.paymentCurrency,
    contractPayload: payload,
    bookerAcceptedAt: null,
    djAcceptedAt: null,
  };
  return generateDjContractPdf({
    event: ed.event,
    booker: ed.event?.booker,
    dj: djProfile,
    eventDj: eventDjPreview,
    venue: ed.event?.venue,
    organizerEmail: bookerUser?.email || null,
    djEmail: djUser?.email || null,
  });
}

async function buildVenueContractPreviewPdf(prisma, ev, payloadForPdf) {
  const payload = normalizeContractPayload(payloadForPdf);
  const venueResolved = resolveVenueProfileForVenueContract(ev.event, ev.venue, ev);
  const [bookerUser, venueUser] = await Promise.all([
    ev.event?.booker?.userId
      ? prisma.user.findUnique({ where: { id: ev.event.booker.userId }, select: { email: true } })
      : Promise.resolve(null),
    venueResolved?.userId
      ? prisma.user.findUnique({ where: { id: venueResolved.userId }, select: { email: true } })
      : ev.venue?.userId
        ? prisma.user.findUnique({ where: { id: ev.venue.userId }, select: { email: true } })
        : Promise.resolve(null),
  ]);
  const eventVenuePreview = {
    id: ev.id,
    eventId: ev.eventId,
    venueId: ev.venueId,
    status: ev.status,
    paymentAmount: ev.paymentAmount,
    paymentCurrency: ev.paymentCurrency,
    contractPayload: payload,
    bookerAcceptedAt: null,
    venueAcceptedAt: null,
  };
  return generateVenueContractPdf({
    event: ev.event,
    booker: ev.event?.booker,
    venue: ev.venue,
    eventVenue: eventVenuePreview,
    organizerEmail: bookerUser?.email || null,
    venueEmail: venueUser?.email || null,
  });
}

module.exports = {
  buildDjContractPreviewPdf,
  buildVenueContractPreviewPdf,
};
