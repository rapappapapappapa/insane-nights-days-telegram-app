/**
 * Génération PDF « prévisualisation » (même rendu que l’email, sans dates de signature).
 */

const {
  generateDjContractPdf,
  generateVenueContractPdf,
  resolveVenueProfileForVenueContract,
} = require('./contractPdf');

async function buildDjContractPreviewPdf(prisma, ed, payloadForPdf) {
  const djProfile = await prisma.userDj.findFirst({ where: { userId: ed.djId } });
  const [bookerUser, djUser] = await Promise.all([
    ed.event?.booker?.userId
      ? prisma.user.findUnique({ where: { id: ed.event.booker.userId }, select: { email: true } })
      : null,
    prisma.user.findUnique({ where: { id: ed.djId }, select: { email: true } }),
  ]);
  const eventDjPreview = {
    ...ed,
    contractPayload: payloadForPdf ?? {},
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
  const venueResolved = resolveVenueProfileForVenueContract(ev.event, ev.venue, ev);
  const [bookerUser, venueUser] = await Promise.all([
    ev.event?.booker?.userId
      ? prisma.user.findUnique({ where: { id: ev.event.booker.userId }, select: { email: true } })
      : null,
    venueResolved?.userId
      ? prisma.user.findUnique({ where: { id: venueResolved.userId }, select: { email: true } })
      : ev.venue?.userId
        ? prisma.user.findUnique({ where: { id: ev.venue.userId }, select: { email: true } })
        : null,
  ]);
  const eventVenuePreview = {
    ...ev,
    contractPayload: payloadForPdf ?? {},
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
