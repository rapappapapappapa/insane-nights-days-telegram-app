/**
 * Chat — registerChatConversationsRoutes.
 */
const prisma = require('../../lib/prisma');
const chatPush = require('../../utils/chatPush');
const MAX_CHAT_MESSAGE_LENGTH = 5000;


module.exports = function registerChatConversationsRoutes(app, deps) {
  const { authenticateToken } = deps;

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
