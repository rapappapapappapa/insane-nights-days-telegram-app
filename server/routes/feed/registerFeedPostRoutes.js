/**
 * Feed : upload image, création et suppression de posts.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');
const {
  FEED_POST_INCLUDE,
  ORIGINAL_POST_INCLUDE,
  requireDjOrBookerUser,
  resolveRootFeedPostId,
  formatFeedPost,
} = require('./utils/feedPostHelpers');

module.exports = function registerFeedPostRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

app.post(
  '/api/feed/post/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
  try {
    const userId = req.user.id;

    // Vérifier que l'utilisateur est un DJ, Booker ou Lieu
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    if (!user || !['DJ', 'BOOKER', 'VENUE'].includes(user.activeProfileType)) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les DJs, organisateurs et lieux peuvent uploader des images.',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucune image fournie.',
      });
    }

    // Vérifier que c'est bien une image
    if (!req.file.mimetype.startsWith('image/')) {
      // Supprimer le fichier si ce n'est pas une image
      if (MEDIA_STORAGE === 'local' && req.file.filename) {
        const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      return res.status(400).json({
        success: false,
        message: 'Le fichier doit être une image.',
      });
    }

    let imageUrl;
    if (MEDIA_STORAGE === 'r2') {
      try {
        const key = makeObjectKey('feed', req.file.originalname);
        const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
        imageUrl = uploaded.url;
      } catch (r2Error) {
        console.error('[uploadFeedPostImage] Erreur R2, fallback vers local:', r2Error.message);
        // ✅ FALLBACK: Si R2 échoue, utiliser le stockage local
        const publicUrl = process.env.PUBLIC_URL;
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = publicUrl
          ? publicUrl.replace(/\/$/, '')
          : (origin ? origin.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`);
        imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      }
    } else {
      // ✅ CORRECTION: Utiliser PUBLIC_URL en priorité pour éviter les URLs temporaires
      // Priorité : PUBLIC_URL (variable d'environnement) > Origin/Referer > Host de la requête
      // Cela garantit que les médias sont toujours accessibles via l'URL permanente (Railway)
      const publicUrl = process.env.PUBLIC_URL;
      const origin = req.get('origin') || req.get('referer');
      const baseUrl = publicUrl
        ? publicUrl.replace(/\/$/, '')
        : (origin ? origin.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`);
      imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      
      // ✅ LOG: Logger pour debug
      console.log('[uploadFeedPostImage] URL générée:', {
        hasPublicUrl: !!publicUrl,
        publicUrl: publicUrl,
        origin: origin,
        host: req.get('host'),
        finalUrl: imageUrl,
      });
    }

    res.json({
      success: true,
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error('Erreur upload image post:', error);
    // Supprimer le fichier en cas d'erreur
    if (MEDIA_STORAGE === 'local' && req.file && req.file.filename) {
      const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Créer un nouveau post dans le feed (DJ, Booker, Lieu)
 * @route POST /api/feed/post
 */
