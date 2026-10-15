/**
 * Catalogue DJs public (liste, notes, événements).
 */
const prisma = require('../lib/prisma');

module.exports = function registerDjPublicRoutes(app, deps) {
  void deps;

  const buildPublicBaseUrl = (req) => {
    const publicUrl = process.env.PUBLIC_URL;
    if (publicUrl) return publicUrl.replace(/\/$/, '');
    const host = req.get('host');
    const forwardedProto = req.get('x-forwarded-proto');
    const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
    return `${proto}://${host}`.replace(/\/$/, '');
  };

  const normalizeImageUrl = (req, imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('/uploads/')) return `${buildPublicBaseUrl(req)}${imageUrl}`;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    return imageUrl;
  };

// Endpoint pour récupérer la liste de tous les DJs
app.get('/api/djs', async (req, res) => {
  try {
    const djs = await prisma.userDj.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
        media: {
          where: { type: 'photo', title: 'profile' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: {
        averageRatingGlobal: 'desc',
      },
    });

    // Compteurs de follows (total + gain sur 7 jours) pour tri « top followers »
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalFollows, weeklyFollows] = await Promise.all([
      prisma.followDj.groupBy({ by: ['djId'], _count: { djId: true } }),
      prisma.followDj.groupBy({
        by: ['djId'],
        where: { createdAt: { gte: weekAgo } },
        _count: { djId: true },
      }),
    ]);
    const totalFollowsMap = Object.fromEntries(totalFollows.map((f) => [f.djId, f._count.djId]));
    const weeklyFollowsMap = Object.fromEntries(weeklyFollows.map((f) => [f.djId, f._count.djId]));

    const formattedDjs = djs.map((dj) => {
      const profileImage = dj.profileImage || dj.media?.[0]?.url || null;
      return {
      id: dj.id,
      userId: dj.userId,
      artistName: dj.artistName,
      city: dj.city,
      bio: dj.bio,
      genre: dj.genre,
      mainCity: dj.mainCity,
      languages: dj.languages,
      hourlyRate: dj.hourlyRate,
      performanceRate: dj.performanceRate,
      minTravelFee: dj.minTravelFee,
      extraFees: dj.extraFees,
      availableStatus: dj.availableStatus,
      profileImage: normalizeImageUrl(req, profileImage),
      averageRatingGlobal: dj.averageRatingGlobal,
      totalRatingsGlobal: dj.totalRatingsCommunity + dj.totalRatingsBooker + dj.totalRatingsVenue,
      averageRatingCommunity: dj.averageRatingCommunity,
      averageRatingBooker: dj.averageRatingBooker,
      averageRatingVenue: dj.averageRatingVenue,
      followersCount: totalFollowsMap[dj.id] || 0,
      weeklyFollowers: weeklyFollowsMap[dj.id] || 0,
    };
    });

    res.json({ success: true, djs: formattedDjs });
  } catch (error) {
    console.error('Erreur récupération DJs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les notes d'un DJ (par UserDj.id ou User.id)
app.get('/api/dj/:identifier/ratings', async (req, res) => {
  try {
    // Essayer d'abord avec UserDj.id, puis avec User.id
    let dj = await prisma.userDj.findUnique({
      where: { id: req.params.identifier },
      include: {
        ratings: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                date: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    // Si pas trouvé, essayer avec User.id (prendre le premier profil DJ de cet utilisateur)
    if (!dj) {
      dj = await prisma.userDj.findFirst({
        where: { userId: req.params.identifier },
        include: {
          ratings: {
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                },
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });
    }

    if (!dj) {
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }

    // Récupérer les médias du DJ
    const media = await prisma.djMedia.findMany({
      where: { djId: dj.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      dj: {
        id: dj.id,
        userId: dj.userId,
        artistName: dj.artistName,
        city: dj.city,
        phone: dj.phone,
        birthDate: dj.birthDate,
        // Champs éditables
        bio: dj.bio,
        genre: dj.genre,
        mainCity: dj.mainCity,
        languages: dj.languages,
        hourlyRate: dj.hourlyRate,
        performanceRate: dj.performanceRate,
        minTravelFee: dj.minTravelFee,
        extraFees: dj.extraFees,
        availableStatus: dj.availableStatus,
        // Réseaux sociaux
        soundcloudUrl: dj.soundcloudUrl,
        spotifyUrl: dj.spotifyUrl,
        youtubeUrl: dj.youtubeUrl,
        instagramUrl: dj.instagramUrl,
        tiktokUrl: dj.tiktokUrl,
        equipment: dj.equipment,
      },
      ratings: {
        averageRatingCommunity: dj.averageRatingCommunity,
        averageRatingBooker: dj.averageRatingBooker,
        averageRatingVenue: dj.averageRatingVenue,
        averageRatingGlobal: dj.averageRatingGlobal,
        totalRatingsCommunity: dj.totalRatingsCommunity,
        totalRatingsBooker: dj.totalRatingsBooker,
        totalRatingsVenue: dj.totalRatingsVenue,
        allRatings: dj.ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          raterType: r.raterType,
          eventTitle: r.event.title,
          eventDate: r.event.date,
          createdAt: r.createdAt,
        })),
      },
      media: media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        title: m.title,
        thumbnail: m.thumbnail,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    console.error('Erreur récupération notes DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupère les événements d'un DJ pour affichage public (calendrier)
 * @route GET /api/dj/:identifier/events
 */
app.get('/api/dj/:identifier/events', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Essayer d'abord avec UserDj.id, puis avec User.id
    let dj = await prisma.userDj.findUnique({
      where: { id: identifier },
    });

    if (!dj) {
      dj = await prisma.userDj.findFirst({
        where: { userId: identifier },
      });
    }

    if (!dj) {
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }

    // Récupérer les événements où ce DJ est associé
    const eventDjs = await prisma.eventDj.findMany({
      where: { djId: dj.userId },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                venueName: true,
                address: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          date: 'desc',
        },
      },
    });

    const now = new Date();
    const upcomingEvents = [];
    const pastEvents = [];

    eventDjs.forEach((ed) => {
      const eventDate = new Date(ed.event.date);
      const event = {
        id: ed.event.id,
        title: ed.event.title,
        date: ed.event.date,
        time: ed.event.time,
        location: ed.event.location,
        status: ed.event.status,
        venue: ed.event.venue ? {
          id: ed.event.venue.id,
          name: ed.event.venue.venueName,
          address: ed.event.venue.address,
        } : null,
      };

      if (eventDate >= now) {
        upcomingEvents.push(event);
      } else {
        pastEvents.push(event);
      }
    });

    res.json({
      success: true,
      upcomingEvents: upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date)),
      pastEvents: pastEvents.sort((a, b) => new Date(b.date) - new Date(a.date)),
    });
  } catch (error) {
    console.error('Erreur récupération événements DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
