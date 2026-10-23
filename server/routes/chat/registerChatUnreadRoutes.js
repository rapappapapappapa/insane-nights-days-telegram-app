/**
 * Chat — registerChatUnreadRoutes.
 */
const prisma = require('../../lib/prisma');
const chatPush = require('../../utils/chatPush');
const MAX_CHAT_MESSAGE_LENGTH = 5000;


module.exports = function registerChatUnreadRoutes(app, deps) {
  const { authenticateToken } = deps;

app.get('/api/chat/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Nouveau comportement: renvoyer un breakdown par "côté" (DJ vs BOOKER)
    // Peu importe le profil actif -> permet d'afficher "d'où vient la notif" et de naviguer correctement.

    // --- DJ side ---
    const djEventIds = await prisma.eventDj.findMany({
      where: { djId: userId },
      select: { eventId: true },
    });
    const djEventIdList = [...new Set(djEventIds.map((e) => e.eventId))];

    const djPrivateUnread = await prisma.message.count({
      where: {
        type: 'PRIVATE',
        read: false,
        deleted: false,
        senderId: { not: userId },
        eventDj: { djId: userId },
      },
    });

    const djGroupUnread = djEventIdList.length
      ? await prisma.message.count({
          where: {
            type: 'GROUP',
            read: false,
            deleted: false,
            senderId: { not: userId },
            eventId: { in: djEventIdList },
          },
        })
      : 0;

    const djTotalUnread = djPrivateUnread + djGroupUnread;

    // Dernier message non lu côté DJ (private ou group)
    const djLatestUnread = await prisma.message.findFirst({
      where: {
        read: false,
        deleted: false,
        senderId: { not: userId },
        OR: [
          {
            type: 'PRIVATE',
            eventDj: { djId: userId },
          },
          ...(djEventIdList.length
            ? [
                {
                  type: 'GROUP',
                  eventId: { in: djEventIdList },
                },
              ]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        eventDj: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
        event: { select: { id: true, title: true } },
      },
    });

    // --- BOOKER side ---
    const booker = await prisma.userBooker.findFirst({
      where: { userId: userId },
      select: { id: true },
    });

    let bookerTotalUnread = 0;
    let bookerLatestUnread = null;

    if (booker) {
      const bookerPrivateUnreadDj = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventDj: {
            event: { bookerId: booker.id },
          },
        },
      });
      const bookerPrivateUnreadVenue = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventVenue: {
            event: { bookerId: booker.id },
          },
        },
      });
      const bookerPrivateUnreadPrestataire = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventPrestataire: {
            event: { bookerId: booker.id },
          },
        },
      });
      const bookerPrivateUnread = bookerPrivateUnreadDj + bookerPrivateUnreadVenue + bookerPrivateUnreadPrestataire;

      const bookerEventIds = await prisma.event.findMany({
        where: { bookerId: booker.id },
        select: { id: true },
      });
      const bookerEventIdList = bookerEventIds.map((e) => e.id);

      const bookerGroupUnread = bookerEventIdList.length
        ? await prisma.message.count({
            where: {
              type: 'GROUP',
              read: false,
              deleted: false,
              senderId: { not: userId },
              eventId: { in: bookerEventIdList },
            },
          })
        : 0;

      bookerTotalUnread = bookerPrivateUnread + bookerGroupUnread;

      bookerLatestUnread = await prisma.message.findFirst({
        where: {
          read: false,
          deleted: false,
          senderId: { not: userId },
          OR: [
            {
              type: 'PRIVATE',
              eventDj: {
                event: { bookerId: booker.id },
              },
            },
            {
              type: 'PRIVATE',
              eventVenue: {
                event: { bookerId: booker.id },
              },
            },
            {
              type: 'PRIVATE',
              eventPrestataire: {
                event: { bookerId: booker.id },
              },
            },
            ...(bookerEventIdList.length
              ? [
                  {
                    type: 'GROUP',
                    eventId: { in: bookerEventIdList },
                  },
                ]
              : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          eventDj: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          eventVenue: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          eventPrestataire: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          event: { select: { id: true, title: true } },
        },
      });
    }

    // --- VENUE side ---
    const venue = await prisma.userVenue.findFirst({
      where: { userId: userId },
      select: { id: true },
    });
    let venueTotalUnread = 0;
    let venueLatestUnread = null;
    if (venue) {
      venueTotalUnread = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventVenue: { venueId: venue.id },
        },
      });
      venueLatestUnread = await prisma.message.findFirst({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventVenue: { venueId: venue.id },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          eventVenue: {
            include: { event: { select: { id: true, title: true } } },
          },
        },
      });
    }

    // --- PRESTATAIRE side ---
    const prestataireProfile = await prisma.userPrestataire.findFirst({
      where: { userId: userId },
      select: { id: true },
    });
    let prestataireTotalUnread = 0;
    let prestataireLatestUnread = null;
    if (prestataireProfile) {
      prestataireTotalUnread = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventPrestataire: { prestataireId: prestataireProfile.id },
        },
      });
      prestataireLatestUnread = await prisma.message.findFirst({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventPrestataire: { prestataireId: prestataireProfile.id },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          eventPrestataire: {
            include: { event: { select: { id: true, title: true } } },
          },
        },
      });
    }

    const totalUnread = djTotalUnread + bookerTotalUnread + venueTotalUnread + prestataireTotalUnread;

    const pickLatest = (a, b, c, d) => {
      const items = [
        a && { profileType: 'DJ', msg: a },
        b && { profileType: 'BOOKER', msg: b },
        c && { profileType: 'VENUE', msg: c },
        d && { profileType: 'PRESTATAIRE', msg: d },
      ].filter(Boolean);
      if (items.length === 0) return null;
      return items.reduce((best, cur) => {
        const bestTime = best?.msg?.createdAt ? new Date(best.msg.createdAt).getTime() : 0;
        const curTime = cur?.msg?.createdAt ? new Date(cur.msg.createdAt).getTime() : 0;
        return curTime > bestTime ? cur : best;
      });
    };

    const latest = pickLatest(djLatestUnread, bookerLatestUnread, venueLatestUnread, prestataireLatestUnread);

    res.json({
      success: true,
      count: totalUnread,
      byProfileType: {
        DJ: djTotalUnread,
        BOOKER: bookerTotalUnread,
        VENUE: venueTotalUnread,
        PRESTATAIRE: prestataireTotalUnread,
      },
      latest: latest
        ? {
            profileType: latest.profileType,
            messageId: latest.msg.id,
            messageType: latest.msg.type,
            preview: (latest.msg.content || '').slice(0, 160),
            createdAt: latest.msg.createdAt,
            eventDjId: latest.msg.eventDjId ?? null,
            eventVenueId: latest.msg.eventVenueId ?? null,
            eventPrestataireId: latest.msg.eventPrestataireId ?? null,
            eventId: latest.msg.eventId ?? null,
            eventTitle:
              latest.msg.event?.title ??
              latest.msg.eventDj?.event?.title ??
              latest.msg.eventVenue?.event?.title ??
              latest.msg.eventPrestataire?.event?.title ??
              null,
          }
        : null,
    });
  } catch (error) {
    console.error('Erreur récupération nombre messages non lus:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Marquer tous les messages non lus comme lus pour l'utilisateur actuel
 * @route PUT /api/chat/mark-all-read
 */
app.put('/api/chat/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil actif
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    if (user.activeProfileType === 'DJ') {
      // Marquer tous les messages privés non lus comme lus (reçus par le DJ)
      await prisma.message.updateMany({
        where: {
          type: 'PRIVATE',
          read: false,
          senderId: { not: userId },
          eventDj: {
            djId: userId,
          },
        },
        data: { read: true },
      });

      // Marquer tous les messages de groupe non lus comme lus pour les événements où le DJ est invité
      const djEventIds = await prisma.eventDj.findMany({
        where: { djId: userId },
        select: { eventId: true },
      });
      const eventIds = [...new Set(djEventIds.map((e) => e.eventId))];

      if (eventIds.length > 0) {
        await prisma.message.updateMany({
          where: {
            type: 'GROUP',
            read: false,
            senderId: { not: userId },
            eventId: { in: eventIds },
          },
          data: { read: true },
        });
      }
    } else if (user.activeProfileType === 'BOOKER') {
      // Pour les bookers, marquer tous les messages privés et de groupe comme lus
      const booker = await prisma.userBooker.findFirst({
        where: { userId: userId },
        select: { id: true },
      });

      if (booker) {
        // Messages privés DJ
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventDj: {
              event: { bookerId: booker.id },
            },
          },
          data: { read: true },
        });
        // Messages privés Lieu
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventVenue: {
              event: { bookerId: booker.id },
            },
          },
          data: { read: true },
        });
        // Messages privés Prestataire
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventPrestataire: {
              event: { bookerId: booker.id },
            },
          },
          data: { read: true },
        });

        // Marquer tous les messages de groupe non lus comme lus pour les événements du booker
        const bookerEventIds = await prisma.event.findMany({
          where: { bookerId: booker.id },
          select: { id: true },
        });
        const eventIds = bookerEventIds.map((e) => e.id);

        if (eventIds.length > 0) {
          await prisma.message.updateMany({
            where: {
              type: 'GROUP',
              read: false,
              senderId: { not: userId },
              eventId: { in: eventIds },
            },
            data: { read: true },
          });
        }
      }
    } else if (user.activeProfileType === 'VENUE') {
      const venue = await prisma.userVenue.findFirst({
        where: { userId: userId },
        select: { id: true },
      });
      if (venue) {
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventVenue: { venueId: venue.id },
          },
          data: { read: true },
        });
      }
    } else if (user.activeProfileType === 'PRESTATAIRE') {
      const prest = await prisma.userPrestataire.findFirst({
        where: { userId: userId },
        select: { id: true },
      });
      if (prest) {
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventPrestataire: { prestataireId: prest.id },
          },
          data: { read: true },
        });
      }
    }

    res.json({
      success: true,
      message: 'Tous les messages ont été marqués comme lus.',
    });
  } catch (error) {
    console.error('Erreur marquage tous messages lus:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