app.post('/api/feed/post', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, imageUrl } = req.body;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    if (!user || !['DJ', 'BOOKER', 'VENUE'].includes(user.activeProfileType)) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les DJs, organisateurs et lieux peuvent créer des posts. Les profils Community peuvent commenter.',
      });
    }

    // Vérifier que le contenu est fourni
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du post est requis.',
      });
    }

    // Initialiser postData avec les champs de base
    let postData = {
      authorId: userId,
      content: content.trim(),
    };

    // Ajouter imageUrl seulement s'il est fourni
    if (imageUrl) {
      postData.imageUrl = imageUrl;
      // ✅ Stocker la clé R2 si applicable (utile pour suppression/modération)
      try {
        if (MEDIA_STORAGE === 'r2') {
          const { keyFromPublicUrl } = require('./utils/mediaStorage');
          const k = keyFromPublicUrl(imageUrl);
          if (k) postData.imageStorageKey = k;
        }
      } catch (e) {
        // ignore
      }
    }

    let includeData = {
      author: {
        select: {
          username: true,
        },
      },
    };

    // Si c'est un DJ
    if (user.activeProfileType === 'DJ') {
      const djProfile = await prisma.userDj.findFirst({
        where: { userId: userId },
        select: { id: true },
      });

      if (!djProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profil DJ introuvable.',
        });
      }

      // ✅ CORRECTION: Ne définir que djId pour les DJs, pas bookerId
      postData.djId = djProfile.id;
      includeData.dj = {
        select: {
          artistName: true,
          profileImage: true,
          city: true,
        },
      };
    }
    // Si c'est un Booker
    else if (user.activeProfileType === 'BOOKER') {
      const bookerProfile = await prisma.userBooker.findFirst({
        where: { userId: userId },
        select: { id: true, nom: true, prenom: true },
      });

      if (!bookerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profil Booker introuvable.',
        });
      }

      // ✅ CORRECTION: Ne définir que bookerId pour les Bookers, pas djId
      postData.bookerId = bookerProfile.id;
      includeData.booker = {
        select: {
          pseudo: true,
          nom: true,
          prenom: true,
          bookerType: true,
          profileImage: true,
        },
      };
    }
    // Si c'est un Lieu
    else if (user.activeProfileType === 'VENUE') {
      const venueProfile = await prisma.userVenue.findFirst({
        where: { userId: userId },
        select: { id: true },
      });

      if (!venueProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profil lieu introuvable.',
        });
      }

      postData.venueId = venueProfile.id;
      includeData.venue = {
        select: {
          venueName: true,
          city: true,
          address: true,
          profileImage: true,
        },
      };
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Type de profil invalide. Seuls les DJs, organisateurs et lieux peuvent créer des posts.',
      });
    }

    // Créer le post
    const post = await prisma.feedPost.create({
      data: postData,
      include: includeData,
    });

    // Formater la réponse selon le type de profil
    const responsePost = {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      likes: post.likes,
      createdAt: post.createdAt,
      author: {
        username: post.author.username,
      },
      profileType: user.activeProfileType,
    };

    if (post.dj) {
      responsePost.dj = {
        id: post.djId,
        artistName: post.dj.artistName,
        profileImage: post.dj.profileImage,
        city: post.dj.city,
      };
    }

    if (post.booker) {
      responsePost.booker = {
        id: post.bookerId,
        name: post.booker.pseudo?.trim() || `${post.booker.nom} ${post.booker.prenom}`,
        bookerType: post.booker.bookerType,
        profileImage: post.booker.profileImage,
      };
    }

    if (post.venue) {
      responsePost.venue = {
        id: post.venueId,
        venueName: post.venue.venueName,
        city: post.venue.city,
        address: post.venue.address,
        profileImage: post.venue.profileImage,
      };
    }

    res.json({
      success: true,
      post: responsePost,
    });
  } catch (error) {
    console.error('Erreur création post feed:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Supprimer un post du feed (uniquement par l'auteur)
 * @route DELETE /api/feed/post/:postId
 */
app.delete('/api/feed/post/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Vérifier que le post existe
    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post introuvable.',
      });
    }

    // Vérifier que l'utilisateur est l'auteur du post
    if (post.authorId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer ce post.',
      });
    }

    // Supprimer le post (les likes, commentaires et notifications seront supprimés automatiquement grâce à onDelete: Cascade)
    await prisma.feedPost.delete({
      where: { id: postId },
    });

    res.json({
      success: true,
      message: 'Post supprimé avec succès.',
    });
  } catch (error) {
    console.error('Erreur suppression post:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Reposter un post (DJ / Booker) — le repost apparaît dans le feed du profil actif.
 * @route POST /api/feed/post/:postId/repost
 */
app.post('/api/feed/post/:postId/repost', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const author = await requireDjOrBookerUser(userId);
    if (author.error) {
      return res.status(author.error.status).json({ success: false, message: author.error.message });
    }

    const targetPost = await prisma.feedPost.findUnique({
      where: { id: postId },
      select: { id: true, originalPostId: true },
    });

    if (!targetPost) {
      return res.status(404).json({ success: false, message: 'Post introuvable.' });
    }

    const rootPostId = await resolveRootFeedPostId(postId);
    if (!rootPostId) {
      return res.status(404).json({ success: false, message: 'Post introuvable.' });
    }

    const rootPost = await prisma.feedPost.findUnique({
      where: { id: rootPostId },
      select: { id: true, authorId: true },
    });

    if (!rootPost) {
      return res.status(404).json({ success: false, message: 'Post introuvable.' });
    }

    if (rootPost.authorId === userId) {
      return res.status(400).json({
        success: false,
        message: 'Tu ne peux pas reposter ta propre publication.',
      });
    }

    const existingRepost = await prisma.feedPost.findFirst({
      where: {
        authorId: userId,
        originalPostId: rootPostId,
      },
      select: { id: true },
    });

    if (existingRepost) {
      return res.status(409).json({
        success: false,
        message: 'Tu as déjà reposté cette publication.',
        repostId: existingRepost.id,
      });
    }

    const postData = {
      authorId: userId,
      originalPostId: rootPostId,
      content: '',
    };

    if (author.djId) postData.djId = author.djId;
    if (author.bookerId) postData.bookerId = author.bookerId;

    const includeData = {
      ...FEED_POST_INCLUDE,
      originalPost: { include: ORIGINAL_POST_INCLUDE },
    };

    const repost = await prisma.feedPost.create({
      data: postData,
      include: includeData,
    });

    if (rootPost.authorId !== userId) {
      try {
        await prisma.feedNotification.create({
          data: {
            userId: rootPost.authorId,
            postId: repost.id,
            actorId: userId,
            type: 'repost',
          },
        });
      } catch (notifError) {
        console.error('Erreur création notification repost:', notifError);
      }
    }

    const normalizeImageUrl = (url) => url || null;
    const formatted = formatFeedPost(repost, {
      normalizeImageUrl,
      userLikedPostIds: new Set(),
      userRepostedRootIds: new Set([rootPostId]),
    });

    res.json({
      success: true,
      post: formatted,
    });
  } catch (error) {
    console.error('Erreur repost feed:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

};
