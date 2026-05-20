/**
 * Feed, abonnements, notifications feed, upload image post.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { parseTicketTiersFromDb } = require('../utils/ticketTiers');
const SERVER_ROOT = path.join(__dirname, '..');

module.exports = function registerFeedRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

/**
 * ============================================
 * ENDPOINTS FEED D'ACTUALITÉ - Posts des DJs et annonces d'événements
 * ============================================
 */

/**
 * ✅ AJOUT: Uploader une image pour un post du feed
 * @route POST /api/feed/post/upload-image
 */
app.post(
  '/api/feed/post/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
  try {
    const userId = req.user.id;

    // Vérifier que l'utilisateur est un DJ ou un Booker
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    if (!user || (user.activeProfileType !== 'DJ' && user.activeProfileType !== 'BOOKER')) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les DJs et les Bookers peuvent uploader des images.',
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
 * ✅ MODIFICATION: Créer un nouveau post dans le feed (DJ et Booker)
 * @route POST /api/feed/post
 */
app.post('/api/feed/post', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, imageUrl } = req.body;

    // Vérifier que l'utilisateur est un DJ ou un Booker
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    if (!user || (user.activeProfileType !== 'DJ' && user.activeProfileType !== 'BOOKER')) {
      return res.status(403).json({
        success: false,
        message: 'Seuls les DJs et les Bookers peuvent créer des posts. Les profils Community peuvent commenter.',
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
        },
      };
    }
    else {
      return res.status(400).json({
        success: false,
        message: 'Type de profil invalide. Seuls les DJs et Bookers peuvent créer des posts.',
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
 * ✅ Abonnements : suivre / ne plus suivre un profil DJ ou Booker
 * On suit le profil (UserDj.id ou UserBooker.id), pas l'utilisateur.
 */

// Suivre un profil DJ (UserDj.id)
app.post('/api/follow/dj/:djId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { djId } = req.params;

    const dj = await prisma.userDj.findUnique({ where: { id: djId } });
    if (!dj) {
      return res.status(404).json({ success: false, message: 'Profil DJ non trouvé.' });
    }

    const existing = await prisma.followDj.findUnique({
      where: { followerId_djId: { followerId, djId } },
    });
    if (existing) {
      return res.json({ success: true, following: true, message: 'Déjà abonné.' });
    }

    await prisma.followDj.create({
      data: { followerId, djId },
    });

    res.status(201).json({ success: true, following: true, message: 'Abonnement ajouté.' });
  } catch (error) {
    console.error('Erreur follow DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Ne plus suivre un profil DJ
app.delete('/api/follow/dj/:djId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { djId } = req.params;

    await prisma.followDj.deleteMany({
      where: { followerId, djId },
    });

    res.json({ success: true, following: false, message: 'Abonnement retiré.' });
  } catch (error) {
    console.error('Erreur unfollow DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer le profil public d'un Booker (sans authentification)
 * @route GET /api/booker/:bookerId/public
 */
app.get('/api/booker/:bookerId/public', async (req, res) => {
  try {
    const { bookerId } = req.params;
    const booker = await prisma.userBooker.findUnique({
      where: { id: bookerId },
      include: {
        _count: {
          select: { events: true, feedPosts: true },
        },
      },
    });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }
    const getRequestBaseUrl = () => {
      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) return publicUrl.replace(/\/$/, '');
      const host = req.get('host');
      const forwardedProto = req.get('x-forwarded-proto');
      const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
      return host ? `${proto}://${host}` : '';
    };
    const baseUrl = getRequestBaseUrl();
    const normalizeImageUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('/uploads/')) return `${baseUrl}${url}`;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return url;
    };
    res.json({
      success: true,
      booker: {
        id: booker.id,
        userId: booker.userId,
        pseudo: booker.pseudo,
        nom: booker.nom,
        prenom: booker.prenom,
        name: booker.pseudo?.trim() || `${booker.nom} ${booker.prenom}`,
        bookerType: booker.bookerType,
        profileImage: normalizeImageUrl(booker.profileImage),
        eventsCount: booker._count.events,
        postsCount: booker._count.feedPosts,
      },
    });
  } catch (error) {
    console.error('Erreur profil Booker public:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Suivre un profil Booker (UserBooker.id)
app.post('/api/follow/booker/:bookerId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { bookerId } = req.params;

    const booker = await prisma.userBooker.findUnique({ where: { id: bookerId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const existing = await prisma.followBooker.findUnique({
      where: { followerId_bookerId: { followerId, bookerId } },
    });
    if (existing) {
      return res.json({ success: true, following: true, message: 'Déjà abonné.' });
    }

    await prisma.followBooker.create({
      data: { followerId, bookerId },
    });

    res.status(201).json({ success: true, following: true, message: 'Abonnement ajouté.' });
  } catch (error) {
    console.error('Erreur follow Booker:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Ne plus suivre un profil Booker
app.delete('/api/follow/booker/:bookerId', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { bookerId } = req.params;

    await prisma.followBooker.deleteMany({
      where: { followerId, bookerId },
    });

    res.json({ success: true, following: false, message: 'Abonnement retiré.' });
  } catch (error) {
    console.error('Erreur unfollow Booker:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Vérifier si l'utilisateur suit un profil (djId ou bookerId en query)
app.get('/api/follow/status', authenticateToken, async (req, res) => {
  try {
    const followerId = req.user.id;
    const { djId, bookerId } = req.query;

    if (djId) {
      const follow = await prisma.followDj.findUnique({
        where: { followerId_djId: { followerId, djId } },
      });
      return res.json({ success: true, following: !!follow });
    }
    if (bookerId) {
      const follow = await prisma.followBooker.findUnique({
        where: { followerId_bookerId: { followerId, bookerId } },
      });
      return res.json({ success: true, following: !!follow });
    }

    return res.status(400).json({ success: false, message: 'djId ou bookerId requis.' });
  } catch (error) {
    console.error('Erreur follow status:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Feed Abonnements : posts + événements des profils suivis (DJ ou Booker)
 * @route GET /api/feed/following
 * @query limit, offset
 * @auth requis
 */
app.get('/api/feed/following', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const followedDjs = await prisma.followDj.findMany({
      where: { followerId: userId },
      select: { djId: true },
    });
    const followedBookers = await prisma.followBooker.findMany({
      where: { followerId: userId },
      select: { bookerId: true },
    });
    const djIds = followedDjs.map((f) => f.djId);
    const bookerIds = followedBookers.map((f) => f.bookerId);

    if (djIds.length === 0 && bookerIds.length === 0) {
      return res.json({ success: true, feed: [], total: 0 });
    }

    const postsWhere = {
      OR: [
        ...(djIds.length > 0 ? [{ djId: { in: djIds } }] : []),
        ...(bookerIds.length > 0 ? [{ bookerId: { in: bookerIds } }] : []),
      ],
    };

    const posts = await prisma.feedPost.findMany({
      where: postsWhere,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { comments: true } },
        dj: {
          include: {
            media: {
              where: { type: 'photo', title: 'profile' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        booker: { select: { pseudo: true, nom: true, prenom: true, bookerType: true, profileImage: true } },
        author: { select: { username: true, activeProfileType: true } },
      },
    });

    const upcomingEvents = bookerIds.length > 0
      ? await prisma.event.findMany({
          where: { bookerId: { in: bookerIds }, status: 'UPCOMING', date: { gte: new Date() } },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            venue: { select: { venueName: true, address: true } },
            booker: { select: { pseudo: true, nom: true, prenom: true } },
          },
        })
      : [];

    const getRequestBaseUrl = () => {
      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) return publicUrl.replace(/\/$/, '');
      const host = req.get('host');
      const forwardedProto = req.get('x-forwarded-proto');
      const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
      return `${proto}://${host}`.replace(/\/$/, '');
    };
    const baseUrl = getRequestBaseUrl();
    const normalizeImageUrl = (imageUrl) => {
      if (!imageUrl) return null;
      if (imageUrl.startsWith('/uploads/')) return `${baseUrl}${imageUrl}`;
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
      return imageUrl;
    };

    const userLikedPostIds = new Set();
    if (posts.length > 0) {
      const userLikes = await prisma.feedPostLike.findMany({
        where: { userId, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      });
      userLikes.forEach((l) => userLikedPostIds.add(l.postId));
    }

    const formattedPosts = posts.map((post) => {
      const profileType = post.djId ? 'DJ' : (post.bookerId ? 'BOOKER' : null);
      const formattedPost = {
        type: 'post',
        id: post.id,
        content: post.content,
        imageUrl: normalizeImageUrl(post.imageUrl),
        likes: post.likes,
        liked: userLikedPostIds.has(post.id),
        commentsCount: post._count?.comments ?? 0,
        createdAt: post.createdAt,
        profileType,
        author: { id: post.authorId, username: post.author.username },
      };
      if (post.dj) {
        const djProfileImg = post.dj.profileImage || post.dj.media?.[0]?.url;
        formattedPost.dj = {
          id: post.djId,
          userId: post.authorId,
          artistName: post.dj.artistName,
          profileImage: normalizeImageUrl(djProfileImg),
          city: post.dj.city,
        };
      }
      if (post.booker) {
        formattedPost.booker = {
          id: post.bookerId,
          userId: post.authorId,
          name: post.booker.pseudo?.trim() || `${post.booker.nom} ${post.booker.prenom}`,
          bookerType: post.booker.bookerType,
          profileImage: normalizeImageUrl(post.booker.profileImage),
        };
      } else if (post.bookerId) {
        formattedPost.bookerId = post.bookerId;
      }
      return formattedPost;
    });

    const formattedEvents = upcomingEvents.map((event) => {
      const rawTiers = parseTicketTiersFromDb(event.ticketTiers);
      return {
        type: 'event',
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price,
        hasMultipleTicketPrices: Array.isArray(rawTiers) && rawTiers.length > 1,
        genre: event.genre,
        image: normalizeImageUrl(event.image),
        venue: event.venue ? { name: event.venue.venueName, address: event.venue.address } : null,
        booker: event.booker ? { name: event.booker.pseudo?.trim() || `${event.booker.nom} ${event.booker.prenom}` } : null,
        createdAt: event.createdAt,
      };
    });

    const feedItems = [...formattedPosts, ...formattedEvents].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      feed: feedItems.slice(0, limit),
      total: feedItems.length,
    });
  } catch (error) {
    console.error('Erreur feed following:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Récupérer le feed d'actualité (posts + événements)
 * @route GET /api/feed
 * @query limit - Nombre d'éléments à récupérer (défaut: 20)
 * @query offset - Offset pour la pagination (défaut: 0)
 */
app.get('/api/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // ✅ AUGMENTÉ: De 20 à 50 par défaut pour voir plus de posts
    const offset = parseInt(req.query.offset) || 0;

    // ✅ Optionnel: récupérer l'utilisateur si token présent (pour inclure liked dans la réponse)
    let currentUserId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.userId;
      } catch (e) {
        // Token invalide ou expiré, ignorer
      }
    }

    // Récupérer les posts récents (triés par date décroissante)
    // ✅ CORRECTION: Pas de filtre par date - tous les posts sont visibles pour tous les utilisateurs
    // Tous les posts sont récupérés indépendamment de la date de création du compte utilisateur ou d'installation de l'app
    // ✅ IMPORTANT: Pas de filtre par date d'installation de l'app - tous les posts historiques doivent être visibles
    const posts = await prisma.feedPost.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      // Pas de where clause - tous les posts sont récupérés indépendamment de la date de création du compte ou d'installation
      include: {
        _count: { select: { comments: true } },
        dj: {
          include: {
            media: {
              where: { type: 'photo', title: 'profile' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        booker: {
          select: {
            pseudo: true,
            nom: true,
            prenom: true,
            bookerType: true,
            profileImage: true,
          },
        },
        author: {
          select: {
            username: true,
            activeProfileType: true,
          },
        },
      },
    });

    // Récupérer les événements à venir (pour les annonces) - uniquement ceux publiés sur le feed
    const upcomingEvents = await prisma.event.findMany({
      where: {
        status: 'UPCOMING',
        publishedOnFeed: true,
        date: {
          gte: new Date(), // Événements futurs uniquement
        },
      },
      take: 10, // Limiter à 10 événements récents
      orderBy: { createdAt: 'desc' },
      include: {
        venue: {
          select: {
            venueName: true,
            address: true,
          },
        },
        booker: {
          select: {
            pseudo: true,
            nom: true,
            prenom: true,
          },
        },
        eventDjs: {
          include: {
            event: false, // Éviter la récursion
          },
        },
      },
    });

    // ✅ AJOUT: Helpers pour normaliser les URLs d'images
    // ✅ CORRECTION: Utiliser PUBLIC_URL en priorité pour éviter les URLs temporaires
    const getRequestBaseUrl = () => {
      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) {
        return publicUrl.replace(/\/$/, '');
      }
      const host = req.get('host');
      const forwardedProto = req.get('x-forwarded-proto');
      const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
      return `${proto}://${host}`.replace(/\/$/, '');
    };

    const baseUrl = getRequestBaseUrl();

    const normalizeImageUrl = (imageUrl) => {
      if (!imageUrl) return null;
      
      // Si l'URL est relative (commence par /uploads/), construire l'URL complète
      if (imageUrl.startsWith('/uploads/')) {
        return `${baseUrl}${imageUrl}`;
      }
      
      // Si l'URL est déjà complète (commence par http:// ou https://)
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        try {
          const parsed = new URL(imageUrl);
          const reqHost = req.get('host');
          const isLocalHost =
            parsed.hostname === 'localhost' ||
            parsed.hostname === '127.0.0.1' ||
            parsed.port === '5000';
          const isOldTryCloudflareHost =
            parsed.hostname.endsWith('trycloudflare.com') &&
            reqHost &&
            parsed.hostname !== reqHost;

          // On ne réécrit que les URLs qui pointent vers nos fichiers uploads
          const isUploadsPath = parsed.pathname.startsWith('/uploads/');

          if ((isLocalHost || isOldTryCloudflareHost) && isUploadsPath) {
            return `${baseUrl}${parsed.pathname}`;
          }
        } catch (e) {
          // URL invalide -> on la retourne telle quelle
        }
        
        // Si c'est une URL externe valide, la retourner telle quelle
        return imageUrl;
      }
      
      // Sinon, retourner l'URL telle quelle (pour les URLs externes)
      return imageUrl;
    };

    // ✅ Récupérer les likes de l'utilisateur connecté pour inclure liked dans chaque post
    let userLikedPostIds = new Set();
    if (currentUserId && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const userLikes = await prisma.feedPostLike.findMany({
        where: {
          userId: currentUserId,
          postId: { in: postIds },
        },
        select: { postId: true },
      });
      userLikedPostIds = new Set(userLikes.map((l) => l.postId));
    }

    // Formater les posts
    const formattedPosts = posts.map((post) => {
      // ✅ CORRECTION: Déterminer le profileType selon djId/bookerId au moment de la création, pas activeProfileType actuel
      const profileType = post.djId ? 'DJ' : (post.bookerId ? 'BOOKER' : null);
      
      const formattedPost = {
        type: 'post',
        id: post.id,
        content: post.content,
        imageUrl: normalizeImageUrl(post.imageUrl), // ✅ CORRECTION: Normaliser l'URL de l'image
        likes: post.likes,
        liked: currentUserId ? userLikedPostIds.has(post.id) : undefined, // ✅ Statut like pour l'utilisateur connecté
        commentsCount: post._count?.comments ?? 0,
        createdAt: post.createdAt,
        profileType: profileType, // ✅ CORRECTION: Utiliser djId/bookerId pour déterminer le type, pas activeProfileType
        author: {
          id: post.authorId,
          username: post.author.username,
        },
      };

      // Si c'est un DJ
      if (post.dj) {
        const djProfileImg = post.dj.profileImage || post.dj.media?.[0]?.url;
        formattedPost.dj = {
          id: post.djId,
          userId: post.authorId,
          artistName: post.dj.artistName,
          profileImage: normalizeImageUrl(djProfileImg),
          city: post.dj.city,
        };
      }

      // Si c'est un Booker
      if (post.booker) {
        formattedPost.booker = {
          id: post.bookerId,
          userId: post.authorId,
          name: post.booker.pseudo?.trim() || `${post.booker.nom} ${post.booker.prenom}`,
          bookerType: post.booker.bookerType,
          profileImage: normalizeImageUrl(post.booker.profileImage),
        };
      } else if (post.bookerId) {
        formattedPost.bookerId = post.bookerId;
      }

      return formattedPost;
    });

    // Formater les événements comme annonces
    const formattedEvents = upcomingEvents.map((event) => {
      const rawTiers = parseTicketTiersFromDb(event.ticketTiers);
      return {
        type: 'event',
        id: event.id,
        title: event.title,
        description: event.description,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price,
        hasMultipleTicketPrices: Array.isArray(rawTiers) && rawTiers.length > 1,
        genre: event.genre,
        image: normalizeImageUrl(event.image), // ✅ CORRECTION: Normaliser l'URL de l'image de l'événement
        venue: event.venue
          ? {
              name: event.venue.venueName,
              address: event.venue.address,
            }
          : null,
        booker: event.booker
          ? {
              name: event.booker.pseudo?.trim() || `${event.booker.nom} ${event.booker.prenom}`,
            }
          : null,
        createdAt: event.createdAt,
      };
    });

    // Combiner et trier par date décroissante
    const feedItems = [...formattedPosts, ...formattedEvents].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // ✅ DEBUG: Logger les informations du feed pour diagnostiquer
    const returnedFeed = feedItems.slice(0, limit);
    const returnedPosts = returnedFeed.filter(item => item.type === 'post');
    console.log('[API /feed] Feed généré:', {
      totalPosts: formattedPosts.length,
      totalEvents: formattedEvents.length,
      totalItems: feedItems.length,
      limit: limit,
      offset: offset,
      returnedItems: returnedFeed.length,
      returnedPosts: returnedPosts.length,
      oldestItem: feedItems.length > 0 ? feedItems[feedItems.length - 1]?.createdAt : null,
      newestItem: feedItems.length > 0 ? feedItems[0]?.createdAt : null,
      allPostDates: formattedPosts.map(p => p.createdAt),
    });
    
    // ✅ VÉRIFICATION: S'assurer qu'on retourne bien tous les posts disponibles
    if (formattedPosts.length > 0 && returnedPosts.length < formattedPosts.length) {
      console.warn('[API /feed] ⚠️ ATTENTION: Tous les posts ne sont pas retournés !', {
        totalPosts: formattedPosts.length,
        returnedPosts: returnedPosts.length,
        missingPosts: formattedPosts.length - returnedPosts.length,
      });
    }

    res.json({
      success: true,
      feed: feedItems.slice(0, limit), // Limiter au nombre demandé
      total: feedItems.length,
    });
  } catch (error) {
    console.error('Erreur récupération feed:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ AJOUT: Liker ou unliker un post
 * @route POST /api/feed/post/:postId/like
 */
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
