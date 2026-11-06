/**
 * Chat — registerChatPrivateRoutes.
 */
const prisma = require('../../lib/prisma');
const chatPush = require('../../utils/chatPush');
const MAX_CHAT_MESSAGE_LENGTH = 5000;


module.exports = function registerChatPrivateRoutes(app, deps) {
  const { authenticateToken } = deps;

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
 * Chat Organisateur ↔ Prestataire
 * @route POST /api/chat/event-prestataire/:eventPrestataireId/messages
 */
app.post('/api/chat/event-prestataire/:eventPrestataireId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Le contenu du message est requis.' });
    }
    const trimmed = content.trim();
    if (trimmed.length > MAX_CHAT_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `Le message ne doit pas dépasser ${MAX_CHAT_MESSAGE_LENGTH} caractères.` });
    }

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { include: { booker: true } }, prestataire: true },
    });
    if (!ep) return res.status(404).json({ success: false, message: 'Conversation non trouvée.' });

    const isBooker = ep.event?.booker?.userId === userId;
    const isPrestataire = ep.prestataire?.userId === userId;
    if (!isBooker && !isPrestataire) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const message = await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventPrestataireId,
        senderId: userId,
        content: trimmed,
        read: false,
        deleted: false,
      },
    });

    void chatPush
      .afterPrestataireMessage({
        senderId: userId,
        ep,
        content: trimmed,
        eventTitle: ep.event?.title,
      })
      .catch((err) => console.error('[chatPush] prestataire:', err));

    res.status(201).json({
      success: true,
      message: 'Message envoyé.',
      data: { id: message.id, content: message.content, senderId: message.senderId, read: message.read, createdAt: message.createdAt },
    });
  } catch (error) {
    console.error('Erreur envoi message EventPrestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route GET /api/chat/event-prestataire/:eventPrestataireId/messages
 */
app.get('/api/chat/event-prestataire/:eventPrestataireId/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { include: { booker: true } }, prestataire: true },
    });
    if (!ep) return res.status(404).json({ success: false, message: 'Conversation non trouvée.' });

    const isBooker = ep.event?.booker?.userId === userId;
    const isPrestataire = ep.prestataire?.userId === userId;
    if (!isBooker && !isPrestataire) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const messages = await prisma.message.findMany({
      where: { eventPrestataireId, type: 'PRIVATE' },
      orderBy: { createdAt: 'asc' },
      include: { eventPrestataire: { include: { event: true, prestataire: true } } },
    });

    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        let senderInfo = null;
        if (msg.senderId === ep.event?.booker?.userId) {
          const b = await prisma.userBooker.findFirst({ where: { userId: msg.senderId }, select: { nom: true, prenom: true, profileImage: true } });
          senderInfo = { type: 'BOOKER', name: b ? `${b.prenom} ${b.nom}` : 'Organisateur', image: b?.profileImage };
        } else if (msg.senderId === ep.prestataire?.userId) {
          const pr = await prisma.userPrestataire.findFirst({
            where: { userId: msg.senderId },
            select: { businessName: true, profileImage: true },
          });
          senderInfo = { type: 'PRESTATAIRE', name: pr?.businessName || 'Prestataire', image: pr?.profileImage };
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
    console.error('Erreur récupération messages EventPrestataire:', error);
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
        eventPrestataire: {
          include: {
            event: { include: { booker: true } },
            prestataire: true,
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
    } else if (message.eventPrestataire) {
      const isBooker = message.eventPrestataire.event?.booker?.userId === userId;
      const isPrestataire = message.eventPrestataire.prestataire?.userId === userId;
      isAuthorized = isBooker || isPrestataire;
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
};
