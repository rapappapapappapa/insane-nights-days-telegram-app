/**
 * Fil d'actualité (following + feed principal).
 */
const jwt = require('jsonwebtoken');
const prisma = require('../../lib/prisma');
const { JWT_SECRET } = require('../../utils/jwtConfig');
const { parseTicketTiersFromDb } = require('../../utils/ticketTiers');
const {
  FEED_POST_INCLUDE,
  ORIGINAL_POST_INCLUDE,
  formatFeedPost,
  fetchUserRepostedRootIds,
} = require('./utils/feedPostHelpers');
const { upcomingPublishedFeedEventWhere } = require('../../utils/publicEventDiscovery');

function resolveOptionalUserId(req) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId || null;
  } catch {
    return null;
  }
}

function buildFeedImageNormalizer(req) {
  const getRequestBaseUrl = () => {
    const publicUrl = process.env.PUBLIC_URL;
    if (publicUrl) return publicUrl.replace(/\/$/, '');
    const host = req.get('host');
    const forwardedProto = req.get('x-forwarded-proto');
    const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
    return `${proto}://${host}`.replace(/\/$/, '');
  };
  const baseUrl = getRequestBaseUrl();
  return (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('/uploads/')) return `${baseUrl}${imageUrl}`;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return imageUrl;
  };
}

module.exports = function registerFeedListRoutes(app, deps) {
  const { authenticateToken } = deps;

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
    const followedVenues = await prisma.followVenue.findMany({
      where: { followerId: userId },
      select: { venueId: true },
    });
    const djIds = followedDjs.map((f) => f.djId);
    const bookerIds = followedBookers.map((f) => f.bookerId);
    const venueIds = followedVenues.map((f) => f.venueId);

    if (djIds.length === 0 && bookerIds.length === 0 && venueIds.length === 0) {
      return res.json({ success: true, feed: [], total: 0 });
    }

    const postsWhere = {
      OR: [
        ...(djIds.length > 0 ? [{ djId: { in: djIds } }] : []),
        ...(bookerIds.length > 0 ? [{ bookerId: { in: bookerIds } }] : []),
        ...(venueIds.length > 0 ? [{ venueId: { in: venueIds } }] : []),
      ],
    };

    const posts = await prisma.feedPost.findMany({
      where: postsWhere,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        ...FEED_POST_INCLUDE,
        originalPost: { include: ORIGINAL_POST_INCLUDE },
      },
    });

    const upcomingEvents = bookerIds.length > 0
      ? await prisma.event.findMany({
          where: {
            ...upcomingPublishedFeedEventWhere({ now: new Date() }),
            bookerId: { in: bookerIds },
          },
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

    const userRepostedRootIds = await fetchUserRepostedRootIds(
      userId,
      posts.map((p) => p.originalPostId || p.id),
    );

    const formattedPosts = posts.map((post) =>
      formatFeedPost(post, {
        normalizeImageUrl,
        userLikedPostIds,
        userRepostedRootIds,
      }),
    );

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

    let currentUserId = resolveOptionalUserId(req);

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
        ...FEED_POST_INCLUDE,
        originalPost: { include: ORIGINAL_POST_INCLUDE },
      },
    });

    // Récupérer les événements à venir (pour les annonces) - uniquement ceux publiés sur le feed
    const upcomingEvents = await prisma.event.findMany({
      where: upcomingPublishedFeedEventWhere({ now: new Date() }),
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

    const userRepostedRootIds = await fetchUserRepostedRootIds(
      currentUserId,
      posts.map((p) => p.originalPostId || p.id),
    );

    const formattedPosts = posts.map((post) =>
      formatFeedPost(post, {
        normalizeImageUrl,
        userLikedPostIds,
        userRepostedRootIds,
      }),
    );

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
 * Mur profil — publications (originales + reposts) d'un DJ, booker, lieu ou utilisateur.
 * @route GET /api/feed/wall
 * @query userId | djId | bookerId | venueId — un seul filtre requis
 */
app.get('/api/feed/wall', async (req, res) => {
  try {
    const { userId, djId, bookerId, venueId } = req.query;
    const filters = [userId, djId, bookerId, venueId].filter(Boolean);
    if (filters.length !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Indiquez exactement un paramètre : userId, djId, bookerId ou venueId.',
      });
    }

    const limit = parseInt(req.query.limit, 10) || 30;
    const offset = parseInt(req.query.offset, 10) || 0;
    const where = userId
      ? { authorId: String(userId) }
      : djId
        ? { djId: String(djId) }
        : bookerId
          ? { bookerId: String(bookerId) }
          : { venueId: String(venueId) };

    const posts = await prisma.feedPost.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        ...FEED_POST_INCLUDE,
        originalPost: { include: ORIGINAL_POST_INCLUDE },
      },
    });

    const total = await prisma.feedPost.count({ where });
    const currentUserId = resolveOptionalUserId(req);
    const normalizeImageUrl = buildFeedImageNormalizer(req);

    const userLikedPostIds = new Set();
    if (currentUserId && posts.length > 0) {
      const userLikes = await prisma.feedPostLike.findMany({
        where: { userId: currentUserId, postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      });
      userLikes.forEach((l) => userLikedPostIds.add(l.postId));
    }

    const userRepostedRootIds = await fetchUserRepostedRootIds(
      currentUserId,
      posts.map((p) => p.originalPostId || p.id),
    );

    const feed = posts.map((post) =>
      formatFeedPost(post, {
        normalizeImageUrl,
        userLikedPostIds,
        userRepostedRootIds,
      }),
    );

    res.json({ success: true, feed, total });
  } catch (error) {
    console.error('Erreur feed wall:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

};
