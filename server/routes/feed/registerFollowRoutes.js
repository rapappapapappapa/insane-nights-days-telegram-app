/**
 * Abonnements DJ / Booker et profil booker public.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerFollowRoutes(app, deps) {
  const { authenticateToken } = deps;

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

/** Organisateurs / collectifs publics (accueil communauté) */
app.get('/api/bookers/public', async (req, res) => {
  try {
    const { bookerType } = req.query;
    const baseUrl = (() => {
      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) return publicUrl.replace(/\/$/, '');
      const host = req.get('host');
      const forwardedProto = req.get('x-forwarded-proto');
      const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
      return `${proto}://${host}`.replace(/\/$/, '');
    })();
    const normalize = (url) => {
      if (!url) return null;
      if (url.startsWith('/uploads/')) return `${baseUrl}${url}`;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return url;
    };

    const where = bookerType ? { bookerType: String(bookerType) } : {};
    const bookers = await prisma.userBooker.findMany({
      where,
      orderBy: { pseudo: 'asc' },
      take: parseInt(req.query.limit, 10) || 50,
    });

    res.json({
      success: true,
      bookers: bookers.map((b) => ({
        id: b.id,
        userId: b.userId,
        pseudo: b.pseudo,
        name: b.pseudo?.trim() || `${b.nom || ''} ${b.prenom || ''}`.trim(),
        bookerType: b.bookerType,
        profileImage: normalize(b.profileImage),
      })),
    });
  } catch (error) {
    console.error('Erreur bookers publics:', error);
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
};
