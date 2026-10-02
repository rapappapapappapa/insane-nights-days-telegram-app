/**
 * Liste / détail événements publics + groupes (délégation userController).
 */
const prisma = require('../lib/prisma');
const { parseTicketTiersFromDb, enrichTiersWithSold, minTierPriceEUR } = require('../utils/ticketTiers');
const { publishedOnFeedEventWhere, canViewEvent } = require('../utils/publicEventDiscovery');
const { attachUserIfAuthenticated } = require('../middleware/auth');

module.exports = function registerEventPublicRoutes(app, deps) {
  const { authenticateToken, userController } = deps;

// Fonction pour mettre à jour automatiquement les statuts des événements
const updateEventStatuses = async function updateEventStatuses() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Mettre à jour les événements terminés
    await prisma.event.updateMany({
      where: {
        date: { lt: oneHourAgo },
        status: { not: 'FINISHED' },
      },
      data: { status: 'FINISHED' },
    });

    // Mettre à jour les événements en cours
    await prisma.event.updateMany({
      where: {
        date: { gte: oneHourAgo, lte: oneHourLater },
        status: { not: 'ONGOING' },
      },
      data: { status: 'ONGOING' },
    });

    // Mettre à jour les événements à venir
    await prisma.event.updateMany({
      where: {
        date: { gt: oneHourLater },
        status: { not: 'UPCOMING' },
      },
      data: { status: 'UPCOMING' },
    });
  } catch (error) {
    console.error('Erreur mise à jour statuts événements:', error);
  }
}

app.get('/api/events', async (req, res) => {
  try {
    const dbEvents = await prisma.event.findMany({
      where: publishedOnFeedEventWhere(),
      include: {
        venue: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        eventDjs: {
          include: {
            // djId pointe vers User.id, donc on inclut le User
            // et on récupérera le UserDj séparément
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Récupérer tous les UserDj pour les DJs des événements
    const allDjIds = [...new Set(dbEvents.flatMap(e => e.eventDjs.map(ed => ed.djId)))];
    const userDjs = await prisma.userDj.findMany({
      where: { userId: { in: allDjIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    const djMap = new Map(userDjs.map(udj => [udj.userId, udj]));

    // Formater les événements pour correspondre au format attendu par le frontend
    const formattedEvents = dbEvents.map((event) => {
      const rawTiers = parseTicketTiersFromDb(event.ticketTiers);
      const hasMultipleTicketPrices = Array.isArray(rawTiers) && rawTiers.length > 1;
      // Prix « dès X € » : priorité aux tarifs en vente (phases), repli sur tous les paliers
      const minPrice = hasMultipleTicketPrices
        ? minTierPriceEUR(rawTiers, { onlyOnSale: true }) ?? minTierPriceEUR(rawTiers)
        : null;
      const displayPrice = minPrice != null ? minPrice : event.price;

      return {
        id: event.id,
        title: event.title,
        date: event.date.toISOString().split('T')[0],
        time: event.time,
        location: event.location,
        price: displayPrice,
        hasMultipleTicketPrices,
        capacity: event.capacity,
        sold: event.sold,
        genre: event.genre,
        image: event.image,
        description: event.description,
        status: event.status || 'UPCOMING',
        djs: event.eventDjs.map((ed) => {
          const userDj = djMap.get(ed.djId);
          return userDj?.artistName || userDj?.user?.username || `DJ ${ed.djId.slice(0, 8)}`;
        }),
        djIds: event.eventDjs.map((ed) => ed.djId),
        venueId: event.venueId,
        venueName: event.venue?.venueName,
      };
    });

    res.json({ success: true, events: formattedEvents });
  } catch (error) {
    console.error('Erreur récupération événements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Groupes d'événements (amis qui vont ensemble) - AVANT /api/events/:eventId
app.post('/api/events/:eventId/groups', authenticateToken, userController.createEventGroup);
app.get('/api/events/:eventId/groups', authenticateToken, userController.getEventGroups);
app.post('/api/events/:eventId/groups/:groupId/invite', authenticateToken, userController.inviteToEventGroup);
app.put('/api/event-groups/:groupId/respond', authenticateToken, userController.respondToEventGroupInvitation);

app.get('/api/events/:eventId', attachUserIfAuthenticated, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        venue: true,
        booker: { select: { id: true, userId: true, pseudo: true, nom: true, prenom: true } },
        eventDjs: true,
        eventVenues: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Tant que l'orga n'a pas publié, l'événement n'est visible que par ses parties prenantes.
    if (!(await canViewEvent(prisma, event, req.user))) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    const activeEventDjs = (event.eventDjs || []).filter((ed) => ed.status === 'ACCEPTED' || ed.status === 'PENDING');
    const activeEventVenues = (event.eventVenues || []).filter((ev) => ev.status === 'ACCEPTED' || ev.status === 'PENDING');
    const activeVenue = activeEventVenues[0] ? (await prisma.eventVenue.findUnique({
      where: { id: activeEventVenues[0].id },
      include: { venue: { select: { id: true, venueName: true, address: true } } },
    })) : null;

    const djIds = activeEventDjs.map((ed) => ed.djId);
    const userDjs = djIds.length > 0 ? await prisma.userDj.findMany({
      where: { userId: { in: djIds } },
      select: { userId: true, id: true, artistName: true },
    }) : [];
    const djMap = new Map(userDjs.map((udj) => [udj.userId, udj]));

    const rawTiers = parseTicketTiersFromDb(event.ticketTiers);
    let ticketTiers = null;
    let hasMultipleTicketPrices = false;
    if (rawTiers && rawTiers.length > 0) {
      ticketTiers = await enrichTiersWithSold(event.id, prisma, rawTiers);
      hasMultipleTicketPrices = rawTiers.length > 1;
    }

    const formattedEvent = {
      id: event.id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      durationHours: event.durationHours ?? null,
      location: event.location,
      price: event.price,
      ticketTiers,
      hasMultipleTicketPrices,
      capacity: event.capacity,
      sold: event.sold,
      genre: event.genre,
      image: event.image,
      description: event.description,
      status: event.status || 'UPCOMING',
      djs: activeEventDjs.map((ed) => {
        const userDj = djMap.get(ed.djId);
        const artistName = userDj?.artistName || `DJ ${ed.djId.slice(0, 8)}`;
        return { userId: ed.djId, djId: userDj?.id, artistName };
      }),
      djIds: activeEventDjs.map((ed) => ed.djId),
      booker: event.booker ? {
        id: event.booker.id,
        name: event.booker.pseudo?.trim() || `${event.booker.prenom || ''} ${event.booker.nom || ''}`.trim() || 'Organisateur',
      } : null,
      venue: activeVenue?.venue ? {
        id: activeVenue.venue.id,
        venueName: activeVenue.venue.venueName,
      } : (event.venue ? { id: event.venue.id, venueName: event.venue.venueName } : null),
      venueId: activeVenue?.venueId ?? event.venueId,
      venueName: activeVenue?.venue?.venueName ?? event.venue?.venueName,
    };

    res.json({ success: true, event: formattedEvent });
  } catch (error) {
    console.error('Erreur récupération événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
  return { updateEventStatuses };
};
