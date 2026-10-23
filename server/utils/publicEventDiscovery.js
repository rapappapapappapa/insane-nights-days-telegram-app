/**
 * Événements visibles côté communauté (accueil, discover, feed).
 * Un événement n’apparaît qu’après validation des contrats et publication explicite par l’organisateur.
 */

/** Filtre Prisma : événements publiés sur le feed NOX. */
function publishedOnFeedEventWhere(extra = {}) {
  return {
    publishedOnFeed: true,
    ...extra,
  };
}

/** Annonces événement dans le feed (à venir, déjà publiés). */
function upcomingPublishedFeedEventWhere({ now = new Date() } = {}) {
  return publishedOnFeedEventWhere({
    status: 'UPCOMING',
    date: { gte: now },
  });
}

/**
 * Un événement non publié reste consultable par ses parties prenantes :
 * organisateur, DJ invités, lieu, prestataires, staff et détenteurs de billet.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string, publishedOnFeed: boolean, bookerId?: string|null, venueId?: string|null }} event
 * @param {{ id: string, role?: string }|null|undefined} user
 * @returns {Promise<boolean>}
 */
async function canViewEvent(prisma, event, user) {
  if (!event) return false;
  if (event.publishedOnFeed) return true;
  if (!user?.id) return false;
  if (user.role === 'ADMIN') return true;

  const { id: eventId, bookerId, venueId } = event;
  const userId = user.id;

  const [dj, ticket, staff, booker, eventVenue, prestataire, venue] = await Promise.all([
    prisma.eventDj.findFirst({ where: { eventId, djId: userId }, select: { id: true } }),
    prisma.ticket.findFirst({ where: { eventId, userId }, select: { id: true } }),
    prisma.eventStaff.findFirst({ where: { eventId, community: { userId } }, select: { id: true } }),
    bookerId
      ? prisma.userBooker.findFirst({ where: { id: bookerId, userId }, select: { id: true } })
      : Promise.resolve(null),
    prisma.eventVenue.findFirst({ where: { eventId, venue: { userId } }, select: { id: true } }),
    prisma.eventPrestataire.findFirst({
      where: { eventId, prestataire: { userId } },
      select: { id: true },
    }),
    venueId
      ? prisma.userVenue.findFirst({ where: { id: venueId, userId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  return Boolean(dj || ticket || staff || booker || eventVenue || prestataire || venue);
}

module.exports = {
  publishedOnFeedEventWhere,
  upcomingPublishedFeedEventWhere,
  canViewEvent,
};
