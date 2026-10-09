/**
 * Chat — registerChatGroupRoutes.
 */
const prisma = require('../../lib/prisma');
const chatPush = require('../../utils/chatPush');
const MAX_CHAT_MESSAGE_LENGTH = 5000;


module.exports = function registerChatGroupRoutes(app, deps) {
  const { authenticateToken } = deps;

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
};
