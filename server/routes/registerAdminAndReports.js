const prisma = require('../lib/prisma');

module.exports = function registerAdminAndReportsRoutes(app, deps) {
  const { authenticateToken, requireAdmin, bcrypt, MEDIA_STORAGE, deleteFromR2 } = deps;

/**
 * ✅ Admin bootstrap (1ère mise en place)
 * Permet de créer/promouvoir un ADMIN sans accès DB direct.
 * Protégé par ADMIN_BOOTSTRAP_KEY (à mettre dans Railway env).
 *
 * POST /api/admin/bootstrap
 * headers: x-admin-bootstrap-key
 * body: { email, username?, password? }
 */
app.post('/api/admin/bootstrap', async (req, res) => {
  try {
    const key = req.get('x-admin-bootstrap-key') || req.body?.bootstrapKey;
    const expected = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!expected || key !== expected) {
      return res.status(403).json({ success: false, message: 'Clé bootstrap invalide.' });
    }

    const { email, username, password } = req.body ?? {};
    if (!email) return res.status(400).json({ success: false, message: 'email requis.' });

    const existing = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' },
      });
      return res.json({ success: true, message: 'Utilisateur promu ADMIN.', userId: updated.id });
    }

    if (!password || String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'password requis (min 6) pour créer un admin.' });
    }

    const hashed = await bcrypt.hash(String(password), 10);
    const created = await prisma.user.create({
      data: {
        email: String(email).toLowerCase().trim(),
        username: (username || 'admin').toString().trim(),
        password: hashed,
        role: 'ADMIN',
      },
    });

    return res.status(201).json({ success: true, message: 'Admin créé.', userId: created.id });
  } catch (e) {
    console.error('Erreur admin bootstrap:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Seed demo data (events + feed) for remote testers
 * Protected by ADMIN_BOOTSTRAP_KEY (same mechanism as bootstrap).
 *
 * POST /api/admin/seed-demo
 * headers: x-admin-bootstrap-key
 * query: reset=true (optional) to delete demo data first
 */
app.post('/api/admin/seed-demo', async (req, res) => {
  try {
    const key = req.get('x-admin-bootstrap-key') || req.body?.bootstrapKey;
    const expected = process.env.ADMIN_BOOTSTRAP_KEY;
    if (!expected || key !== expected) {
      return res.status(403).json({ success: false, message: 'Clé bootstrap invalide.' });
    }

    const reset = String(req.query?.reset || '').toLowerCase() === 'true';

    const demo = {
      dj: { email: 'demo.dj@insane.test', username: 'demo_dj' },
      booker: { email: 'demo.booker@insane.test', username: 'demo_booker' },
      venue: { email: 'demo.venue@insane.test', username: 'demo_venue' },
    };

    if (reset) {
      const demoUsers = await prisma.user.findMany({
        where: { email: { in: [demo.dj.email, demo.booker.email, demo.venue.email] } },
        select: { id: true },
      });
      const demoUserIds = demoUsers.map(u => u.id);

      // Remove demo content first (safe even if empty)
      await prisma.feedPost.deleteMany({ where: { authorId: { in: demoUserIds } } });
      await prisma.event.deleteMany({ where: { title: { startsWith: 'Demo -' } } });
      await prisma.userDj.deleteMany({ where: { userId: { in: demoUserIds } } });
      await prisma.userBooker.deleteMany({ where: { userId: { in: demoUserIds } } });
      await prisma.userVenue.deleteMany({ where: { userId: { in: demoUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: demoUserIds } } });
    } else {
      // If we already have upcoming events, don't spam duplicates
      const existingUpcoming = await prisma.event.count({
        where: { status: 'UPCOMING', date: { gte: new Date() } },
      });
      if (existingUpcoming > 0) {
        return res.json({
          success: true,
          message: 'Seed ignoré: des événements UPCOMING existent déjà. Utilise ?reset=true si tu veux régénérer.',
          existingUpcoming,
        });
      }
    }

    const demoPassword = await bcrypt.hash('demo-password-change-me', 10);

    const djUser = await prisma.user.upsert({
      where: { email: demo.dj.email },
      update: { username: demo.dj.username, activeProfileType: 'DJ', accountType: 'DJ' },
      create: {
        email: demo.dj.email,
        username: demo.dj.username,
        password: demoPassword,
        activeProfileType: 'DJ',
        accountType: 'DJ',
      },
    });

    const bookerUser = await prisma.user.upsert({
      where: { email: demo.booker.email },
      update: { username: demo.booker.username, activeProfileType: 'BOOKER', accountType: 'BOOKER' },
      create: {
        email: demo.booker.email,
        username: demo.booker.username,
        password: demoPassword,
        activeProfileType: 'BOOKER',
        accountType: 'BOOKER',
      },
    });

    const venueUser = await prisma.user.upsert({
      where: { email: demo.venue.email },
      update: { username: demo.venue.username, activeProfileType: 'VENUE', accountType: 'VENUE' },
      create: {
        email: demo.venue.email,
        username: demo.venue.username,
        password: demoPassword,
        activeProfileType: 'VENUE',
        accountType: 'VENUE',
      },
    });

    await prisma.userDj.deleteMany({ where: { userId: djUser.id } });
    await prisma.userBooker.deleteMany({ where: { userId: bookerUser.id } });
    await prisma.userVenue.deleteMany({ where: { userId: venueUser.id } });

    const djProfile = await prisma.userDj.create({
      data: {
        userId: djUser.id,
        artistName: 'Demo DJ Neon',
        city: 'Paris',
        phone: '0000000000',
        birthDate: '01/01/1999',
        bio: 'Compte démo pour tests iOS/Android.',
        genre: 'Techno',
        profileImage: 'https://images.unsplash.com/photo-1520975693416-35a27293e0f3?w=400&h=400&fit=crop',
        bannerImage: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&h=400&fit=crop',
        languages: 'FR,EN',
      },
    });

    const bookerProfile = await prisma.userBooker.create({
      data: {
        userId: bookerUser.id,
        nom: 'Demo',
        prenom: 'Booker',
        phonePro: '0000000000',
        bookerType: 'Club',
      },
    });

    const venueProfile = await prisma.userVenue.create({
      data: {
        userId: venueUser.id,
        venueName: 'Demo Club Insane',
        address: '123 Rue de la Nuit, Paris',
      },
    });

    const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

    // Create 2 upcoming events so the feed isn't empty
    const e1 = await prisma.event.create({
      data: {
        title: 'Demo - Insane Night (Techno)',
        date: daysFromNow(7),
        time: '22:00',
        location: 'Demo Club Insane, Paris',
        price: 25,
        capacity: 200,
        sold: 0,
        genre: 'Techno',
        description: 'Événement démo pour tests (Railway).',
        image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&h=800&fit=crop',
        status: 'UPCOMING',
        venueId: venueProfile.id,
        bookerId: bookerProfile.id,
      },
    });

    const e2 = await prisma.event.create({
      data: {
        title: 'Demo - Bass Revolution (D&B)',
        date: daysFromNow(14),
        time: '21:00',
        location: 'Demo Club Insane, Paris',
        price: 30,
        capacity: 150,
        sold: 0,
        genre: 'Drum & Bass',
        description: 'Événement démo pour tests (Railway).',
        image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1200&h=800&fit=crop',
        status: 'UPCOMING',
        venueId: venueProfile.id,
        bookerId: bookerProfile.id,
      },
    });

    // Link DJ to events
    await prisma.eventDj.createMany({
      data: [
        { eventId: e1.id, djId: djUser.id, status: 'ACCEPTED' },
        { eventId: e2.id, djId: djUser.id, status: 'ACCEPTED' },
      ],
      skipDuplicates: true,
    });

    // Create a couple of demo feed posts
    await prisma.feedPost.createMany({
      data: [
        {
          authorId: djUser.id,
          djId: djProfile.id,
          content: 'Demo: prêt pour une Insane Night sur Railway. 🔥',
          imageUrl: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&h=800&fit=crop',
        },
        {
          authorId: bookerUser.id,
          bookerId: bookerProfile.id,
          content: 'Demo: nouveaux événements à venir, pensez à réserver vos places.',
          imageUrl: 'https://images.unsplash.com/photo-1464375117522-1311dd7a0b66?w=1200&h=800&fit=crop',
        },
      ],
      skipDuplicates: true,
    });

    return res.json({
      success: true,
      message: 'Seed démo OK.',
      created: {
        users: { dj: djUser.id, booker: bookerUser.id, venue: venueUser.id },
        profiles: { dj: djProfile.id, booker: bookerProfile.id, venue: venueProfile.id },
        events: [e1.id, e2.id],
      },
    });
  } catch (e) {
    console.error('Erreur seed demo:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur', error: String(e?.message || e) });
  }
});

// Exemple endpoints admin
app.get('/api/admin/me', authenticateToken, requireAdmin, async (req, res) => {
  res.json({ success: true, admin: { id: req.user.id, email: req.user.email, username: req.user.username } });
});

// Helper: audit log admin actions (best-effort)
async function logAdminAction({ adminId, action, targetType, targetId, metadata }) {
  try {
    await prisma.adminActionLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId: targetId || null,
        metadata: metadata || undefined,
      },
    });
  } catch (e) {
    // best-effort: never block the main action
    if (process.env.DEBUG_LOGS === 'true') {
      console.warn('[admin log] failed:', e?.message ?? e);
    }
  }
}

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, username: true, role: true, activeProfileType: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({ success: true, users });
  } catch (e) {
    console.error('Erreur admin users:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: modifier le rôle d'un utilisateur
 * @route PUT /api/admin/users/:userId/role
 * body: { role: 'USER' | 'ADMIN' }
 */
app.put('/api/admin/users/:userId/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const nextRoleRaw = req.body?.role;
    const nextRole = typeof nextRoleRaw === 'string' ? nextRoleRaw.trim().toUpperCase() : null;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId requis.' });
    }
    if (nextRole !== 'USER' && nextRole !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Rôle invalide. Utilise USER ou ADMIN.' });
    }

    // Empêcher un admin de se retirer ses propres droits (évite lock-out)
    if (req.user.id === userId && nextRole !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Impossible de retirer ton propre accès admin.' });
    }

    // Empêcher de supprimer le dernier admin
    if (nextRole !== 'ADMIN') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (target?.role === 'ADMIN' && adminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Impossible: il doit rester au moins un admin.' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role: nextRole },
      select: { id: true, email: true, username: true, role: true, activeProfileType: true, createdAt: true },
    });

    await logAdminAction({
      adminId: req.user.id,
      action: 'SET_USER_ROLE',
      targetType: 'USER',
      targetId: updated.id,
      metadata: { role: updated.role },
    });

    return res.json({ success: true, user: updated });
  } catch (e) {
    console.error('Erreur admin set role:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: lister les posts du feed (modération)
 * @route GET /api/admin/feed/posts?limit=&offset=
 */
app.get('/api/admin/feed/posts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const posts = await prisma.feedPost.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        imageStorageKey: true,
        createdAt: true,
        author: { select: { id: true, username: true, email: true } },
        dj: { select: { artistName: true } },
        booker: { select: { nom: true, prenom: true } },
      },
    });

    return res.json({ success: true, posts });
  } catch (e) {
    console.error('Erreur admin list feed posts:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: supprimer un post du feed (modération)
 * @route DELETE /api/admin/feed/posts/:postId
 */
app.delete('/api/admin/feed/posts/:postId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ success: false, message: 'postId requis.' });
    }

    const post = await prisma.feedPost.findUnique({
      where: { id: postId },
      select: { id: true, imageUrl: true, imageStorageKey: true },
    });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post introuvable.' });
    }

    // Best-effort: supprimer l'objet R2 si on a une clé
    if (MEDIA_STORAGE === 'r2') {
      try {
        await deleteFromR2({ key: post.imageStorageKey, url: post.imageUrl });
      } catch (e) {
        // Ne pas bloquer la suppression DB sur un échec R2 (réseau/droits)
        console.warn('[admin delete feed post] deleteFromR2 failed:', e?.message ?? e);
      }
    }

    await prisma.feedPost.delete({ where: { id: postId } });

    await logAdminAction({
      adminId: req.user.id,
      action: 'DELETE_FEED_POST',
      targetType: 'FEED_POST',
      targetId: postId,
      metadata: { hadImage: !!post.imageUrl },
    });
    return res.json({ success: true, message: 'Post supprimé.' });
  } catch (e) {
    console.error('Erreur admin delete feed post:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Créer un signalement (report)
 * @route POST /api/reports
 * body: { targetType, targetId, reason, details? }
 */
app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const reporterId = req.user.id;
    const { targetType, targetId, reason, details } = req.body ?? {};

    const t = typeof targetType === 'string' ? targetType.trim().toUpperCase() : null;
    const r = typeof reason === 'string' ? reason.trim().toUpperCase() : null;
    const id = typeof targetId === 'string' ? targetId.trim() : null;

    const allowedTypes = ['FEED_POST', 'EVENT', 'USER', 'DJ_PROFILE', 'BOOKER_PROFILE', 'VENUE_PROFILE'];
    const allowedReasons = ['SPAM', 'HARASSMENT', 'SCAM', 'ILLEGAL', 'OTHER'];

    if (!t || !allowedTypes.includes(t)) {
      return res.status(400).json({ success: false, message: 'targetType invalide.' });
    }
    if (!id) {
      return res.status(400).json({ success: false, message: 'targetId requis.' });
    }
    if (!r || !allowedReasons.includes(r)) {
      return res.status(400).json({ success: false, message: 'reason invalide.' });
    }

    // Validation best-effort selon le type
    if (t === 'FEED_POST') {
      const exists = await prisma.feedPost.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return res.status(404).json({ success: false, message: 'Post introuvable.' });
    }
    if (t === 'EVENT') {
      const exists = await prisma.event.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType: t,
        targetId: id,
        reason: r,
        details: typeof details === 'string' ? details.trim().slice(0, 2000) : null,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ success: true, report });
  } catch (e) {
    console.error('Erreur création report:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: lister les signalements
 * @route GET /api/admin/reports?status=
 */
app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : null;
    const where = {};
    if (status && ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(status)) {
      where.status = status;
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        details: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        reporter: { select: { id: true, username: true, email: true } },
      },
    });

    return res.json({ success: true, reports });
  } catch (e) {
    console.error('Erreur admin list reports:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: mettre à jour un report
 * @route PUT /api/admin/reports/:reportId
 * body: { status?, adminNote? }
 */
app.put('/api/admin/reports/:reportId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    const nextStatusRaw = req.body?.status;
    const nextStatus = typeof nextStatusRaw === 'string' ? nextStatusRaw.trim().toUpperCase() : null;
    const adminNote = typeof req.body?.adminNote === 'string' ? req.body.adminNote.trim().slice(0, 2000) : null;

    const data = { adminId: req.user.id };
    if (nextStatus && ['OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED'].includes(nextStatus)) {
      data.status = nextStatus;
    }
    if (adminNote !== null) data.adminNote = adminNote;

    const updated = await prisma.report.update({
      where: { id: reportId },
      data,
      select: {
        id: true,
        status: true,
        adminNote: true,
        updatedAt: true,
      },
    });

    await logAdminAction({
      adminId: req.user.id,
      action: 'UPDATE_REPORT',
      targetType: 'REPORT',
      targetId: reportId,
      metadata: { status: updated.status },
    });

    return res.json({ success: true, report: updated });
  } catch (e) {
    console.error('Erreur admin update report:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: lister les événements (modération)
 * @route GET /api/admin/events?limit=&offset=
 */
app.get('/api/admin/events', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = Math.max(0, parseInt(req.query.offset) || 0);

    const events = await prisma.event.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        date: true,
        time: true,
        location: true,
        status: true,
        genre: true,
        image: true,
        createdAt: true,
        booker: { select: { id: true, nom: true, prenom: true, user: { select: { id: true, username: true, email: true } } } },
        venue: { select: { id: true, venueName: true } },
      },
    });

    return res.json({ success: true, events });
  } catch (e) {
    console.error('Erreur admin list events:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Admin: supprimer un événement
 * @route DELETE /api/admin/events/:eventId
 */
app.delete('/api/admin/events/:eventId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { eventId } = req.params;
    if (!eventId) return res.status(400).json({ success: false, message: 'eventId requis.' });

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, image: true },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });

    // Les ratings ne sont pas en cascade -> clean avant suppression
    await prisma.djRating.deleteMany({ where: { eventId } });
    await prisma.venueRating.deleteMany({ where: { eventId } });

    await prisma.event.delete({ where: { id: eventId } });

    await logAdminAction({
      adminId: req.user.id,
      action: 'DELETE_EVENT',
      targetType: 'EVENT',
      targetId: eventId,
      metadata: { title: event.title },
    });

    return res.json({ success: true, message: 'Événement supprimé.' });
  } catch (e) {
    console.error('Erreur admin delete event:', e);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
