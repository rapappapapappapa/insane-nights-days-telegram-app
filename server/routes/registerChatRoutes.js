const prisma = require('../lib/prisma');
const chatPush = require('../utils/chatPush');

const MAX_CHAT_MESSAGE_LENGTH = 5000;

module.exports = function registerChatRoutes(app, deps) {
  const { authenticateToken } = deps;

/**
 * ============================================
 * ENDPOINTS CHAT - Communication DJ/Booker
 * ============================================
 */

/**
 * Envoyer un message dans une conversation (DJ ou Booker)
 * @route POST /api/chat/:eventDjId/messages
 */
app.post('/api/chat/:eventDjId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message est requis.',
      });
    }
    const trimmed = content.trim();
    if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Le message ne doit pas dépasser ${MAX_CHAT_MESSAGE_LENGTH} caractères.`,
      });
    }

    // Récupérer l'invitation
    const invitation = await prisma.eventDj.findUnique({
      where: { id: eventDjId },
      include: {
        event: {
          include: {
            booker: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation non trouvée.',
      });
    }

    // Vérifier que l'utilisateur est soit le DJ, soit le booker de l'événement
    const isDj = invitation.djId === userId;
    // bookerId dans Event pointe vers UserBooker.id, pas User.id
    const isBooker = invitation.event.booker && invitation.event.booker.userId === userId;

    if (!isDj && !isBooker) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à envoyer des messages dans cette conversation.',
      });
    }

    // Créer le message (type PRIVATE)
    const message = await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventDjId: eventDjId,
        senderId: userId,
        content: trimmed,
        read: false,
        deleted: false,
      },
      include: {
        eventDj: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    void chatPush
      .afterPrivateDjMessage({
        senderId: userId,
        invitation,
        content: trimmed,
        eventTitle: invitation.event?.title,
      })
      .catch((err) => console.error('[chatPush] private DJ/booker:', err));

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès.',
      data: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        read: message.read,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer les messages d'une conversation
 * @route GET /api/chat/:eventDjId/messages
 */
app.get('/api/chat/:eventDjId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;

    console.log('[CHAT] GET messages - eventDjId:', eventDjId, 'userId:', userId);

    // Récupérer l'invitation
    const invitation = await prisma.eventDj.findUnique({
      where: { id: eventDjId },
      include: {
        event: {
          include: {
            booker: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation non trouvée.',
      });
    }

    // Vérifier que l'utilisateur est soit le DJ, soit le booker
    const isDj = invitation.djId === userId;
    // bookerId dans Event pointe vers UserBooker.id, pas User.id
    // Il faut vérifier via invitation.event.booker qui est déjà chargé
    const isBooker = invitation.event.booker && invitation.event.booker.userId === userId;

    if (!isDj && !isBooker) {
      console.log('[CHAT] Accès refusé - isDj:', isDj, 'isBooker:', isBooker, 'userId:', userId, 'bookerId:', invitation.event.bookerId, 'booker.userId:', invitation.event.booker?.userId);
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à voir cette conversation.',
      });
    }

    // Récupérer les messages privés
    const messages = await prisma.message.findMany({
      where: { 
        eventDjId: eventDjId,
        type: 'PRIVATE',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        eventDj: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Enrichir avec les infos de l'expéditeur
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        // Récupérer les infos de l'expéditeur
        let senderInfo = null;
        if (msg.senderId === invitation.djId) {
          // C'est le DJ
          const dj = await prisma.userDj.findFirst({
            where: { userId: msg.senderId },
            select: {
              artistName: true,
              profileImage: true,
            },
          });
          senderInfo = {
            type: 'DJ',
            name: dj?.artistName || 'DJ',
            image: dj?.profileImage || null,
          };
        } else if (invitation.event.booker && invitation.event.booker.userId === msg.senderId) {
          // C'est le booker
          senderInfo = {
            type: 'BOOKER',
            name: invitation.event.booker ? `${invitation.event.booker.prenom} ${invitation.event.booker.nom}` : 'Booker',
            image: null,
          };
        }

        return {
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderInfo: senderInfo,
          read: msg.read,
          deleted: msg.deleted,
          createdAt: msg.createdAt,
          isOwn: msg.senderId === userId,
        };
      })
    );

    res.json({
      success: true,
      messages: enrichedMessages,
    });
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Envoyer un message dans une conversation Organisateur ↔ Lieu
 * @route POST /api/chat/event-venue/:eventVenueId/messages
 */
app.post('/api/chat/event-venue/:eventVenueId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Le contenu du message est requis.' });
    }
    const trimmedVenue = content.trim();
    if (trimmedVenue.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `Le message ne doit pas dépasser ${MAX_CHAT_MESSAGE_LENGTH} caractères.` });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { include: { booker: true } }, venue: true },
    });
    if (!ev) return res.status(404).json({ success: false, message: 'Conversation non trouvée.' });

    const isBooker = ev.event?.booker?.userId === userId;
    const isVenue = ev.venue?.userId === userId;
    if (!isBooker && !isVenue) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const message = await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventVenueId,
        senderId: userId,
        content: trimmedVenue,
        read: false,
        deleted: false,
      },
    });

    void chatPush
      .afterVenueMessage({
        senderId: userId,
        ev,
        content: trimmedVenue,
        eventTitle: ev.event?.title,
      })
      .catch((err) => console.error('[chatPush] venue:', err));

    res.status(201).json({
      success: true,
      message: 'Message envoyé.',
      data: { id: message.id, content: message.content, senderId: message.senderId, read: message.read, createdAt: message.createdAt },
    });
  } catch (error) {
    console.error('Erreur envoi message EventVenue:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer les messages Organisateur ↔ Lieu
 * @route GET /api/chat/event-venue/:eventVenueId/messages
 */
app.get('/api/chat/event-venue/:eventVenueId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { include: { booker: true } }, venue: true },
    });
    if (!ev) return res.status(404).json({ success: false, message: 'Conversation non trouvée.' });

    const isBooker = ev.event?.booker?.userId === userId;
    const isVenue = ev.venue?.userId === userId;
    if (!isBooker && !isVenue) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const messages = await prisma.message.findMany({
      where: { eventVenueId, type: 'PRIVATE' },
      orderBy: { createdAt: 'asc' },
      include: { eventVenue: { include: { event: true, venue: true } } },
    });

    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderInfo = null;
        if (msg.senderId === ev.event?.booker?.userId) {
          const b = await prisma.userBooker.findFirst({ where: { userId: msg.senderId }, select: { nom: true, prenom: true, profileImage: true } });
          senderInfo = { type: 'BOOKER', name: b ? `${b.prenom} ${b.nom}` : 'Organisateur', image: b?.profileImage };
        } else if (msg.senderId === ev.venue?.userId) {
          const v = await prisma.userVenue.findFirst({ where: { userId: msg.senderId }, select: { venueName: true, profileImage: true } });
          senderInfo = { type: 'VENUE', name: v?.venueName || 'Lieu', image: v?.profileImage };
        }
        return {
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderInfo,
          read: msg.read,
          deleted: msg.deleted,
          createdAt: msg.createdAt,
          isOwn: msg.senderId === userId,
        };
      })
    );

    res.json({ success: true, messages: enrichedMessages });
  } catch (error) {
    console.error('Erreur récupération messages EventVenue:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Marquer un message comme lu
 * @route PUT /api/chat/messages/:messageId/read
 */
app.put('/api/chat/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    // Récupérer le message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        eventDj: {
          include: {
            event: { include: { booker: true } },
          },
        },
        eventVenue: {
          include: {
            event: { include: { booker: true } },
            venue: true,
          },
        },
      },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé.',
      });
    }

    let isAuthorized = false;
    if (message.eventDj) {
      const isDj = message.eventDj.djId === userId;
      const isBooker = message.eventDj.event?.booker?.userId === userId;
      isAuthorized = isDj || isBooker;
    } else if (message.eventVenue) {
      const isBooker = message.eventVenue.event?.booker?.userId === userId;
      const isVenue = message.eventVenue.venue?.userId === userId;
      isAuthorized = isBooker || isVenue;
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à marquer ce message comme lu.',
      });
    }

    // Ne pas marquer comme lu si c'est l'expéditeur
    if (message.senderId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas marquer votre propre message comme lu.',
      });
    }

    // Marquer comme lu
    await prisma.message.update({
      where: { id: messageId },
      data: { read: true },
    });

    res.json({
      success: true,
      message: 'Message marqué comme lu.',
    });
  } catch (error) {
    console.error('Erreur marquage message lu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Supprimer (soft delete) un message
 * @route DELETE /api/chat/messages/:messageId
 */
app.delete('/api/chat/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message non trouvé.',
      });
    }

    // Seul l'expéditeur peut supprimer son message
    if (message.senderId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres messages.',
      });
    }

    const deletedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        deleted: true,
        content: 'message supprimé',
      },
    });

    res.json({
      success: true,
      message: 'Message supprimé.',
      data: {
        id: deletedMessage.id,
        deleted: deletedMessage.deleted,
        content: deletedMessage.content,
      },
    });
  } catch (error) {
    console.error('Erreur suppression message:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer le nombre total de messages non lus
 * @route GET /api/chat/unread-count
 */
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
      const bookerPrivateUnread = bookerPrivateUnreadDj + bookerPrivateUnreadVenue;

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

    const totalUnread = djTotalUnread + bookerTotalUnread + venueTotalUnread;

    const pickLatest = (a, b, c) => {
      const items = [
        a && { profileType: 'DJ', msg: a },
        b && { profileType: 'BOOKER', msg: b },
        c && { profileType: 'VENUE', msg: c },
      ].filter(Boolean);
      if (items.length === 0) return null;
      return items.reduce((best, cur) => {
        const bestTime = best?.msg?.createdAt ? new Date(best.msg.createdAt).getTime() : 0;
        const curTime = cur?.msg?.createdAt ? new Date(cur.msg.createdAt).getTime() : 0;
        return curTime > bestTime ? cur : best;
      });
    };

    const latest = pickLatest(djLatestUnread, bookerLatestUnread, venueLatestUnread);

    res.json({
      success: true,
      count: totalUnread,
      byProfileType: {
        DJ: djTotalUnread,
        BOOKER: bookerTotalUnread,
        VENUE: venueTotalUnread,
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
            eventId: latest.msg.eventId ?? null,
            eventTitle:
              latest.msg.event?.title ??
              latest.msg.eventDj?.event?.title ??
              latest.msg.eventVenue?.event?.title ??
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

/**
 * ============================================
 * ENDPOINTS CHAT DE GROUPE - Communication entre tous les DJs d'un événement
 * ============================================
 */

/**
 * Envoyer un message dans le chat de groupe d'un événement
 * @route POST /api/chat/group/:eventId/messages
 */
app.post('/api/chat/group/:eventId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du message est requis.',
      });
    }
    const trimmedGroup = content.trim();
    if (trimmedGroup.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Le message ne doit pas dépasser ${MAX_CHAT_MESSAGE_LENGTH} caractères.`,
      });
    }

    // Récupérer l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        booker: true,
        eventDjs: {
          include: {
            messages: {
              where: { type: 'GROUP' },
            },
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé.',
      });
    }

    // Vérifier que l'utilisateur est soit le booker, soit un DJ invité à l'événement
    const isBooker = event.booker && event.booker.userId === userId;
    const isDj = event.eventDjs.some((inv) => inv.djId === userId);

    if (!isBooker && !isDj) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à envoyer des messages dans ce chat de groupe.',
      });
    }

    // Créer le message de groupe
    // Pour les messages de groupe, eventDjId doit être explicitement null
    const message = await prisma.message.create({
      data: {
        type: 'GROUP',
        eventId: eventId,
        eventDjId: null, // Explicitement null pour les messages de groupe
        senderId: userId,
        content: trimmedGroup,
        read: false,
        deleted: false,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    void chatPush
      .afterGroupMessage({
        senderId: userId,
        event,
        content: trimmedGroup,
      })
      .catch((err) => console.error('[chatPush] group:', err));

    res.status(201).json({
      success: true,
      message: 'Message envoyé avec succès.',
      data: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        read: message.read,
        createdAt: message.createdAt,
      },
    });
  } catch (error) {
    console.error('Erreur envoi message groupe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer les messages du chat de groupe d'un événement
 * @route GET /api/chat/group/:eventId/messages
 */
app.get('/api/chat/group/:eventId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    console.log('[CHAT GROUP] GET messages - eventId:', eventId, 'userId:', userId);

    // Récupérer l'événement
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        booker: true,
        eventDjs: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé.',
      });
    }

    // Vérifier que l'utilisateur est soit le booker, soit un DJ invité
    const isBooker = event.booker && event.booker.userId === userId;
    const isDj = event.eventDjs.some((inv) => inv.djId === userId);

    if (!isBooker && !isDj) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à voir ce chat de groupe.',
      });
    }

    // Récupérer les messages de groupe
    const messages = await prisma.message.findMany({
      where: {
        type: 'GROUP',
        eventId: eventId,
      },
      orderBy: { createdAt: 'asc' },
      include: {
        event: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Enrichir avec les infos de l'expéditeur
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderInfo = null;

        // Vérifier si c'est le booker
        if (event.booker && event.booker.userId === msg.senderId) {
          senderInfo = {
            type: 'BOOKER',
            name: `${event.booker.prenom} ${event.booker.nom}`,
            image: null,
          };
        } else {
          // C'est un DJ
          const dj = await prisma.userDj.findFirst({
            where: { userId: msg.senderId },
            select: {
              artistName: true,
              profileImage: true,
            },
          });
          senderInfo = {
            type: 'DJ',
            name: dj?.artistName || 'DJ',
            image: dj?.profileImage || null,
          };
        }

        return {
          id: msg.id,
          content: msg.content,
          senderId: msg.senderId,
          senderInfo: senderInfo,
          read: msg.read,
          deleted: msg.deleted,
          createdAt: msg.createdAt,
          isOwn: msg.senderId === userId,
        };
      })
    );

    res.json({
      success: true,
      messages: enrichedMessages,
    });
  } catch (error) {
    console.error('Erreur récupération messages groupe:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer toutes les conversations (pour DJ ou Booker)
 * @route GET /api/chat/conversations
 */
app.get('/api/chat/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil actif
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    let conversations = [];

    if (user.activeProfileType === 'DJ') {
      // Récupérer les conversations où le DJ est invité
      const invitations = await prisma.eventDj.findMany({
        where: { djId: userId },
        include: {
          event: {
            include: {
              booker: {
                select: {
                  id: true,
                  nom: true,
                  prenom: true,
                },
              },
              venue: {
                select: {
                  id: true,
                  venueName: true,
                },
              },
            },
          },
          messages: {
            where: { type: 'PRIVATE' },
            orderBy: { createdAt: 'desc' },
            take: 1, // Dernier message
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      conversations = invitations.map((inv) => {
        const lastMessage = inv.messages[0] || null;
        const unreadCount = inv.messages.filter(
          (m) => !m.read && m.senderId !== userId
        ).length;

        return {
          eventDjId: inv.id,
          eventId: inv.event.id,
          eventTitle: inv.event.title,
          eventDate: inv.event.date,
          invitationStatus: inv.status,
          otherParty: {
            type: 'BOOKER',
            id: inv.event.booker?.id || null,
            name: inv.event.booker
              ? `${inv.event.booker.prenom} ${inv.event.booker.nom}`
              : 'Booker',
          },
          venue: inv.event.venue
            ? {
                id: inv.event.venue.id,
                name: inv.event.venue.venueName,
              }
            : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                content: lastMessage.content,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount: unreadCount,
          updatedAt: inv.updatedAt,
        };
      });

      // Ajouter les chats de groupe pour chaque événement où le DJ est invité
      const eventIds = [...new Set(invitations.map((inv) => inv.event.id))];
      const groupChats = await Promise.all(
        eventIds.map(async (evId) => {
          const event = await prisma.event.findUnique({
            where: { id: evId },
            include: {
              venue: {
                select: {
                  id: true,
                  venueName: true,
                },
              },
            },
          });

          if (!event) return null;

          const lastGroupMessage = await prisma.message.findFirst({
            where: {
              type: 'GROUP',
              eventId: evId,
            },
            orderBy: { createdAt: 'desc' },
          });

          const unreadGroupCount = await prisma.message.count({
            where: {
              type: 'GROUP',
              eventId: evId,
              read: false,
              senderId: { not: userId },
            },
          });

          return {
            eventDjId: null,
            eventId: evId,
            eventTitle: event.title,
            eventDate: event.date,
            invitationStatus: null,
            isGroupChat: true,
            otherParty: {
              type: 'GROUP',
              name: `Groupe - ${event.title}`,
              image: null,
            },
            venue: event.venue
              ? {
                  id: event.venue.id,
                  name: event.venue.venueName,
                }
              : null,
            lastMessage: lastGroupMessage
              ? {
                  id: lastGroupMessage.id,
                  content: lastGroupMessage.content,
                  senderId: lastGroupMessage.senderId,
                  createdAt: lastGroupMessage.createdAt,
                }
              : null,
            unreadCount: unreadGroupCount,
            updatedAt: lastGroupMessage?.updatedAt || event.updatedAt,
          };
        })
      );

      conversations = [...conversations, ...groupChats.filter((g) => g !== null)];
    } else if (user.activeProfileType === 'BOOKER') {
      // Récupérer le profil booker de l'utilisateur
      const booker = await prisma.userBooker.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!booker) {
        return res.status(404).json({
          success: false,
          message: 'Profil Booker non trouvé.',
        });
      }

      // Récupérer les conversations où le booker a invité des DJs
      const events = await prisma.event.findMany({
        where: { bookerId: booker.id },
        include: {
          eventDjs: {
            include: {
              messages: {
                where: { type: 'PRIVATE' },
                orderBy: { createdAt: 'desc' },
                take: 1, // Dernier message
              },
            },
          },
          venue: {
            select: {
              id: true,
              venueName: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      conversations = events.flatMap((event) =>
        event.eventDjs.map((inv) => {
          const lastMessage = inv.messages && inv.messages.length > 0 ? inv.messages[0] : null;
          const unreadCount = inv.messages ? inv.messages.filter(
            (m) => !m.read && m.senderId !== userId
          ).length : 0;

          return {
            eventDjId: inv.id,
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.date,
            invitationStatus: inv.status,
            otherParty: {
              type: 'DJ',
              id: inv.djId,
              name: 'DJ', // Sera enrichi plus tard si nécessaire
            },
            venue: event.venue
              ? {
                  id: event.venue.id,
                  name: event.venue.venueName,
                }
              : null,
            lastMessage: lastMessage
              ? {
                  id: lastMessage.id,
                  content: lastMessage.content,
                  senderId: lastMessage.senderId,
                  createdAt: lastMessage.createdAt,
                }
              : null,
            unreadCount: unreadCount,
            updatedAt: inv.updatedAt,
          };
        })
      );

      // Enrichir avec les noms des DJs
      const djIds = [...new Set(conversations.map((c) => c.otherParty.id))];
      const djs = await prisma.userDj.findMany({
        where: { userId: { in: djIds } },
        select: {
          userId: true,
          artistName: true,
          profileImage: true,
        },
      });

      const djMap = {};
      djs.forEach((dj) => {
        djMap[dj.userId] = dj;
      });

      conversations = conversations.map((conv) => {
        const dj = djMap[conv.otherParty.id];
        if (dj) {
          conv.otherParty.name = dj.artistName;
          conv.otherParty.image = dj.profileImage;
        }
        return conv;
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Seuls les DJs et Bookers peuvent accéder aux conversations.',
      });
    }

    res.json({
      success: true,
      conversations: conversations,
    });
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
