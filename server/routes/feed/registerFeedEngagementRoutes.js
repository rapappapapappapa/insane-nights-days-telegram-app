/**
 * Likes, commentaires et notifications feed.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerFeedEngagementRoutes(app, deps) {
  const { authenticateToken } = deps;

app.post('/api/feed/post/:postId/like', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Vérifier que le post existe
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post introuvable.',
      });
    }

    // Vérifier si l'utilisateur a déjà liké ce post
    const existingLike = await prisma.feedPostLike.findUnique({
      where: {
        postId_userId: {
          postId: postId,
          userId: userId,
        },
      },
    });

    if (existingLike) {
      // Unliker : supprimer le like
      await prisma.feedPostLike.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Décrémenter le compteur de likes
      await prisma.feedPost.update({
        where: { id: postId },
        data: {
          likes: {
            decrement: 1,
          },
        },
      });

      res.json({
        success: true,
        liked: false,
        likesCount: Math.max(0, post.likes - 1),
      });
    } else {
      // Liker : créer le like
      await prisma.feedPostLike.create({
        data: {
          postId: postId,
          userId: userId,
        },
      });

      // Incrémenter le compteur de likes
      await prisma.feedPost.update({
        where: { id: postId },
        data: {
          likes: {
            increment: 1,
          },
        },
      });

      // ✅ AJOUT: Créer une notification pour le propriétaire du post (sauf si c'est lui-même)
      if (post.authorId !== userId) {
        try {
          await prisma.feedNotification.create({
            data: {
              userId: post.authorId,
              postId: postId,
              actorId: userId,
              type: 'like',
            },
          });
        } catch (notifError) {
          // Ignorer les erreurs de notification (ne pas bloquer le like)
          console.error('Erreur création notification like:', notifError);
        }
      }

      res.json({
        success: true,
        liked: true,
        likesCount: post.likes + 1,
      });
    }
  } catch (error) {
    console.error('Erreur like/unlike post:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Vérifier si l'utilisateur a liké un post
 * @route GET /api/feed/post/:postId/like
 */
app.get('/api/feed/post/:postId/like', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const like = await prisma.feedPostLike.findUnique({
      where: {
        postId_userId: {
          postId: postId,
          userId: userId,
        },
      },
    });

    res.json({
      success: true,
      liked: !!like,
    });
  } catch (error) {
    console.error('Erreur vérification like:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Créer un commentaire sur un post
 * @route POST /api/feed/post/:postId/comment
 */
app.post('/api/feed/post/:postId/comment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du commentaire est requis.',
      });
    }

    // Vérifier que le post existe
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post introuvable.',
      });
    }

    // Créer le commentaire
    const comment = await prisma.feedPostComment.create({
      data: {
        postId: postId,
        userId: userId,
        content: content.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            activeProfileType: true,
          },
        },
      },
    });

    // ✅ AJOUT: Créer une notification pour le propriétaire du post (sauf si c'est lui-même)
    if (post.authorId !== userId) {
      try {
        await prisma.feedNotification.create({
          data: {
            userId: post.authorId,
            postId: postId,
            actorId: userId,
            type: 'comment',
          },
        });
      } catch (notifError) {
        // Ignorer les erreurs de notification (ne pas bloquer le commentaire)
        console.error('Erreur création notification comment:', notifError);
      }
    }

    res.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          username: comment.user.username,
          profileType: comment.user.activeProfileType,
        },
      },
    });
  } catch (error) {
    console.error('Erreur création commentaire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Récupérer les commentaires d'un post
 * @route GET /api/feed/post/:postId/comments
 */
app.get('/api/feed/post/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const comments = await prisma.feedPostComment.findMany({
      where: { postId: postId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            activeProfileType: true,
          },
        },
      },
    });

    res.json({
      success: true,
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        user: {
          id: comment.user.id,
          username: comment.user.username,
          profileType: comment.user.activeProfileType,
        },
      })),
    });
  } catch (error) {
    console.error('Erreur récupération commentaires:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Récupérer les notifications du feed pour l'utilisateur connecté
 * @route GET /api/feed/notifications
 */
app.get('/api/feed/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const notifications = await prisma.feedNotification.findMany({
      where: { userId: userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
          },
        },
        actor: {
          select: {
            id: true,
            username: true,
            activeProfileType: true,
          },
        },
      },
    });

    res.json({
      success: true,
      notifications: notifications.map((notif) => ({
        id: notif.id,
        type: notif.type,
        read: notif.read,
        createdAt: notif.createdAt,
        post: {
          id: notif.post.id,
          content: notif.post.content,
          imageUrl: notif.post.imageUrl,
        },
        actor: {
          id: notif.actor.id,
          username: notif.actor.username,
          profileType: notif.actor.activeProfileType,
        },
      })),
    });
  } catch (error) {
    console.error('Erreur récupération notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Récupérer le nombre de notifications non lues
 * @route GET /api/feed/notifications/unread-count
 */
app.get('/api/feed/notifications/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const count = await prisma.feedNotification.count({
      where: {
        userId: userId,
        read: false,
      },
    });

    res.json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error('Erreur récupération nombre notifications:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Marquer une notification comme lue
 * @route PUT /api/feed/notifications/:notificationId/read
 */
app.put('/api/feed/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    const notification = await prisma.feedNotification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable.',
      });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas accès à cette notification.',
      });
    }

    await prisma.feedNotification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Erreur marquage notification lue:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Marquer toutes les notifications comme lues
 * @route PUT /api/feed/notifications/mark-all-read
 */
app.put('/api/feed/notifications/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await prisma.feedNotification.updateMany({
      where: {
        userId: userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Erreur marquage toutes notifications lues:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
