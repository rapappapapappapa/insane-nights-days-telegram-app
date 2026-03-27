/**
 * Serveur principal Insane Nights & Days
 * 
 * Ce fichier configure Express et organise toutes les routes de l'API.
 * Les routes d'authentification et utilisateur sont maintenant modulaires
 * (voir /routes/authRoutes.js et /routes/userRoutes.js).
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import des routes modulaires
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const authController = require('./controllers/authController');
const userController = require('./controllers/userController');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  deleteFromR2,
} = require('./utils/mediaStorage');
const { JWT_SECRET } = require('./utils/jwtConfig');
const { parseTicketQuantity } = require('./utils/validation');

/** Parse "HH:mm" → minutes depuis minuit (0–1439). */
function parseHmClock(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59 || h < 0 || mi < 0) return null;
  return h * 60 + mi;
}

/** Vérifie qu'un créneau [slotStart, slotEnd] est dans [heure événement, +durée] (gestion après minuit). */
function djSlotFitsEventWindow(slotStart, slotEnd, eventTimeStr, durationHoursNum) {
  const evS = parseHmClock(eventTimeStr);
  if (evS == null) return { ok: false, message: 'Heure événement invalide.' };
  if (!Number.isFinite(durationHoursNum) || durationHoursNum <= 0) return { ok: true };
  const evE = evS + durationHoursNum * 60;
  let s = parseHmClock(slotStart);
  let e = parseHmClock(slotEnd);
  if (s == null || e == null) return { ok: false, message: 'Créneau DJ invalide (utilisez HH:mm).' };
  while (e < s) e += 24 * 60;
  if (s < evS) s += 24 * 60;
  if (e < s) e += 24 * 60;
  if (s >= evS && e <= evE && e > s) return { ok: true };
  return { ok: false, message: 'Un créneau DJ dépasse l\'horaire ou la durée de l\'événement.' };
}

/** Longueur max des messages de chat (anti-abus) */
const MAX_CHAT_MESSAGE_LENGTH = 5000;

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Derrière Railway/Cloudflare: utiliser X-Forwarded-*
app.set('trust proxy', 1);

// ✅ Sécurité: Helmet (headers HTTP sécurisés)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Désactivé pour éviter conflits avec les API
}));

// ✅ Sécurité: CORS restrictif en production
// ALLOWED_ORIGINS: comma-separated (ex: https://app.example.com,https://app.pages.dev)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : ['*'];
app.use(cors({
  origin: (origin, callback) => {
    if (allowedOrigins[0] === '*' || !origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS non autorisé'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ✅ Sécurité: Rate limiting général (500 req/15min par IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 500,
  message: { success: false, message: 'Trop de requêtes. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// ✅ Sécurité: Rate limiting strict sur auth (5 req/15min par IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ✅ Sécurité: Rate limiting strict sur admin bootstrap/seed (5 req/heure par IP)
const adminBootstrapLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de tentatives. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/admin/bootstrap', adminBootstrapLimiter);
app.use('/api/admin/seed-demo', adminBootstrapLimiter);

// Note: Stripe webhooks ont besoin du body brut pour vérifier la signature.
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/webhooks/stripe')) {
      req.rawBody = buf;
    }
  },
})); // Augmenter la limite pour les vidéos
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Healthcheck Railway
app.get('/api/health', (req, res) => {
  let emailConfigured = false;
  try {
    const { isConfigured, getProvider } = require('./utils/mailer');
    emailConfigured = isConfigured();
    const payload = { success: true, status: 'ok', emailConfigured };
    if (emailConfigured) payload.emailProvider = getProvider();
    res.json(payload);
  } catch {
    res.json({ success: true, status: 'ok', emailConfigured: false });
  }
});

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

// Configuration Multer pour l'upload de fichiers
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads', 'media');
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Générer un nom de fichier unique avec l'extension originale
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadLocal = multer({
  storage: diskStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    console.log('[MULTER] Fichier reçu:', { 
      originalname: file.originalname, 
      mimetype: file.mimetype,
      fieldname: file.fieldname 
    });
    
    // Accepter seulement les fichiers image, vidéo et audio
    const allowedMimes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
      // Vidéos
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'video/3gpp', 'video/3gpp2',
      // Audio
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg',
      'audio/mp4', 'audio/x-m4a', 'audio/3gpp'
    ];
    
    // Si le mimetype est dans la liste, accepter
    if (file.mimetype && allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    
    // Si le mimetype est vide ou inconnu, vérifier l'extension du fichier
    if (!file.mimetype || file.mimetype === 'application/octet-stream' || file.mimetype === '') {
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExtensions = [
        // Images
        '.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif',
        // Vidéos
        '.mp4', '.mov', '.avi', '.mpeg', '.3gp', '.3gpp',
        // Audio
        '.mp3', '.wav', '.aac', '.ogg', '.m4a'
      ];
      
      if (allowedExtensions.includes(ext)) {
        console.log('[MULTER] Fichier accepté par extension:', ext);
        cb(null, true);
        return;
      }
    }
    
    console.error('[MULTER] Type de fichier rejeté:', { 
      mimetype: file.mimetype, 
      originalname: file.originalname 
    });
    cb(new Error(`Type de fichier non autorisé: ${file.mimetype || 'inconnu'}. Seuls les fichiers image, vidéo et audio sont acceptés.`));
  },
});

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max
  },
  fileFilter: (req, file, cb) => {
    // même filtre que local
    const allowedMimes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence',
      'video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo',
      'video/3gpp', 'video/3gpp2',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/aac', 'audio/ogg', 'audio/x-m4a',
    ];
    if (allowedMimes.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Type de fichier non autorisé: ${file.mimetype}`));
  },
});

// Servir les fichiers statiques uniquement en mode local
if (MEDIA_STORAGE === 'local') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}
// Servir les fichiers uploadés de manière statique
// (déplacé plus haut: conditionnel selon MEDIA_STORAGE)

// Initialisation Prisma
const prisma = new PrismaClient();

// ============================================================================
// STRIPE
// ============================================================================
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' }) : null;

const eurosToCents = (eur) => {
  const n = Number(eur);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n * 100));
};

// Note: Les données sont maintenant stockées dans Prisma, plus besoin de tableaux en mémoire

// ============================================================================
// ROUTES MODULAIRES
// ============================================================================

/**
 * Routes d'authentification
 * - POST /api/auth/register - Inscription
 * - POST /api/auth/login - Connexion
 * - POST /api/auth/wallet/connect - Connexion wallet (mock)
 */
app.use('/api/auth', authRoutes);

/**
 * Routes utilisateur
 * - GET /api/user/profiles - Récupère les profils d'un utilisateur
 * - POST /api/user/switch-profile - Bascule le profil actif
 * - POST /api/user/change-password - Change le mot de passe
 * - GET /api/user/:userId - Récupère un utilisateur par ID
 */
/**
 * Upload photo/bannière profil Communauté (avant userRoutes pour éviter conflit avec :userId)
 */
app.post(
  '/api/user/community/profile/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const type = req.query.type || 'profile'; // 'profile' | 'banner'
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucune image fournie.' });
      }
      if (!req.file.mimetype.startsWith('image/')) {
        if (MEDIA_STORAGE === 'local' && req.file.filename) {
          const fp = path.join(__dirname, 'uploads', 'media', req.file.filename);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        return res.status(400).json({ success: false, message: 'Le fichier doit être une image.' });
      }
      const community = await prisma.userCommunity.findFirst({ where: { userId } });
      if (!community) {
        return res.status(404).json({ success: false, message: 'Profil Communauté non trouvé.' });
      }
      let imageUrl = null;
      if (MEDIA_STORAGE === 'r2') {
        try {
          const key = makeObjectKey(`community-${type}`, req.file.originalname);
          const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
          imageUrl = uploaded.url;
        } catch (r2Err) {
          const publicUrl = process.env.PUBLIC_URL;
          const baseUrl = publicUrl ? publicUrl.replace(/\/?$/, '') : `${req.protocol}://${req.get('host')}`;
          imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
        }
      } else {
        const publicUrl = process.env.PUBLIC_URL;
        const baseUrl = publicUrl ? publicUrl.replace(/\/?$/, '') : `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      }
      const updateData = type === 'banner' ? { bannerImage: imageUrl } : { profileImage: imageUrl };
      await prisma.userCommunity.update({
        where: { id: community.id },
        data: updateData,
      });
      res.json({ success: true, [type === 'banner' ? 'bannerImage' : 'profileImage']: imageUrl });
    } catch (err) {
      console.error('Erreur upload image Communauté:', err);
      res.status(500).json({ success: false, message: 'Erreur upload.' });
    }
  }
);

/**
 * Upload photo/bannière profil Venue (avant userRoutes)
 */
app.post(
  '/api/user/venue/profile/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const type = req.query.type || 'profile'; // 'profile' | 'banner'
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucune image fournie.' });
      }
      if (!req.file.mimetype.startsWith('image/')) {
        if (MEDIA_STORAGE === 'local' && req.file.filename) {
          const fp = path.join(__dirname, 'uploads', 'media', req.file.filename);
          if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
        return res.status(400).json({ success: false, message: 'Le fichier doit être une image.' });
      }
      const venue = await prisma.userVenue.findFirst({ where: { userId } });
      if (!venue) {
        return res.status(404).json({ success: false, message: 'Profil Lieu non trouvé.' });
      }
      let imageUrl = null;
      if (MEDIA_STORAGE === 'r2') {
        try {
          const key = makeObjectKey(`venue-${type}`, req.file.originalname);
          const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
          imageUrl = uploaded.url;
        } catch (r2Err) {
          const publicUrl = process.env.PUBLIC_URL;
          const baseUrl = publicUrl ? publicUrl.replace(/\/?$/, '') : `${req.protocol}://${req.get('host')}`;
          imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
        }
      } else {
        const publicUrl = process.env.PUBLIC_URL;
        const baseUrl = publicUrl ? publicUrl.replace(/\/?$/, '') : `${req.protocol}://${req.get('host')}`;
        imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      }
      const updateData = type === 'banner' ? { bannerImage: imageUrl } : { profileImage: imageUrl };
      await prisma.userVenue.update({
        where: { id: venue.id },
        data: updateData,
      });
      res.json({ success: true, [type === 'banner' ? 'bannerImage' : 'profileImage']: imageUrl });
    } catch (err) {
      console.error('Erreur upload image Venue:', err);
      res.status(500).json({ success: false, message: 'Erreur upload.' });
    }
  }
);

app.use('/api/user', userRoutes);

/**
 * Route wallet (gérée dans authRoutes)
 * - POST /api/wallet/connect - Connexion via wallet TON
 */
app.post('/api/wallet/connect', authController.connectWallet);

// ============================================================================
// ROUTES PROFILS (à refactoriser plus tard)
// ============================================================================

// Générer un numéro ISN unique séquentiel (format: ISN suivi de chiffres)
const generateISN = async () => {
  // Compter le nombre de profils Communauté existants
  const count = await prisma.userCommunity.count();
  // Générer le prochain numéro séquentiel (8 chiffres avec zéros devant)
  const nextNumber = (count + 1).toString().padStart(8, '0');
  return `ISN${nextNumber}`;
};

// Endpoint pour créer un profil Communauté
app.post('/api/profile/community', authenticateToken, async (req, res) => {
  try {
    const { pseudo, nom, prenom, email, password, pays, dateNaissance } = req.body ?? {};
    const userId = req.user.id; // Récupéré depuis le token JWT

    if (!nom || !prenom || !pays || !dateNaissance) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (nom, prenom, pays, dateNaissance).',
      });
    }

    // Validation du format de date (jj/mm/aaaa)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(dateNaissance.trim())) {
      return res.status(400).json({
        success: false,
        message: 'La date de naissance doit être au format jj/mm/aaaa.',
      });
    }

    // Vérifier que la date est valide
    const [, day, month, year] = dateNaissance.trim().match(dateRegex);
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        message: 'L\'année de naissance doit être entre 1900 et l\'année actuelle.',
      });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Le mois doit être entre 01 et 12.',
      });
    }

    if (dayNum < 1 || dayNum > 31) {
      return res.status(400).json({
        success: false,
        message: 'Le jour doit être entre 01 et 31.',
      });
    }

    // Vérifier que la date est valide (ex: pas le 31 février)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return res.status(400).json({
        success: false,
        message: 'La date de naissance n\'est pas valide.',
      });
    }

    // Vérifier que la personne a au moins 13 ans
    const today = new Date();
    const age = today.getFullYear() - yearNum;
    if (age < 13) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez avoir au moins 13 ans pour créer un compte.',
      });
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    // Générer un numéro ISN séquentiel
    const isnNumber = await generateISN();

    // Créer le profil Communauté (plusieurs profils possibles maintenant)
    const communityProfile = await prisma.userCommunity.create({
      data: {
        userId,
        nom: nom.trim(),
        prenom: prenom.trim(),
        pays: pays.trim(),
        dateNaissance: dateNaissance.trim(),
        isnNumber,
      },
    });

    // Mettre à jour le profil actif si c'est le premier profil ou si aucun profil n'est actif
    await prisma.user.update({
      where: { id: userId },
      data: { 
        accountType: 'COMMUNITY', // Garde pour compatibilité
        activeProfileType: user.activeProfileType || 'COMMUNITY', // Active ce profil si aucun n'est actif
      },
    });

    res.status(201).json({
      success: true,
      message: 'Profil Communauté créé avec succès.',
      profile: {
        id: communityProfile.id,
        nom: communityProfile.nom,
        prenom: communityProfile.prenom,
        pays: communityProfile.pays,
        dateNaissance: communityProfile.dateNaissance,
        isnNumber: communityProfile.isnNumber,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Communauté:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Communauté.',
    });
  }
});

// Endpoint pour créer un profil DJ
app.post('/api/profile/dj', authenticateToken, async (req, res) => {
  try {
    const { artistName, city, phone, birthDate } = req.body ?? {};
    const userId = req.user.id;

    if (!artistName || !city || !phone || !birthDate) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (artistName, city, phone, birthDate).',
      });
    }

    // Validation du format de date (jj/mm/aaaa)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    if (!dateRegex.test(birthDate.trim())) {
      return res.status(400).json({
        success: false,
        message: 'La date de naissance doit être au format jj/mm/aaaa.',
      });
    }

    // Vérifier que la date est valide
    const [, day, month, year] = birthDate.trim().match(dateRegex);
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (yearNum < 1900 || yearNum > new Date().getFullYear()) {
      return res.status(400).json({
        success: false,
        message: 'L\'année de naissance doit être entre 1900 et l\'année actuelle.',
      });
    }

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Le mois doit être entre 01 et 12.',
      });
    }

    if (dayNum < 1 || dayNum > 31) {
      return res.status(400).json({
        success: false,
        message: 'Le jour doit être entre 01 et 31.',
      });
    }

    // Vérifier que la date est valide (ex: pas le 31 février)
    const date = new Date(yearNum, monthNum - 1, dayNum);
    if (
      date.getFullYear() !== yearNum ||
      date.getMonth() !== monthNum - 1 ||
      date.getDate() !== dayNum
    ) {
      return res.status(400).json({
        success: false,
        message: 'La date de naissance n\'est pas valide.',
      });
    }

    // Vérifier que la personne a au moins 13 ans
    const today = new Date();
    const age = today.getFullYear() - yearNum;
    if (age < 13) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez avoir au moins 13 ans pour créer un compte.',
      });
    }

    // Valider que la ville existe (API Gouv France)
    if (city && city.trim()) {
      try {
        const cityResponse = await fetch(
          `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(city.trim())}&limit=1&fields=nom`
        );
        const cityData = await cityResponse.json();
        
        if (!cityData || !Array.isArray(cityData) || cityData.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'La ville saisie n\'existe pas. Veuillez sélectionner une ville valide depuis la liste.',
          });
        }
        
        // Vérifier que le nom correspond exactement (insensible à la casse)
        const foundCity = cityData.find(
          (c) => c.nom.toLowerCase() === city.trim().toLowerCase()
        );
        
        if (!foundCity) {
          return res.status(400).json({
            success: false,
            message: 'La ville saisie n\'existe pas. Veuillez sélectionner une ville valide depuis la liste.',
          });
        }
      } catch (cityError) {
        console.error('Erreur validation ville:', cityError);
        // En cas d'erreur API, on accepte quand même pour ne pas bloquer l'inscription
        // mais on pourrait aussi rejeter si on veut être strict
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const djData = {
      userId,
      artistName: artistName.trim(),
      city: city.trim(),
      phone: phone.trim(),
      birthDate: birthDate.trim(),
    };
    const { legalName, address, postalCode, country, siret, vatNumber } = req.body ?? {};
    if (legalName != null) djData.legalName = String(legalName).trim() || null;
    if (address != null) djData.address = String(address).trim() || null;
    if (postalCode != null) djData.postalCode = String(postalCode).trim() || null;
    if (country != null) djData.country = String(country).trim() || null;
    if (siret != null) djData.siret = String(siret).trim() || null;
    if (vatNumber != null) djData.vatNumber = String(vatNumber).trim() || null;

    const djProfile = await prisma.userDj.create({
      data: djData,
    });

    // Mettre à jour le profil actif si aucun n'est actif
    await prisma.user.update({
      where: { id: userId },
      data: { 
        accountType: 'DJ', // Garde pour compatibilité
        activeProfileType: user.activeProfileType || 'DJ', // Active ce profil si aucun n'est actif
      },
    });

    res.status(201).json({
      success: true,
      message: 'Profil DJ créé avec succès.',
      profile: {
        id: djProfile.id,
        artistName: djProfile.artistName,
        city: djProfile.city,
        phone: djProfile.phone,
        birthDate: djProfile.birthDate,
      },
    });
  } catch (error) {
    console.error('Erreur création profil DJ:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil DJ.',
    });
  }
});

// Endpoint pour créer un profil Booker
app.post('/api/profile/booker', authenticateToken, async (req, res) => {
  try {
    const { nom, prenom, phonePro, bookerType, pseudo, companyName, address, postalCode, city, country, siret } = req.body ?? {};
    const userId = req.user.id;

    if (!nom || !prenom || !phonePro || !bookerType) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (nom, prenom, phonePro, bookerType).',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const bookerData = {
      userId,
      nom: nom.trim(),
      prenom: prenom.trim(),
      phonePro: phonePro.trim(),
      bookerType: bookerType.trim(),
      pseudo: pseudo && String(pseudo).trim() ? String(pseudo).trim() : null,
    };
    if (companyName != null) bookerData.companyName = String(companyName).trim() || null;
    if (address != null) bookerData.address = String(address).trim() || null;
    if (postalCode != null) bookerData.postalCode = String(postalCode).trim() || null;
    if (city != null) bookerData.city = String(city).trim() || null;
    if (country != null) bookerData.country = String(country).trim() || null;
    if (siret != null) bookerData.siret = String(siret).trim() || null;

    const bookerProfile = await prisma.userBooker.create({
      data: bookerData,
    });

    // Mettre à jour le profil actif - forcer BOOKER après création
    // On active toujours BOOKER après la création d'un profil booker
    await prisma.user.update({
      where: { id: userId },
      data: { 
        accountType: 'BOOKER', // Garde pour compatibilité
        activeProfileType: 'BOOKER', // Activer automatiquement le profil BOOKER
      },
    });

    res.status(201).json({
      success: true,
      message: 'Profil Organisateur créé avec succès.',
      profile: {
        id: bookerProfile.id,
        nom: bookerProfile.nom,
        prenom: bookerProfile.prenom,
        phonePro: bookerProfile.phonePro,
        bookerType: bookerProfile.bookerType,
        pseudo: bookerProfile.pseudo,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Booker:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Booker.',
    });
  }
});

/**
 * ✅ AJOUT: Mettre à jour le profil Booker
 * @route PUT /api/booker/profile
 */
app.put('/api/booker/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nom, prenom, phonePro, bookerType, pseudo, companyName, address, postalCode, city, country, siret } = req.body;

    // Validation
    if (!nom || !prenom || !phonePro || !bookerType) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (nom, prenom, phonePro, bookerType).',
      });
    }

    const bookerProfile = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!bookerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    const updateData = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      phonePro: phonePro.trim(),
      bookerType: bookerType.trim(),
    };
    if (pseudo !== undefined) updateData.pseudo = pseudo && String(pseudo).trim() ? String(pseudo).trim() : null;
    // Infos légales : modifiables une seule fois, uniquement quand elles sont vides
    const legalFields = ['companyName', 'address', 'postalCode', 'city', 'country', 'siret'];
    const legalValues = { companyName, address, postalCode, city, country, siret };
    for (const field of legalFields) {
      const incoming = legalValues[field];
      const current = bookerProfile[field];
      const isEmpty = current == null || String(current).trim() === '';
      if (incoming !== undefined && isEmpty) {
        updateData[field] = incoming != null && String(incoming).trim() ? String(incoming).trim() : null;
      }
    }

    const filteredUpdate = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== undefined));

    const updatedBooker = await prisma.userBooker.update({
      where: { id: bookerProfile.id },
      data: filteredUpdate,
    });

    res.json({
      success: true,
      message: 'Profil Booker mis à jour avec succès.',
      profile: {
        id: updatedBooker.id,
        nom: updatedBooker.nom,
        prenom: updatedBooker.prenom,
        phonePro: updatedBooker.phonePro,
        bookerType: updatedBooker.bookerType,
        pseudo: updatedBooker.pseudo,
        profileImage: updatedBooker.profileImage,
        companyName: updatedBooker.companyName,
        address: updatedBooker.address,
        postalCode: updatedBooker.postalCode,
        city: updatedBooker.city,
        country: updatedBooker.country,
        siret: updatedBooker.siret,
      },
    });
  } catch (error) {
    console.error('Erreur mise à jour profil Booker:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil Booker.',
    });
  }
});

/**
 * ✅ AJOUT: Uploader la photo de profil d'un Booker
 * @route POST /api/booker/profile/upload-image
 */
app.post(
  '/api/booker/profile/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Aucune image fournie.',
        });
      }

      if (!req.file.mimetype.startsWith('image/')) {
        if (MEDIA_STORAGE === 'local' && req.file.filename) {
          const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({
          success: false,
          message: 'Le fichier doit être une image.',
        });
      }

      // Récupérer le profil booker
      const bookerProfile = await prisma.userBooker.findFirst({
        where: { userId },
      });

      if (!bookerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Profil Booker non trouvé.',
        });
      }

      let imageUrl = null;
      if (MEDIA_STORAGE === 'r2') {
        try {
          const key = makeObjectKey('booker-profile', req.file.originalname);
          const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
          imageUrl = uploaded.url;
        } catch (r2Error) {
          console.error('[uploadBookerProfileImage] Erreur R2, fallback vers local:', r2Error.message);
          const publicUrl = process.env.PUBLIC_URL;
          const origin = req.get('origin') || req.get('referer');
          const baseUrl = publicUrl
            ? publicUrl.replace(/\/?$/, '')
            : (origin ? origin.replace(/\/?$/, '') : `${req.protocol}://${req.get('host')}`);
          imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
        }
      } else {
        const publicUrl = process.env.PUBLIC_URL;
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = publicUrl
          ? publicUrl.replace(/\/?$/, '')
          : (origin ? origin.replace(/\/?$/, '') : `${req.protocol}://${req.get('host')}`);
        imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      }

      // Supprimer l'ancienne photo de profil si elle existe (R2)
      if (bookerProfile.profileImage && MEDIA_STORAGE === 'r2') {
        try {
          const { keyFromPublicUrl } = require('./utils/mediaStorage');
          const oldKey = keyFromPublicUrl(bookerProfile.profileImage);
          if (oldKey) {
            await deleteFromR2({ key: oldKey, url: bookerProfile.profileImage });
          }
        } catch (e) {
          // best-effort
        }
      } else if (bookerProfile.profileImage && bookerProfile.profileImage.includes('/uploads/media/')) {
        // Supprimer l'ancienne photo (local)
        const oldFilePath = path.join(__dirname, 'uploads', 'media', path.basename(bookerProfile.profileImage));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      // Mettre à jour le profil avec la nouvelle photo
      const updatedBooker = await prisma.userBooker.update({
        where: { id: bookerProfile.id },
        data: { profileImage: imageUrl },
      });

      res.json({
        success: true,
        message: 'Photo de profil mise à jour avec succès.',
        profileImage: imageUrl,
      });
    } catch (error) {
      console.error('Erreur upload photo de profil Booker:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'upload de la photo de profil.',
      });
    }
  }
);

// Endpoint pour créer un profil Venue (Lieu)
app.post('/api/profile/venue', authenticateToken, async (req, res) => {
  try {
    const { venueName, address, companyName, legalRepresentative, postalCode, city, country, siret } = req.body ?? {};
    const userId = req.user.id;

    if (!venueName || !address) {
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis (venueName, address).',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const venueData = {
      userId,
      venueName: venueName.trim(),
      address: address.trim(),
    };
    if (companyName != null) venueData.companyName = String(companyName).trim() || null;
    if (legalRepresentative != null) venueData.legalRepresentative = String(legalRepresentative).trim() || null;
    if (postalCode != null) venueData.postalCode = String(postalCode).trim() || null;
    if (city != null) venueData.city = String(city).trim() || null;
    if (country != null) venueData.country = String(country).trim() || null;
    if (siret != null) venueData.siret = String(siret).trim() || null;

    const venueProfile = await prisma.userVenue.create({
      data: venueData,
    });

    // Mettre à jour le profil actif si aucun n'est actif
    await prisma.user.update({
      where: { id: userId },
      data: { 
        accountType: 'VENUE', // Garde pour compatibilité
        activeProfileType: user.activeProfileType || 'VENUE', // Active ce profil si aucun n'est actif
      },
    });

    res.status(201).json({
      success: true,
      message: 'Profil Lieu créé avec succès.',
      profile: {
        id: venueProfile.id,
        venueName: venueProfile.venueName,
        address: venueProfile.address,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Lieu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Lieu.',
    });
  }
});

// Fonction pour mettre à jour automatiquement les statuts des événements
async function updateEventStatuses() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Mettre à jour les événements terminés
    await prisma.event.updateMany({
      where: {
        date: { lt: oneHourAgo },
        status: { not: 'FINISHED' },
      },
      data: { status: 'FINISHED' },
    });

    // Mettre à jour les événements en cours
    await prisma.event.updateMany({
      where: {
        date: { gte: oneHourAgo, lte: oneHourLater },
        status: { not: 'ONGOING' },
      },
      data: { status: 'ONGOING' },
    });

    // Mettre à jour les événements à venir
    await prisma.event.updateMany({
      where: {
        date: { gt: oneHourLater },
        status: { not: 'UPCOMING' },
      },
      data: { status: 'UPCOMING' },
    });
  } catch (error) {
    console.error('Erreur mise à jour statuts événements:', error);
  }
}

app.get('/api/events', async (req, res) => {
  try {
    const dbEvents = await prisma.event.findMany({
      include: {
        venue: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        eventDjs: {
          include: {
            // djId pointe vers User.id, donc on inclut le User
            // et on récupérera le UserDj séparément
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Récupérer tous les UserDj pour les DJs des événements
    const allDjIds = [...new Set(dbEvents.flatMap(e => e.eventDjs.map(ed => ed.djId)))];
    const userDjs = await prisma.userDj.findMany({
      where: { userId: { in: allDjIds } },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    const djMap = new Map(userDjs.map(udj => [udj.userId, udj]));

    // Formater les événements pour correspondre au format attendu par le frontend
    const formattedEvents = dbEvents.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      location: event.location,
      price: event.price,
      capacity: event.capacity,
      sold: event.sold,
      genre: event.genre,
      image: event.image,
      description: event.description,
      status: event.status || 'UPCOMING', // Statut de l'événement (UPCOMING, ONGOING, FINISHED)
      djs: event.eventDjs.map((ed) => {
        // Récupérer le nom du DJ depuis UserDj
        const userDj = djMap.get(ed.djId);
        const djName = userDj?.artistName || userDj?.user?.username || `DJ ${ed.djId.slice(0, 8)}`;
        return djName;
      }),
      djIds: event.eventDjs.map((ed) => ed.djId), // IDs des DJs (User.id) pour la notation
      venueId: event.venueId, 
      venueName: event.venue?.venueName,
    }));

    res.json({ success: true, events: formattedEvents });
  } catch (error) {
    console.error('Erreur récupération événements:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Groupes d'événements (amis qui vont ensemble) - AVANT /api/events/:eventId
app.post('/api/events/:eventId/groups', authenticateToken, userController.createEventGroup);
app.get('/api/events/:eventId/groups', authenticateToken, userController.getEventGroups);
app.post('/api/events/:eventId/groups/:groupId/invite', authenticateToken, userController.inviteToEventGroup);
app.put('/api/event-groups/:groupId/respond', authenticateToken, userController.respondToEventGroupInvitation);

app.get('/api/events/:eventId', async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.eventId },
      include: {
        venue: true,
        booker: { select: { id: true, userId: true, pseudo: true, nom: true, prenom: true } },
        eventDjs: true,
        eventVenues: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    const activeEventDjs = (event.eventDjs || []).filter((ed) => ed.status === 'ACCEPTED' || ed.status === 'PENDING');
    const activeEventVenues = (event.eventVenues || []).filter((ev) => ev.status === 'ACCEPTED' || ev.status === 'PENDING');
    const activeVenue = activeEventVenues[0] ? (await prisma.eventVenue.findUnique({
      where: { id: activeEventVenues[0].id },
      include: { venue: { select: { id: true, venueName: true, address: true } } },
    })) : null;

    const djIds = activeEventDjs.map((ed) => ed.djId);
    const userDjs = djIds.length > 0 ? await prisma.userDj.findMany({
      where: { userId: { in: djIds } },
      select: { userId: true, id: true, artistName: true },
    }) : [];
    const djMap = new Map(userDjs.map((udj) => [udj.userId, udj]));

    const formattedEvent = {
      id: event.id,
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      time: event.time,
      location: event.location,
      price: event.price,
      capacity: event.capacity,
      sold: event.sold,
      genre: event.genre,
      image: event.image,
      description: event.description,
      status: event.status || 'UPCOMING',
      djs: activeEventDjs.map((ed) => {
        const userDj = djMap.get(ed.djId);
        const artistName = userDj?.artistName || `DJ ${ed.djId.slice(0, 8)}`;
        return { userId: ed.djId, djId: userDj?.id, artistName };
      }),
      djIds: activeEventDjs.map((ed) => ed.djId),
      booker: event.booker ? {
        id: event.booker.id,
        name: event.booker.pseudo?.trim() || `${event.booker.prenom || ''} ${event.booker.nom || ''}`.trim() || 'Organisateur',
      } : null,
      venue: activeVenue?.venue ? {
        id: activeVenue.venue.id,
        venueName: activeVenue.venue.venueName,
      } : (event.venue ? { id: event.venue.id, venueName: event.venue.venueName } : null),
      venueId: activeVenue?.venueId ?? event.venueId,
      venueName: activeVenue?.venue?.venueName ?? event.venue?.venueName,
    };

    res.json({ success: true, event: formattedEvent });
  } catch (error) {
    console.error('Erreur récupération événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/tickets/buy', authenticateToken, async (req, res) => {
  try {
    const { eventId, quantity: quantityRaw = 1 } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'eventId est requis.',
      });
    }
    const qtyCheck = parseTicketQuantity(quantityRaw);
    if (!qtyCheck.valid) {
      return res.status(400).json({ success: false, message: qtyCheck.message });
    }
    const quantity = qtyCheck.quantity;

    // Vérifier que l'utilisateur a un profil Community actif
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { communities: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (user.activeProfileType !== 'COMMUNITY') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les profils Community peuvent acheter des tickets. Veuillez basculer sur votre profil Community.',
      });
    }

    // Vérifier qu'il a au moins un profil Community
    if (!user.communities || user.communities.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez avoir un profil Community pour acheter des tickets. Créez-en un depuis votre profil.',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Vérifier que l'événement est à venir (on ne peut acheter que pour les événements à venir)
    if (event.status !== 'UPCOMING') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez acheter un ticket que pour un événement à venir.',
      });
    }

    if (event.sold + quantity > event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Pas assez de places disponibles',
      });
    }

    const newTickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.ticket.create({
        data: {
          userId,
          eventId,
          price: event.price,
          status: 'valid',
          qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
        },
      });
      newTickets.push({
        id: ticket.id,
        userId: ticket.userId,
        eventId: ticket.eventId,
        price: ticket.price,
        status: ticket.status,
        qrCode: ticket.qrCode,
        purchaseDate: ticket.purchaseDate.toISOString(),
      });
    }

    // Mettre à jour le nombre de tickets vendus
    await prisma.event.update({
      where: { id: eventId },
      data: { sold: event.sold + quantity },
    });

    // Mettre à jour le score de l'utilisateur
    const newScore = (user.score || 0) + 50 * quantity;
    const newLevel = Math.floor(newScore / 200) + 1;

    await prisma.user.update({
      where: { id: userId },
      data: {
        score: newScore,
        level: newLevel,
      },
    });

    res.json({
      success: true,
      message: `🎟️ ${quantity} ticket(s) acheté(s) avec succès`,
      tickets: newTickets,
      updatedUser: {
        score: newScore,
        level: newLevel,
      },
    });
  } catch (error) {
    console.error('Erreur achat ticket:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// STRIPE PAIEMENT -> TICKETS
// ============================================================================

/**
 * Stripe Webhook (source de vérité en prod)
 * - Vérifie la signature
 * - Met à jour Payment.status
 * - Peut délivrer les tickets même si l'app se ferme après le paiement
 */
app.post('/api/webhooks/stripe', async (req, res) => {
  try {
    if (!stripe || !stripeSecretKey) {
      return res.status(500).send('Stripe n’est pas configuré côté serveur.');
    }
    if (!stripeWebhookSecret) {
      return res.status(500).send('STRIPE_WEBHOOK_SECRET manquante côté serveur.');
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).send('Header stripe-signature manquant.');
    }
    if (!req.rawBody) {
      return res.status(400).send('rawBody manquant (configuration Express).');
    }

    const stripeEvent = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret);

    // On gère un sous-ensemble des events utiles à notre flow
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const intent = stripeEvent.data.object;
      const paymentIntentId = intent.id;

      const payment = await prisma.payment.findUnique({ where: { paymentIntentId } });
      if (!payment) {
        console.warn('[STRIPE WEBHOOK] Payment introuvable pour intent:', paymentIntentId);
        return res.json({ received: true });
      }
      if (payment.status === 'fulfilled') {
        return res.json({ received: true });
      }

      // Revalidation de base
      if (typeof intent.amount === 'number' && intent.amount !== payment.amount) {
        console.warn('[STRIPE WEBHOOK] amount mismatch', { paymentIntentId, intentAmount: intent.amount, paymentAmount: payment.amount });
        await prisma.payment.update({ where: { paymentIntentId }, data: { status: 'failed' } });
        return res.json({ received: true });
      }
      if (intent.currency && intent.currency.toLowerCase() !== payment.currency.toLowerCase()) {
        console.warn('[STRIPE WEBHOOK] currency mismatch', { paymentIntentId, intentCurrency: intent.currency, paymentCurrency: payment.currency });
        await prisma.payment.update({ where: { paymentIntentId }, data: { status: 'failed' } });
        return res.json({ received: true });
      }

      // Délivrance idempotente côté serveur
      await prisma.$transaction(async (tx) => {
        const freshPayment = await tx.payment.findUnique({
          where: { paymentIntentId },
          include: { tickets: true },
        });
        if (!freshPayment) return;
        if (freshPayment.status === 'fulfilled') return;

        const event = await tx.event.findUnique({ where: { id: freshPayment.eventId } });
        if (!event) throw new Error('Événement non trouvé');
        if (event.status !== 'UPCOMING') throw new Error('Événement non éligible (pas UPCOMING)');
        if (event.sold + freshPayment.quantity > event.capacity) throw new Error('Pas assez de places disponibles');

        // Status trace (optionnel)
        await tx.payment.update({ where: { paymentIntentId }, data: { status: 'succeeded' } });

        for (let i = 0; i < freshPayment.quantity; i++) {
          await tx.ticket.create({
            data: {
              userId: freshPayment.userId,
              eventId: freshPayment.eventId,
              paymentIntentId,
              price: event.price,
              status: 'valid',
              qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
            },
          });
        }

        await tx.event.update({
          where: { id: freshPayment.eventId },
          data: { sold: { increment: freshPayment.quantity } },
        });

        const user = await tx.user.findUnique({ where: { id: freshPayment.userId } });
        const newScore = (user?.score || 0) + 50 * freshPayment.quantity;
        const newLevel = Math.floor(newScore / 200) + 1;
        await tx.user.update({
          where: { id: freshPayment.userId },
          data: { score: newScore, level: newLevel },
        });

        await tx.payment.update({ where: { paymentIntentId }, data: { status: 'fulfilled' } });
      });
    } else if (stripeEvent.type === 'payment_intent.payment_failed' || stripeEvent.type === 'payment_intent.canceled') {
      const intent = stripeEvent.data.object;
      const paymentIntentId = intent.id;
      const payment = await prisma.payment.findUnique({ where: { paymentIntentId } });
      if (payment && payment.status !== 'fulfilled') {
        await prisma.payment.update({ where: { paymentIntentId }, data: { status: 'failed' } });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Error:', err?.message || err);
    // Stripe attend un 2xx pour considérer l'event comme traité. Ici, on renvoie 400/500 pour déclencher un retry.
    return res.status(400).send(`Webhook Error: ${err?.message || 'unknown'}`);
  }
});

/**
 * Crée un PaymentIntent Stripe pour l'achat de tickets.
 * ✅ Requiert un profil COMMUNITY actif (même règle que /api/tickets/buy)
 */
app.post('/api/payments/create-ticket-intent', authenticateToken, async (req, res) => {
  try {
    if (!stripe || !stripeSecretKey) {
      return res.status(500).json({ success: false, message: 'Stripe n’est pas configuré côté serveur.' });
    }
    if (!stripePublishableKey) {
      return res.status(500).json({ success: false, message: 'STRIPE_PUBLISHABLE_KEY manquante côté serveur.' });
    }

    const { eventId, quantity: quantityRaw = 1 } = req.body ?? {};
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId est requis.' });
    }
    const qtyCheck = parseTicketQuantity(quantityRaw);
    if (!qtyCheck.valid) {
      return res.status(400).json({ success: false, message: qtyCheck.message });
    }
    const quantity = qtyCheck.quantity;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { communities: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.activeProfileType !== 'COMMUNITY') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les profils Community peuvent acheter des tickets. Veuillez basculer sur votre profil Community.',
      });
    }
    if (!user.communities || user.communities.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez avoir un profil Community pour acheter des tickets. Créez-en un depuis votre profil.',
      });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    if (event.status !== 'UPCOMING') {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez acheter un ticket que pour un événement à venir.' });
    }
    if (event.sold + quantity > event.capacity) {
      return res.status(400).json({ success: false, message: 'Pas assez de places disponibles' });
    }

    const unitAmount = eurosToCents(event.price);
    if (unitAmount === null) return res.status(500).json({ success: false, message: 'Prix événement invalide.' });
    const amount = unitAmount * quantity;
    if (amount < 50) return res.status(400).json({ success: false, message: 'Montant trop faible pour Stripe.' });

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: { userId, eventId, quantity: String(quantity) },
    });

    await prisma.payment.create({
      data: {
        userId,
        eventId,
        paymentIntentId: intent.id,
        amount,
        currency: 'eur',
        quantity,
        status: 'created',
      },
    });

    res.json({
      success: true,
      publishableKey: stripePublishableKey,
      paymentIntentClientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      currency: 'eur',
    });
  } catch (error) {
    console.error('Erreur création PaymentIntent:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Confirme côté serveur et délivre les tickets après paiement Stripe.
 * Idempotent via Payment(paymentIntentId unique) + status fulfilled.
 */
app.post('/api/payments/confirm-ticket-purchase', authenticateToken, async (req, res) => {
  try {
    if (!stripe || !stripeSecretKey) {
      return res.status(500).json({ success: false, message: 'Stripe n’est pas configuré côté serveur.' });
    }

    const { paymentIntentId } = req.body ?? {};
    const userId = req.user.id;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId est requis.' });
    }

    const httpError = (statusCode, message) => {
      const err = new Error(message);
      err.statusCode = statusCode;
      return err;
    };

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { paymentIntentId },
        include: { tickets: true },
      });

      if (!payment) throw httpError(404, 'Paiement introuvable.');
      if (payment.userId !== userId) throw httpError(403, 'Paiement non autorisé.');

      // ✅ Idempotence: si déjà délivré, renvoyer les tickets associés à ce paiement
      if (payment.status === 'fulfilled') {
        const existingTickets = (payment.tickets || []).map((t) => ({
          id: t.id,
          userId: t.userId,
          eventId: t.eventId,
          price: t.price,
          status: t.status,
          qrCode: t.qrCode,
          purchaseDate: t.purchaseDate.toISOString(),
        }));
        return { alreadyFulfilled: true, payment, tickets: existingTickets };
      }

      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Si le paiement n'est pas "succeeded", on n'émet aucun ticket.
      if (intent.status !== 'succeeded') {
        await tx.payment.update({
          where: { paymentIntentId },
          data: { status: intent.status === 'canceled' ? 'failed' : 'created' },
        });
        throw httpError(400, `Paiement non validé (status: ${intent.status}).`);
      }

      // 🔒 Revalidation: correspondance metadata / montant / devise
      if (intent.metadata?.userId && intent.metadata.userId !== userId) {
        throw httpError(403, 'Paiement invalide (user mismatch).');
      }
      if (intent.metadata?.eventId && intent.metadata.eventId !== payment.eventId) {
        throw httpError(400, 'Paiement invalide (event mismatch).');
      }
      if (intent.metadata?.quantity && Number(intent.metadata.quantity) !== payment.quantity) {
        throw httpError(400, 'Paiement invalide (quantity mismatch).');
      }
      if (typeof intent.amount === 'number' && intent.amount !== payment.amount) {
        throw httpError(400, 'Paiement invalide (amount mismatch).');
      }
      if (intent.currency && intent.currency.toLowerCase() !== payment.currency.toLowerCase()) {
        throw httpError(400, 'Paiement invalide (currency mismatch).');
      }

      const event = await tx.event.findUnique({ where: { id: payment.eventId } });
      if (!event) throw httpError(404, 'Événement non trouvé');
      if (event.status !== 'UPCOMING') {
        throw httpError(400, 'Vous ne pouvez acheter un ticket que pour un événement à venir.');
      }
      if (event.sold + payment.quantity > event.capacity) {
        throw httpError(400, 'Pas assez de places disponibles');
      }

      // Marquer "succeeded" côté DB (trace) avant délivrance
      await tx.payment.update({ where: { paymentIntentId }, data: { status: 'succeeded' } });

      const newTickets = [];
      for (let i = 0; i < payment.quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            userId,
            eventId: payment.eventId,
            paymentIntentId,
            price: event.price,
            status: 'valid',
            qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
          },
        });
        newTickets.push({
          id: ticket.id,
          userId: ticket.userId,
          eventId: ticket.eventId,
          price: ticket.price,
          status: ticket.status,
          qrCode: ticket.qrCode,
          purchaseDate: ticket.purchaseDate.toISOString(),
        });
      }

      // ✅ Incrément atomique (évite les écritures "stale")
      await tx.event.update({
        where: { id: payment.eventId },
        data: { sold: { increment: payment.quantity } },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });
      const newScore = (user?.score || 0) + 50 * payment.quantity;
      const newLevel = Math.floor(newScore / 200) + 1;
      await tx.user.update({
        where: { id: userId },
        data: { score: newScore, level: newLevel },
      });

      await tx.payment.update({ where: { paymentIntentId }, data: { status: 'fulfilled' } });

      return { alreadyFulfilled: false, payment, tickets: newTickets, updatedUser: { score: newScore, level: newLevel } };
    });

    return res.json({
      success: true,
      message: result.alreadyFulfilled ? 'Déjà traité.' : `🎟️ ${result.payment.quantity} ticket(s) acheté(s) avec succès`,
      tickets: result.tickets,
      updatedUser: result.updatedUser,
      paymentIntentId,
    });
  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error?.message || 'Erreur serveur' });
  }
});

/**
 * Liste des paiements de l'utilisateur connecté (Mes achats)
 * @route GET /api/payments/me
 * @access Private (auth)
 */
app.get('/api/payments/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      paymentIntentId: p.paymentIntentId,
      status: p.status,
      amount: p.amount, // centimes
      currency: p.currency,
      quantity: p.quantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      event: p.event
        ? {
            id: p.event.id,
            title: p.event.title,
            date: p.event.date instanceof Date ? p.event.date.toISOString() : p.event.date,
            time: p.event.time,
            location: p.event.location,
            status: p.event.status,
          }
        : null,
    }));

    res.json({ success: true, payments: formatted });
  } catch (error) {
    console.error('Erreur récupération paiements (me):', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ✅ Version sécurisée: récupérer les tickets de l'utilisateur connecté
app.get('/api/user/me/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userTickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            eventDjs: true,
            venue: {
              select: {
                id: true,
                venueName: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    const formattedTickets = userTickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      eventId: ticket.eventId,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.date.toISOString().split('T')[0],
      eventTime: ticket.event.time,
      eventLocation: ticket.event.location,
      eventGenre: ticket.event.genre,
      eventStatus: ticket.event.status || 'UPCOMING',
      djIds: ticket.event.eventDjs.map((ed) => ed.djId),
      venueId: ticket.event.venueId,
      venueName: ticket.event.venue?.venueName,
      price: ticket.price,
      status: ticket.status,
      qrCode: ticket.qrCode,
      purchaseDate: ticket.purchaseDate.toISOString(),
    }));

    res.json({ success: true, tickets: formattedTickets });
  } catch (error) {
    console.error('Erreur récupération tickets (me):', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// 🔒 Sécurisé: récupérer les tickets d'un userId (uniquement si c'est l'utilisateur connecté)
// (Conserver cette route pour compat, mais ne plus l'exposer publiquement.)
app.get('/api/user/:userId/tickets', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.id || req.user.id !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const userTickets = await prisma.ticket.findMany({
      where: { userId: req.params.userId },
      include: {
        event: {
          include: {
            eventDjs: true,
            venue: {
              select: {
                id: true,
                venueName: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    const formattedTickets = userTickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      eventId: ticket.eventId,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.date.toISOString().split('T')[0],
      eventTime: ticket.event.time,
      eventLocation: ticket.event.location,
      eventGenre: ticket.event.genre,
      eventStatus: ticket.event.status || 'UPCOMING', // Statut de l'événement
      djIds: ticket.event.eventDjs.map((ed) => ed.djId), // IDs des DJs (User.id) pour la notation
      venueId: ticket.event.venueId,
      venueName: ticket.event.venue?.venueName,
      price: ticket.price,
      status: ticket.status,
      qrCode: ticket.qrCode,
      purchaseDate: ticket.purchaseDate.toISOString(),
    }));

    res.json({ success: true, tickets: formattedTickets });
  } catch (error) {
    console.error('Erreur récupération tickets:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// Fonction helper pour calculer les moyennes d'un DJ
const calculateDjRatings = async (djId) => {
  const ratings = await prisma.djRating.findMany({
    where: { djId },
  });

  const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
  const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
  const venueRatings = ratings.filter((r) => r.raterType === 'VENUE');

  const avgCommunity =
    communityRatings.length > 0
      ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
      : 0;
  const avgBooker =
    bookerRatings.length > 0
      ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
      : 0;
  const avgVenue =
    venueRatings.length > 0
      ? venueRatings.reduce((sum, r) => sum + r.rating, 0) / venueRatings.length
      : 0;

  const avgGlobal =
    ratings.length > 0 ? (avgCommunity + avgBooker + avgVenue) / 3 : 0;

  await prisma.userDj.update({
    where: { id: djId },
    data: {
      averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
      averageRatingBooker: Math.round(avgBooker * 10) / 10,
      averageRatingVenue: Math.round(avgVenue * 10) / 10,
      averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
      totalRatingsCommunity: communityRatings.length,
      totalRatingsBooker: bookerRatings.length,
      totalRatingsVenue: venueRatings.length,
    },
  });
};

// Fonction helper pour calculer les moyennes d'un lieu
const calculateVenueRatings = async (venueId) => {
  const ratings = await prisma.venueRating.findMany({
    where: { venueId },
  });

  const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
  const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
  const djRatings = ratings.filter((r) => r.raterType === 'DJ');

  const avgCommunity =
    communityRatings.length > 0
      ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
      : 0;
  const avgBooker =
    bookerRatings.length > 0
      ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
      : 0;
  const avgDj =
    djRatings.length > 0
      ? djRatings.reduce((sum, r) => sum + r.rating, 0) / djRatings.length
      : 0;

  const avgGlobal =
    ratings.length > 0 ? (avgCommunity + avgBooker + avgDj) / 3 : 0;

  await prisma.userVenue.update({
    where: { id: venueId },
    data: {
      averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
      averageRatingBooker: Math.round(avgBooker * 10) / 10,
      averageRatingDj: Math.round(avgDj * 10) / 10,
      averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
      totalRatingsCommunity: communityRatings.length,
      totalRatingsBooker: bookerRatings.length,
      totalRatingsDj: djRatings.length,
    },
  });
};

// Endpoint pour noter un DJ
app.post('/api/ratings/dj', authenticateToken, async (req, res) => {
  try {
    const { djUserId, eventId, rating, comment } = req.body ?? {};
    const raterId = req.user.id;

    // Validation
    if (!djUserId || !eventId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'djUserId, eventId et rating sont requis.',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5.',
      });
    }

    // Vérifier que le DJ existe (djUserId est le User.id)
    console.log('[RATING DJ] Recherche UserDj avec userId:', djUserId);
    const dj = await prisma.userDj.findUnique({
      where: { userId: djUserId },
      include: { user: true },
    });

    if (!dj) {
      console.log('[RATING DJ] UserDj non trouvé pour userId:', djUserId);
      // Essayer de trouver tous les UserDj pour debug
      const allDjs = await prisma.userDj.findMany({
        select: { userId: true, artistName: true },
        take: 5,
      });
      console.log('[RATING DJ] UserDjs disponibles (échantillon):', allDjs);
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }
    
    console.log('[RATING DJ] UserDj trouvé:', dj.id, dj.artistName);

    const djId = dj.id; // UserDj.id pour la suite

    // Vérifier que l'événement existe et est passé
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        eventDjs: true,
        venue: true,
        booker: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }

    // Vérifier que l'événement est terminé (on ne peut noter que les événements terminés)
    if (event.status !== 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez noter qu\'un événement terminé.',
      });
    }

    // Vérifier que le DJ a joué à cet événement
    const djPlayed = event.eventDjs.some((ed) => ed.djId === dj.userId);
    if (!djPlayed) {
      return res.status(400).json({
        success: false,
        message: 'Ce DJ n\'a pas joué à cet événement.',
      });
    }

    // Récupérer le type de compte de l'utilisateur qui note
    const rater = await prisma.user.findUnique({
      where: { id: raterId },
      include: {
        community: true,
        booker: true,
        venue: true,
        dj: true,
      },
    });

    if (!rater) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    let raterType = null;
    let ticketId = null;

    // Validation selon le type de compte
    if (rater.accountType === 'COMMUNITY' && rater.community) {
      raterType = 'COMMUNITY';
      // Vérifier qu'il a un ticket valide pour cet événement
      const ticket = await prisma.ticket.findFirst({
        where: {
          userId: raterId,
          eventId: eventId,
          status: 'valid',
        },
      });

      if (!ticket) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir un ticket valide pour cet événement pour noter.',
        });
      }

      // Le ticket existe et l'événement est FINISHED, donc le ticket a été acheté quand l'événement était UPCOMING
      ticketId = ticket.id;
    } else if (rater.accountType === 'BOOKER' && rater.booker) {
      raterType = 'BOOKER';
      // Vérifier qu'il a organisé cet événement (bookerId pointe vers UserBooker.id)
      if (event.bookerId !== rater.booker.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir organisé cet événement pour noter.',
        });
      }
    } else if (rater.accountType === 'VENUE' && rater.venue) {
      raterType = 'VENUE';
      // Vérifier qu'il a hébergé cet événement
      if (event.venueId !== rater.venue.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir hébergé cet événement pour noter.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Type de compte non autorisé à noter.',
      });
    }

    // Vérifier s'il a déjà noté ce DJ pour cet événement
    const existingRating = await prisma.djRating.findUnique({
      where: {
        djId_raterId_eventId: {
          djId,
          raterId,
          eventId,
        },
      },
    });

    if (existingRating) {
      // Mettre à jour la note existante
      await prisma.djRating.update({
        where: { id: existingRating.id },
        data: {
          rating: rating,
          comment: comment || null,
        },
      });
    } else {
      // Créer une nouvelle note
      await prisma.djRating.create({
        data: {
          djId,
          raterId,
          raterType,
          rating: rating,
          comment: comment || null,
          eventId,
          ticketId: ticketId || null,
        },
      });
    }

    // Recalculer les moyennes
    await calculateDjRatings(djId);

    res.json({
      success: true,
      message: 'Note enregistrée avec succès.',
    });
  } catch (error) {
    console.error('Erreur notation DJ:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la note.',
    });
  }
});

// Endpoint pour noter un lieu
app.post('/api/ratings/venue', authenticateToken, async (req, res) => {
  try {
    const { venueId, eventId, rating, comment } = req.body ?? {};
    const raterId = req.user.id;

    // Validation
    if (!venueId || !eventId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'venueId, eventId et rating sont requis.',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'La note doit être entre 1 et 5.',
      });
    }

    // Vérifier que le lieu existe
    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    // Vérifier que l'événement existe et est passé
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        booker: true,
        eventDjs: true,
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }

    if (event.venueId !== venueId) {
      return res.status(400).json({
        success: false,
        message: 'Cet événement n\'a pas eu lieu dans ce lieu.',
      });
    }

    // Vérifier que l'événement est terminé (on ne peut noter que les événements terminés)
    if (event.status !== 'FINISHED') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez noter qu\'un événement terminé.',
      });
    }

    // Récupérer le type de compte de l'utilisateur qui note
    const rater = await prisma.user.findUnique({
      where: { id: raterId },
      include: {
        community: true,
        booker: true,
        dj: true,
      },
    });

    if (!rater) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    let raterType = null;
    let ticketId = null;

    // Validation selon le type de compte
    if (rater.accountType === 'COMMUNITY' && rater.community) {
      raterType = 'COMMUNITY';
      // Vérifier qu'il a un ticket valide pour cet événement
      const ticket = await prisma.ticket.findFirst({
        where: {
          userId: raterId,
          eventId: eventId,
          status: 'valid',
        },
      });

      if (!ticket) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir un ticket valide pour cet événement pour noter.',
        });
      }

      // Le ticket existe et l'événement est FINISHED, donc le ticket a été acheté quand l'événement était UPCOMING
      ticketId = ticket.id;
    } else if (rater.accountType === 'BOOKER' && rater.booker) {
      raterType = 'BOOKER';
      // Vérifier qu'il a organisé cet événement (bookerId pointe vers UserBooker.id)
      if (event.bookerId !== rater.booker.id) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir organisé cet événement pour noter.',
        });
      }
    } else if (rater.accountType === 'DJ' && rater.dj) {
      raterType = 'DJ';
      // Vérifier qu'il a joué à cet événement
      const djPlayed = event.eventDjs.some((ed) => ed.djId === raterId);
      if (!djPlayed) {
        return res.status(403).json({
          success: false,
          message: 'Vous devez avoir joué à cet événement pour noter.',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Type de compte non autorisé à noter.',
      });
    }

    // Vérifier s'il a déjà noté ce lieu pour cet événement
    const existingRating = await prisma.venueRating.findUnique({
      where: {
        venueId_raterId_eventId: {
          venueId,
          raterId,
          eventId,
        },
      },
    });

    if (existingRating) {
      // Mettre à jour la note existante
      await prisma.venueRating.update({
        where: { id: existingRating.id },
        data: {
          rating: rating,
          comment: comment || null,
        },
      });
    } else {
      // Créer une nouvelle note
      await prisma.venueRating.create({
        data: {
          venueId,
          raterId,
          raterType,
          rating: rating,
          comment: comment || null,
          eventId,
          ticketId: ticketId || null,
        },
      });
    }

    // Recalculer les moyennes
    await calculateVenueRatings(venueId);

    res.json({
      success: true,
      message: 'Note enregistrée avec succès.',
    });
  } catch (error) {
    console.error('Erreur notation Lieu:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'enregistrement de la note.',
    });
  }
});

// Endpoint pour vérifier les notes existantes d'un utilisateur pour un événement
app.get('/api/ratings/check/:eventId', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Récupérer toutes les notes de DJs pour cet événement et cet utilisateur
    const djRatings = await prisma.djRating.findMany({
      where: {
        eventId: eventId,
        raterId: userId,
      },
      include: {
        dj: {
          include: {
            user: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    // Récupérer la note du lieu pour cet événement et cet utilisateur
    const venueRating = await prisma.venueRating.findFirst({
      where: {
        eventId: eventId,
        raterId: userId,
      },
      include: {
        venue: true,
      },
    });

    // Formater les réponses
    const ratedDjIds = djRatings.map((rating) => rating.dj.user.id); // User.id des DJs notés
    const ratedVenueId = venueRating ? venueRating.venueId : null;

    res.json({
      success: true,
      ratedDjIds, // Array de User.id des DJs déjà notés
      ratedVenueId, // ID du lieu déjà noté (ou null)
      djRatings: djRatings.map((r) => ({
        djUserId: r.dj.user.id,
        rating: r.rating,
        comment: r.comment,
      })),
      venueRating: venueRating
        ? {
            venueId: venueRating.venueId,
            rating: venueRating.rating,
            comment: venueRating.comment,
          }
        : null,
    });
  } catch (error) {
    console.error('Erreur vérification notes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des notes.',
    });
  }
});

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
      },
      orderBy: {
        averageRatingGlobal: 'desc',
      },
    });

    const formattedDjs = djs.map((dj) => ({
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
      averageRatingGlobal: dj.averageRatingGlobal,
      totalRatingsGlobal: dj.totalRatingsCommunity + dj.totalRatingsBooker + dj.totalRatingsVenue,
      averageRatingCommunity: dj.averageRatingCommunity,
      averageRatingBooker: dj.averageRatingBooker,
      averageRatingVenue: dj.averageRatingVenue,
    }));

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

// Endpoint pour uploader des fichiers médias pour un DJ
app.post(
  '/api/dj/:djId/media/upload',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('file') : uploadLocal.single('file'))(req, res, next),
  async (req, res) => {
  try {
    const { djId } = req.params;
    const { type, title, thumbnail } = req.body;
    const userId = req.user.id;

    console.log('[UPLOAD MEDIA FILE] Requête reçue:', { djId, type, title, userId, hasFile: !!req.file });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni.',
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Le type est requis.',
      });
    }

    if (!['photo', 'video', 'audio'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type doit être photo, video ou audio.',
      });
    }

    // Vérifier que le DJ appartient à l'utilisateur
    const dj = await prisma.userDj.findUnique({
      where: { id: djId },
    });

    if (!dj) {
      console.error('[UPLOAD MEDIA FILE] DJ non trouvé:', djId);
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }

    if (dj.userId !== userId) {
      console.error('[UPLOAD MEDIA FILE] Accès non autorisé:', { djUserId: dj.userId, requestUserId: userId });
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez ajouter des médias qu\'à votre propre profil DJ.',
      });
    }

    let fileUrl = null;
    let storageKey = null;
    if (MEDIA_STORAGE === 'r2') {
      const key = makeObjectKey('media', req.file.originalname);
      const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
      fileUrl = uploaded.url;
      storageKey = uploaded.key;
    } else {
      // Construire l'URL publique du fichier
      // Priorité : PUBLIC_URL (variable d'environnement) > Origin/Referer > Host de la requête
      // Cela garantit que les médias sont toujours accessibles via le tunnel Cloudflare
      const publicUrl = process.env.PUBLIC_URL;
      const origin = req.get('origin') || req.get('referer');
      const baseUrl = publicUrl
        ? publicUrl.replace(/\/$/, '')
        : (origin ? origin.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`);
      fileUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      storageKey = `uploads/media/${req.file.filename}`;
    }

    // Si c'est une photo de profil ou bannière, supprimer l'ancienne
    if (title === 'profile' || title === 'banner') {
      const oldMedia = await prisma.djMedia.findMany({
        where: {
          djId,
          type: 'photo',
          title: title,
        },
      });
      
      // Supprimer les anciens fichiers (local) / objets (R2)
      for (const old of oldMedia) {
        if (MEDIA_STORAGE === 'r2') {
          try {
            await deleteFromR2({ key: old.storageKey, url: old.url });
          } catch (e) {
            // best-effort
          }
        } else if (old.url && old.url.includes('/uploads/media/')) {
          const oldFilePath = path.join(__dirname, 'uploads', 'media', path.basename(old.url));
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      }
      
      await prisma.djMedia.deleteMany({
        where: {
          djId,
          type: 'photo',
          title: title,
        },
      });
    }

    const media = await prisma.djMedia.create({
      data: {
        djId,
        type,
        url: fileUrl,
        storageKey,
        title: title || null,
        thumbnail: thumbnail || null,
      },
    });

    // Sync UserDj.profileImage / bannerImage quand on uploade une photo de profil ou bannière
    if (title === 'profile' || title === 'banner') {
      await prisma.userDj.update({
        where: { id: djId },
        data: title === 'profile' ? { profileImage: fileUrl } : { bannerImage: fileUrl },
      });
    }

    console.log('[UPLOAD MEDIA FILE] Média créé avec succès:', media.id, fileUrl);

    res.json({
      success: true,
      message: 'Média uploadé avec succès.',
      media: {
        id: media.id,
        type: media.type,
        url: media.url,
        title: media.title,
        thumbnail: media.thumbnail,
      },
    });
  } catch (error) {
    console.error('[UPLOAD MEDIA FILE] Erreur upload média:', error);
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour uploader des fichiers médias pour un lieu
app.post(
  '/api/venue/:venueId/media/upload',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('file') : uploadLocal.single('file'))(req, res, next),
  async (req, res) => {
  try {
    const { venueId } = req.params;
    const { type, title, thumbnail } = req.body;
    const userId = req.user.id;

    console.log('[UPLOAD VENUE MEDIA FILE] Requête reçue:', { venueId, type, title, userId, hasFile: !!req.file });

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni.',
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Le type est requis.',
      });
    }

    if (!['photo', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type doit être photo ou video.',
      });
    }

    // Vérifier que le lieu appartient à l'utilisateur
    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      console.error('[UPLOAD VENUE MEDIA FILE] Lieu non trouvé:', venueId);
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    if (venue.userId !== userId) {
      console.error('[UPLOAD VENUE MEDIA FILE] Accès non autorisé:', { venueUserId: venue.userId, requestUserId: userId });
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez ajouter des médias qu\'à votre propre lieu.',
      });
    }

    let fileUrl = null;
    let storageKey = null;
    if (MEDIA_STORAGE === 'r2') {
      const key = makeObjectKey('media', req.file.originalname);
      const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
      fileUrl = uploaded.url;
      storageKey = uploaded.key;
    } else {
      // Construire l'URL publique du fichier (utilise PUBLIC_URL ou l'origine de la requête)
      const publicUrl = process.env.PUBLIC_URL;
      const origin = req.get('origin') || req.get('referer');
      const baseUrl = publicUrl
        ? publicUrl.replace(/\/$/, '')
        : (origin ? origin.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`);
      fileUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      storageKey = `uploads/media/${req.file.filename}`;
    }

    const media = await prisma.venueMedia.create({
      data: {
        venueId,
        type,
        url: fileUrl,
        storageKey,
        title: title || null,
        thumbnail: thumbnail || null,
      },
    });

    console.log('[UPLOAD VENUE MEDIA FILE] Média créé avec succès:', media.id, fileUrl);

    res.json({
      success: true,
      message: 'Média uploadé avec succès.',
      media: {
        id: media.id,
        type: media.type,
        url: media.url,
        title: media.title,
        thumbnail: media.thumbnail,
      },
    });
  } catch (error) {
    console.error('[UPLOAD VENUE MEDIA FILE] Erreur upload média:', error);
    // Supprimer le fichier en cas d'erreur
    if (MEDIA_STORAGE === 'local' && req.file && req.file.filename) {
      const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour uploader des médias pour un lieu (compatibilité - accepte URL)
app.post('/api/venue/:venueId/media', authenticateToken, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { type, url, title, thumbnail } = req.body;
    const userId = req.user.id;

    console.log('[UPLOAD VENUE MEDIA] Requête reçue:', { venueId, type, title, userId });

    if (!type || !url) {
      return res.status(400).json({
        success: false,
        message: 'type et url sont requis.',
      });
    }

    if (!['photo', 'video'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type doit être photo ou video.',
      });
    }

    // Vérifier que le lieu appartient à l'utilisateur
    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
    });

    if (!venue) {
      console.error('[UPLOAD VENUE MEDIA] Lieu non trouvé:', venueId);
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    if (venue.userId !== userId) {
      console.error('[UPLOAD VENUE MEDIA] Accès non autorisé:', { venueUserId: venue.userId, requestUserId: userId });
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez ajouter des médias qu\'à votre propre lieu.',
      });
    }

    const media = await prisma.venueMedia.create({
      data: {
        venueId,
        type,
        url,
        title: title || null,
        thumbnail: thumbnail || null,
      },
    });

    console.log('[UPLOAD VENUE MEDIA] Média créé avec succès:', media.id);

    res.json({
      success: true,
      message: 'Média ajouté avec succès.',
      media: {
        id: media.id,
        type: media.type,
        url: media.url,
        title: media.title,
        thumbnail: media.thumbnail,
      },
    });
  } catch (error) {
    console.error('[UPLOAD VENUE MEDIA] Erreur upload média:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour supprimer un média d'un lieu
app.delete('/api/venue/:venueId/media/:mediaId', authenticateToken, async (req, res) => {
  try {
    const { venueId, mediaId } = req.params;
    const userId = req.user.id;

    const venue = await prisma.userVenue.findUnique({ where: { id: venueId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }
    if (venue.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Accès non autorisé pour ce lieu.' });
    }

    const media = await prisma.venueMedia.findUnique({ where: { id: mediaId } });
    if (!media || media.venueId !== venueId) {
      return res.status(404).json({ success: false, message: 'Média non trouvé.' });
    }

    await prisma.venueMedia.delete({ where: { id: mediaId } });

    // Supprimer le fichier/objet
    if (MEDIA_STORAGE === 'r2') {
      try {
        await deleteFromR2({ key: media.storageKey, url: media.url });
      } catch (e) {
        // best-effort
      }
    } else if (media.url && media.url.includes('/uploads/media/')) {
      const filename = media.url.split('/uploads/media/')[1];
      if (filename) {
        const filePath = path.join(__dirname, 'uploads', 'media', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    res.json({ success: true, message: 'Média supprimé.' });
  } catch (error) {
    console.error('[DELETE VENUE MEDIA] Erreur suppression média:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les médias d'un lieu
app.get('/api/venue/:venueId/media', async (req, res) => {
  try {
    const { venueId } = req.params;
    const { type } = req.query; // Optionnel : filtrer par type

    const whereClause = { venueId };
    if (type && ['photo', 'video'].includes(type)) {
      whereClause.type = type;
    }

    const media = await prisma.venueMedia.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
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
    console.error('Erreur récupération médias lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour uploader des médias pour un DJ (compatibilité - accepte URL ou fichier)
app.post('/api/dj/:djId/media', authenticateToken, async (req, res) => {
  try {
    const { djId } = req.params;
    const { type, url, title, thumbnail } = req.body;
    const userId = req.user.id;

    console.log('[UPLOAD MEDIA] Requête reçue:', { djId, type, title, userId });

    if (!type || !url) {
      return res.status(400).json({
        success: false,
        message: 'type et url sont requis.',
      });
    }

    if (!['photo', 'video', 'audio'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type doit être photo, video ou audio.',
      });
    }

    // Vérifier que le DJ appartient à l'utilisateur
    const dj = await prisma.userDj.findUnique({
      where: { id: djId },
    });

    if (!dj) {
      console.error('[UPLOAD MEDIA] DJ non trouvé:', djId);
      return res.status(404).json({ success: false, message: 'DJ non trouvé.' });
    }

    if (dj.userId !== userId) {
      console.error('[UPLOAD MEDIA] Accès non autorisé:', { djUserId: dj.userId, requestUserId: userId });
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez ajouter des médias qu\'à votre propre profil DJ.',
      });
    }

    // Si c'est une photo de profil ou bannière, supprimer l'ancienne
    if (title === 'profile' || title === 'banner') {
      await prisma.djMedia.deleteMany({
        where: {
          djId,
          type: 'photo',
          title: title,
        },
      });
    }

    const media = await prisma.djMedia.create({
      data: {
        djId,
        type,
        url,
        title: title || null,
        thumbnail: thumbnail || null,
      },
    });

    console.log('[UPLOAD MEDIA] Média créé avec succès:', media.id);

    res.json({
      success: true,
      message: 'Média ajouté avec succès.',
      media: {
        id: media.id,
        type: media.type,
        url: media.url,
        title: media.title,
        thumbnail: media.thumbnail,
      },
    });
  } catch (error) {
    console.error('[UPLOAD MEDIA] Erreur upload média:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les bookings d'un DJ (événements où il est associé)
app.get('/api/dj/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil DJ de l'utilisateur
    const dj = await prisma.userDj.findFirst({
      where: { userId },
    });

    if (!dj) {
      return res.status(404).json({ success: false, message: 'Profil DJ non trouvé.' });
    }

    // Récupérer les événements où ce DJ est associé
    // djId dans EventDj pointe vers User.id (pas UserDj.id)
    const eventDjs = await prisma.eventDj.findMany({
      where: { djId: userId },
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
            booker: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                bookerType: true,
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

    const resolvePaymentStatus = (ed, eventStatus) => {
      if (ed?.paymentStatus === 'PAID' || ed?.paidAt) return 'PAID';
      if (ed?.contractStatus === 'SIGNED') return 'PENDING'; // Contrat signé = paiement en attente
      if (eventStatus === 'FINISHED' || eventStatus === 'ONGOING') return 'PENDING';
      return 'UPCOMING';
    };

    const bookings = eventDjs.map((ed) => ({
      id: ed.id,
      eventId: ed.event.id,
      eventTitle: ed.event.title,
      eventDate: ed.event.date,
      eventTime: ed.event.time,
      eventLocation: ed.event.location,
      eventStatus: ed.event.status,
      invitationStatus: ed.status, // Statut de l'invitation (PENDING, ACCEPTED, REJECTED)
      paymentStatus: resolvePaymentStatus(ed, ed.event.status),
      paymentAmount: ed.paymentAmount ?? null,
      paymentCurrency: ed.paymentCurrency ?? 'eur',
      paidAt: ed.paidAt ?? null,
      invoiceNumber: ed.invoiceNumber ?? null,
      venue: ed.event.venue ? {
        id: ed.event.venue.id,
        name: ed.event.venue.venueName,
        address: ed.event.venue.address,
      } : null,
      booker: ed.event.booker ? {
        id: ed.event.booker.id,
        name: `${ed.event.booker.prenom} ${ed.event.booker.nom}`,
        type: ed.event.booker.bookerType,
      } : null,
      createdAt: ed.createdAt,
    }));

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error('Erreur récupération bookings DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les bookings d'un lieu (événements où il est associé via EventVenue)
app.get('/api/venue/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const venue = await prisma.userVenue.findFirst({
      where: { userId },
    });

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const eventVenues = await prisma.eventVenue.findMany({
      where: { venueId: venue.id },
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
            booker: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                bookerType: true,
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

    const resolvePaymentStatus = (ev, eventStatus) => {
      if (ev?.paymentStatus === 'PAID' || ev?.paidAt) return 'PAID';
      if (ev?.contractStatus === 'SIGNED') return 'PENDING';
      if (eventStatus === 'FINISHED' || eventStatus === 'ONGOING') return 'PENDING';
      return 'UPCOMING';
    };

    const bookings = eventVenues.map((ev) => ({
      id: ev.id,
      eventVenueId: ev.id,
      eventId: ev.event.id,
      eventTitle: ev.event.title,
      eventDate: ev.event.date,
      eventTime: ev.event.time,
      eventLocation: ev.event.location,
      eventStatus: ev.event.status,
      invitationStatus: ev.status,
      paymentStatus: resolvePaymentStatus(ev, ev.event.status),
      paymentAmount: ev.paymentAmount ?? null,
      paymentCurrency: ev.paymentCurrency ?? 'eur',
      paidAt: ev.paidAt ?? null,
      invoiceNumber: ev.invoiceNumber ?? null,
      venue: ev.event.venue ? {
        id: ev.event.venue.id,
        name: ev.event.venue.venueName,
        address: ev.event.venue.address,
      } : null,
      booker: ev.event.booker ? {
        id: ev.event.booker.id,
        name: `${ev.event.booker.prenom} ${ev.event.booker.nom}`,
        type: ev.event.booker.bookerType,
      } : null,
      createdAt: ev.createdAt,
    }));

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error('Erreur récupération bookings lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Accepte une invitation à un événement
 * @route PUT /api/dj/invitations/:invitationId/accept
 */
app.put('/api/dj/invitations/:invitationId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    // Récupérer l'invitation
    const invitation = await prisma.eventDj.findUnique({
      where: { id: invitationId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
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

    // Vérifier que l'invitation appartient au DJ connecté
    if (invitation.djId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette invitation.',
      });
    }

    // Vérifier que l'invitation est en PENDING
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${invitation.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    // Mettre à jour le statut à ACCEPTED
    const updatedInvitation = await prisma.eventDj.update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED' },
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
            booker: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                bookerType: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Invitation acceptée avec succès.',
      invitation: {
        id: updatedInvitation.id,
        eventId: updatedInvitation.event.id,
        eventTitle: updatedInvitation.event.title,
        eventDate: updatedInvitation.event.date,
        eventTime: updatedInvitation.event.time,
        eventLocation: updatedInvitation.event.location,
        invitationStatus: updatedInvitation.status,
        venue: updatedInvitation.event.venue ? {
          id: updatedInvitation.event.venue.id,
          name: updatedInvitation.event.venue.venueName,
          address: updatedInvitation.event.venue.address,
        } : null,
        booker: updatedInvitation.event.booker ? {
          id: updatedInvitation.event.booker.id,
          name: `${updatedInvitation.event.booker.prenom} ${updatedInvitation.event.booker.nom}`,
          type: updatedInvitation.event.booker.bookerType,
        } : null,
      },
    });
  } catch (error) {
    console.error('Erreur acceptation invitation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Refuse une invitation à un événement
 * @route PUT /api/dj/invitations/:invitationId/reject
 */
app.put('/api/dj/invitations/:invitationId/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    // Récupérer l'invitation
    const invitation = await prisma.eventDj.findUnique({
      where: { id: invitationId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
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

    // Vérifier que l'invitation appartient au DJ connecté
    if (invitation.djId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette invitation.',
      });
    }

    // Vérifier que l'invitation est en PENDING
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${invitation.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const { reason } = req.body ?? {};
    const rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    // Mettre à jour le statut à REJECTED
    const updatedInvitation = await prisma.eventDj.update({
      where: { id: invitationId },
      data: { status: 'REJECTED', rejectionReason },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Invitation refusée.',
      invitation: {
        id: updatedInvitation.id,
        eventId: updatedInvitation.event.id,
        eventTitle: updatedInvitation.event.title,
        invitationStatus: updatedInvitation.status,
      },
    });
  } catch (error) {
    console.error('Erreur refus invitation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Annule un booking (après acceptation)
 * @route PUT /api/dj/invitations/:invitationId/cancel
 */
app.put('/api/dj/invitations/:invitationId/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    const invitation = await prisma.eventDj.findUnique({
      where: { id: invitationId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Booking introuvable.' });
    }
    if (invitation.djId !== userId) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (invitation.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Seul un booking accepté peut être annulé.',
      });
    }

    const { reason } = req.body ?? {};
    const cancellationReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    await prisma.eventDj.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED', rejectionReason: cancellationReason },
    });

    return res.json({
      success: true,
      message: 'Booking annulé.',
      invitation: { id: invitation.id, eventId: invitation.event.id, invitationStatus: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Erreur annulation booking DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Accepte une invitation lieu à un événement
 * @route PUT /api/venue/invitations/:eventVenueId/accept
 */
app.put('/api/venue/invitations/:eventVenueId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const venue = await prisma.userVenue.findFirst({ where: { userId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ev) {
      return res.status(404).json({ success: false, message: 'Invitation non trouvée.' });
    }
    if (ev.venueId !== venue.id) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette invitation.' });
    }
    if (ev.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${ev.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const updated = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: { status: 'ACCEPTED' },
      include: {
        event: {
          include: {
            venue: { select: { id: true, venueName: true, address: true } },
            booker: { select: { id: true, nom: true, prenom: true, bookerType: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Invitation acceptée avec succès.',
      invitation: {
        id: updated.id,
        eventId: updated.event.id,
        eventTitle: updated.event.title,
        eventDate: updated.event.date,
        eventTime: updated.event.time,
        invitationStatus: updated.status,
        venue: updated.event.venue ? { id: updated.event.venue.id, name: updated.event.venue.venueName, address: updated.event.venue.address } : null,
        booker: updated.event.booker ? { id: updated.event.booker.id, name: `${updated.event.booker.prenom} ${updated.event.booker.nom}`, type: updated.event.booker.bookerType } : null,
      },
    });
  } catch (error) {
    console.error('Erreur acceptation invitation lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Refuse une invitation lieu à un événement
 * @route PUT /api/venue/invitations/:eventVenueId/reject
 */
app.put('/api/venue/invitations/:eventVenueId/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const venue = await prisma.userVenue.findFirst({ where: { userId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ev) {
      return res.status(404).json({ success: false, message: 'Invitation non trouvée.' });
    }
    if (ev.venueId !== venue.id) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette invitation.' });
    }
    if (ev.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${ev.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const { reason } = req.body ?? {};
    const rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    const updated = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: { status: 'REJECTED', rejectionReason },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    res.json({
      success: true,
      message: 'Invitation refusée.',
      invitation: {
        id: updated.id,
        eventId: updated.event.id,
        eventTitle: updated.event.title,
        invitationStatus: updated.status,
      },
    });
  } catch (error) {
    console.error('Erreur refus invitation lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Annule un booking lieu (après acceptation)
 * @route PUT /api/venue/invitations/:eventVenueId/cancel
 */
app.put('/api/venue/invitations/:eventVenueId/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const venue = await prisma.userVenue.findFirst({ where: { userId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ev) {
      return res.status(404).json({ success: false, message: 'Booking introuvable.' });
    }
    if (ev.venueId !== venue.id) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (ev.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Seul un booking accepté peut être annulé.',
      });
    }

    const { reason } = req.body ?? {};
    const cancellationReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: { status: 'CANCELLED', rejectionReason: cancellationReason },
    });

    return res.json({
      success: true,
      message: 'Booking annulé.',
      invitation: { id: ev.id, eventId: ev.event.id, invitationStatus: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Erreur annulation booking lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ============================================
 * ENDPOINTS CHAT - Communication DJ/Booker
 * ============================================
 */

/**
 * Envoyer un message dans une conversation (DJ ou Booker)
 * @route POST /api/chat/:eventDjId/messages
 */
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

/**
 * Récupérer le nombre total de messages non lus
 * @route GET /api/chat/unread-count
 */
app.get('/api/chat/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // ✅ Nouveau comportement: renvoyer un breakdown par "côté" (DJ vs BOOKER)
    // Peu importe le profil actif -> permet d'afficher "d'où vient la notif" et de naviguer correctement.

    // --- DJ side ---
    const djEventIds = await prisma.eventDj.findMany({
      where: { djId: userId },
      select: { eventId: true },
    });
    const djEventIdList = [...new Set(djEventIds.map((e) => e.eventId))];

    const djPrivateUnread = await prisma.message.count({
      where: {
        type: 'PRIVATE',
        read: false,
        deleted: false,
        senderId: { not: userId },
        eventDj: { djId: userId },
      },
    });

    const djGroupUnread = djEventIdList.length
      ? await prisma.message.count({
          where: {
            type: 'GROUP',
            read: false,
            deleted: false,
            senderId: { not: userId },
            eventId: { in: djEventIdList },
          },
        })
      : 0;

    const djTotalUnread = djPrivateUnread + djGroupUnread;

    // Dernier message non lu côté DJ (private ou group)
    const djLatestUnread = await prisma.message.findFirst({
      where: {
        read: false,
        deleted: false,
        senderId: { not: userId },
        OR: [
          {
            type: 'PRIVATE',
            eventDj: { djId: userId },
          },
          ...(djEventIdList.length
            ? [
                {
                  type: 'GROUP',
                  eventId: { in: djEventIdList },
                },
              ]
            : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        eventDj: {
          include: {
            event: { select: { id: true, title: true } },
          },
        },
        event: { select: { id: true, title: true } },
      },
    });

    // --- BOOKER side ---
    const booker = await prisma.userBooker.findFirst({
      where: { userId: userId },
      select: { id: true },
    });

    let bookerTotalUnread = 0;
    let bookerLatestUnread = null;

    if (booker) {
      const bookerPrivateUnreadDj = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventDj: {
            event: { bookerId: booker.id },
          },
        },
      });
      const bookerPrivateUnreadVenue = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventVenue: {
            event: { bookerId: booker.id },
          },
        },
      });
      const bookerPrivateUnread = bookerPrivateUnreadDj + bookerPrivateUnreadVenue;

      const bookerEventIds = await prisma.event.findMany({
        where: { bookerId: booker.id },
        select: { id: true },
      });
      const bookerEventIdList = bookerEventIds.map((e) => e.id);

      const bookerGroupUnread = bookerEventIdList.length
        ? await prisma.message.count({
            where: {
              type: 'GROUP',
              read: false,
              deleted: false,
              senderId: { not: userId },
              eventId: { in: bookerEventIdList },
            },
          })
        : 0;

      bookerTotalUnread = bookerPrivateUnread + bookerGroupUnread;

      bookerLatestUnread = await prisma.message.findFirst({
        where: {
          read: false,
          deleted: false,
          senderId: { not: userId },
          OR: [
            {
              type: 'PRIVATE',
              eventDj: {
                event: { bookerId: booker.id },
              },
            },
            {
              type: 'PRIVATE',
              eventVenue: {
                event: { bookerId: booker.id },
              },
            },
            ...(bookerEventIdList.length
              ? [
                  {
                    type: 'GROUP',
                    eventId: { in: bookerEventIdList },
                  },
                ]
              : []),
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          eventDj: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          eventVenue: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
          event: { select: { id: true, title: true } },
        },
      });
    }

    // --- VENUE side ---
    const venue = await prisma.userVenue.findFirst({
      where: { userId: userId },
      select: { id: true },
    });
    let venueTotalUnread = 0;
    let venueLatestUnread = null;
    if (venue) {
      venueTotalUnread = await prisma.message.count({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventVenue: { venueId: venue.id },
        },
      });
      venueLatestUnread = await prisma.message.findFirst({
        where: {
          type: 'PRIVATE',
          read: false,
          deleted: false,
          senderId: { not: userId },
          eventVenue: { venueId: venue.id },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          eventVenue: {
            include: { event: { select: { id: true, title: true } } },
          },
        },
      });
    }

    const totalUnread = djTotalUnread + bookerTotalUnread + venueTotalUnread;

    const pickLatest = (a, b, c) => {
      const items = [
        a && { profileType: 'DJ', msg: a },
        b && { profileType: 'BOOKER', msg: b },
        c && { profileType: 'VENUE', msg: c },
      ].filter(Boolean);
      if (items.length === 0) return null;
      return items.reduce((best, cur) => {
        const bestTime = best?.msg?.createdAt ? new Date(best.msg.createdAt).getTime() : 0;
        const curTime = cur?.msg?.createdAt ? new Date(cur.msg.createdAt).getTime() : 0;
        return curTime > bestTime ? cur : best;
      });
    };

    const latest = pickLatest(djLatestUnread, bookerLatestUnread, venueLatestUnread);

    res.json({
      success: true,
      count: totalUnread,
      byProfileType: {
        DJ: djTotalUnread,
        BOOKER: bookerTotalUnread,
        VENUE: venueTotalUnread,
      },
      latest: latest
        ? {
            profileType: latest.profileType,
            messageId: latest.msg.id,
            messageType: latest.msg.type,
            preview: (latest.msg.content || '').slice(0, 160),
            createdAt: latest.msg.createdAt,
            eventDjId: latest.msg.eventDjId ?? null,
            eventVenueId: latest.msg.eventVenueId ?? null,
            eventId: latest.msg.eventId ?? null,
            eventTitle:
              latest.msg.event?.title ??
              latest.msg.eventDj?.event?.title ??
              latest.msg.eventVenue?.event?.title ??
              null,
          }
        : null,
    });
  } catch (error) {
    console.error('Erreur récupération nombre messages non lus:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Marquer tous les messages non lus comme lus pour l'utilisateur actuel
 * @route PUT /api/chat/mark-all-read
 */
app.put('/api/chat/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil actif
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeProfileType: true },
    });

    if (user.activeProfileType === 'DJ') {
      // Marquer tous les messages privés non lus comme lus (reçus par le DJ)
      await prisma.message.updateMany({
        where: {
          type: 'PRIVATE',
          read: false,
          senderId: { not: userId },
          eventDj: {
            djId: userId,
          },
        },
        data: { read: true },
      });

      // Marquer tous les messages de groupe non lus comme lus pour les événements où le DJ est invité
      const djEventIds = await prisma.eventDj.findMany({
        where: { djId: userId },
        select: { eventId: true },
      });
      const eventIds = [...new Set(djEventIds.map((e) => e.eventId))];

      if (eventIds.length > 0) {
        await prisma.message.updateMany({
          where: {
            type: 'GROUP',
            read: false,
            senderId: { not: userId },
            eventId: { in: eventIds },
          },
          data: { read: true },
        });
      }
    } else if (user.activeProfileType === 'BOOKER') {
      // Pour les bookers, marquer tous les messages privés et de groupe comme lus
      const booker = await prisma.userBooker.findFirst({
        where: { userId: userId },
        select: { id: true },
      });

      if (booker) {
        // Messages privés DJ
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventDj: {
              event: { bookerId: booker.id },
            },
          },
          data: { read: true },
        });
        // Messages privés Lieu
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventVenue: {
              event: { bookerId: booker.id },
            },
          },
          data: { read: true },
        });

        // Marquer tous les messages de groupe non lus comme lus pour les événements du booker
        const bookerEventIds = await prisma.event.findMany({
          where: { bookerId: booker.id },
          select: { id: true },
        });
        const eventIds = bookerEventIds.map((e) => e.id);

        if (eventIds.length > 0) {
          await prisma.message.updateMany({
            where: {
              type: 'GROUP',
              read: false,
              senderId: { not: userId },
              eventId: { in: eventIds },
            },
            data: { read: true },
          });
        }
      }
    } else if (user.activeProfileType === 'VENUE') {
      const venue = await prisma.userVenue.findFirst({
        where: { userId: userId },
        select: { id: true },
      });
      if (venue) {
        await prisma.message.updateMany({
          where: {
            type: 'PRIVATE',
            read: false,
            senderId: { not: userId },
            eventVenue: { venueId: venue.id },
          },
          data: { read: true },
        });
      }
    }

    res.json({
      success: true,
      message: 'Tous les messages ont été marqués comme lus.',
    });
  } catch (error) {
    console.error('Erreur marquage tous messages lus:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ============================================
 * ENDPOINTS CHAT DE GROUPE - Communication entre tous les DJs d'un événement
 * ============================================
 */

/**
 * Envoyer un message dans le chat de groupe d'un événement
 * @route POST /api/chat/group/:eventId/messages
 */
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

// Endpoint pour récupérer les médias d'un DJ
app.get('/api/dj/:identifier/media', async (req, res) => {
  try {
    const { identifier } = req.params;
    const { type } = req.query; // Optionnel : filtrer par type

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

    const whereClause = { djId: dj.id };
    if (type && ['photo', 'video', 'audio'].includes(type)) {
      whereClause.type = type;
    }

    const media = await prisma.djMedia.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
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
    console.error('Erreur récupération médias:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour mettre à jour le titre d'un média
app.put('/api/dj/media/:mediaId', authenticateToken, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    // Accepter title même s'il est null ou une chaîne vide (pour permettre de vider le titre)
    // On valide seulement que title est présent dans req.body (même si null)
    if (!('title' in req.body)) {
      return res.status(400).json({
        success: false,
        message: 'Le champ title est requis dans le body.',
      });
    }

    const media = await prisma.djMedia.findUnique({
      where: { id: mediaId },
      include: { dj: true },
    });

    if (!media) {
      return res.status(404).json({ success: false, message: 'Média non trouvé.' });
    }

    if (media.dj.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres médias.',
      });
    }

    const updatedMedia = await prisma.djMedia.update({
      where: { id: mediaId },
      data: {
        title: (title && typeof title === 'string' && title.trim()) ? title.trim() : null,
      },
    });

    res.json({
      success: true,
      message: 'Titre mis à jour avec succès.',
      media: {
        id: updatedMedia.id,
        type: updatedMedia.type,
        url: updatedMedia.url,
        title: updatedMedia.title,
        thumbnail: updatedMedia.thumbnail,
      },
    });
  } catch (error) {
    console.error('Erreur mise à jour titre média:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour supprimer un média
app.delete('/api/dj/media/:mediaId', authenticateToken, async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userId = req.user.id;

    const media = await prisma.djMedia.findUnique({
      where: { id: mediaId },
      include: { dj: true },
    });

    if (!media) {
      return res.status(404).json({ success: false, message: 'Média non trouvé.' });
    }

    if (media.dj.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres médias.',
      });
    }

    const toDelete = { url: media.url, storageKey: media.storageKey };

    await prisma.djMedia.delete({ where: { id: mediaId } });

    // Supprimer le fichier/objet
    if (MEDIA_STORAGE === 'r2') {
      try {
        await deleteFromR2({ key: toDelete.storageKey, url: toDelete.url });
      } catch (e) {
        // best-effort
      }
    } else if (toDelete.url && toDelete.url.includes('/uploads/media/')) {
      const filename = toDelete.url.split('/uploads/media/')[1];
      if (filename) {
        const filePath = path.join(__dirname, 'uploads', 'media', filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    res.json({
      success: true,
      message: 'Média supprimé avec succès.',
    });
  } catch (error) {
    console.error('Erreur suppression média:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les notes d'un lieu
app.get('/api/venue/:venueId/ratings', async (req, res) => {
  try {
    const venue = await prisma.userVenue.findUnique({
      where: { id: req.params.venueId },
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

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    res.json({
      success: true,
      ratings: {
        averageRatingCommunity: venue.averageRatingCommunity,
        averageRatingBooker: venue.averageRatingBooker,
        averageRatingDj: venue.averageRatingDj,
        averageRatingGlobal: venue.averageRatingGlobal,
        totalRatingsCommunity: venue.totalRatingsCommunity,
        totalRatingsBooker: venue.totalRatingsBooker,
        totalRatingsDj: venue.totalRatingsDj,
        allRatings: venue.ratings.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          raterType: r.raterType,
          eventTitle: r.event.title,
          eventDate: r.event.date,
          createdAt: r.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur récupération notes Lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Supprime un ticket et recalcule les notes associées
 * @route DELETE /api/tickets/:ticketId
 * @access Private (nécessite authentification)
 */
app.delete('/api/tickets/:ticketId', authenticateToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const userId = req.user.id;

    // Vérifier que le ticket appartient à l'utilisateur
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé.',
      });
    }

    if (ticket.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres tickets.',
      });
    }

    // Récupérer toutes les notes de DJs pour cet événement et cet utilisateur
    // (on cherche par eventId et raterId car le ticketId peut être null si le ticket a déjà été supprimé)
    const djRatings = await prisma.djRating.findMany({
      where: {
        eventId: ticket.eventId,
        raterId: userId,
      },
      include: {
        dj: true,
      },
    });

    // Récupérer toutes les notes de lieux pour cet événement et cet utilisateur
    const venueRatings = await prisma.venueRating.findMany({
      where: {
        eventId: ticket.eventId,
        raterId: userId,
      },
      include: {
        venue: true,
      },
    });

    // Collecter les IDs uniques des DJs et lieux concernés pour recalculer les moyennes
    const affectedDjIds = [...new Set(djRatings.map((r) => r.djId))];
    const affectedVenueIds = [...new Set(venueRatings.map((r) => r.venueId))];

    // Supprimer les notes de DJs pour cet événement et cet utilisateur
    if (djRatings.length > 0) {
      await prisma.djRating.deleteMany({
        where: {
          eventId: ticket.eventId,
          raterId: userId,
        },
      });
    }

    // Supprimer les notes de lieux pour cet événement et cet utilisateur
    if (venueRatings.length > 0) {
      await prisma.venueRating.deleteMany({
        where: {
          eventId: ticket.eventId,
          raterId: userId,
        },
      });
    }

    // Recalculer les moyennes pour chaque DJ concerné
    for (const djId of affectedDjIds) {
      await calculateDjRatings(djId);
    }

    // Recalculer les moyennes pour chaque lieu concerné
    for (const venueId of affectedVenueIds) {
      await calculateVenueRatings(venueId);
    }

    // Supprimer le ticket
    await prisma.ticket.delete({
      where: { id: ticketId },
    });

    res.json({
      success: true,
      message: 'Ticket et notes associées supprimés avec succès.',
    });
  } catch (error) {
    console.error('Erreur suppression ticket:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.get('/api/tickets/:ticketId/qr', async (req, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.ticketId },
      include: {
        event: {
          select: {
            title: true,
            date: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket non trouvé' });
    }

    const qrCodeDataURL = await QRCode.toDataURL(ticket.qrCode);
    res.json({
      success: true,
      qrCode: qrCodeDataURL,
      ticketInfo: {
        id: ticket.id,
        eventTitle: ticket.event.title,
        eventDate: ticket.event.date.toISOString().split('T')[0],
        status: ticket.status,
      },
    });
  } catch (error) {
    console.error('Erreur génération QR code:', error);
    res.status(500).json({ success: false, message: 'Erreur génération QR code' });
  }
});

// (Nettoyage) Les endpoints admin temporaires de modification d'événements ont été retirés.

/**
 * Récupère les statistiques globales de la plateforme
 * @route GET /api/stats
 */
app.get('/api/stats', async (req, res) => {
  try {
    const [
      registeredUsersCount,
      scoresAggregate,
      eventsCount,
      ticketsData,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.aggregate({
        _avg: { score: true },
        _sum: { score: true },
      }),
      prisma.event.count(),
      prisma.ticket.aggregate({
        _count: { id: true },
        _sum: { price: true },
      }),
    ]);

    const registeredAverageScore = Math.round(scoresAggregate._avg.score ?? 0);

    const stats = {
      totalUsers: registeredUsersCount,
      registeredUsers: registeredUsersCount,
      walletUsers: 0, // Plus utilisé, gardé pour compatibilité
      totalEvents: eventsCount,
      totalTicketsSold: ticketsData._count.id || 0,
      totalRevenue: ticketsData._sum.price || 0,
      averageUserScore: registeredAverageScore,
    };
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupère les DJs disponibles pour un booker
 * @route GET /api/booker/available-djs
 */
app.get('/api/booker/available-djs', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query; // Date optionnelle pour filtrer les DJs disponibles

    // Construire la condition de base
    const whereCondition = {
      availableStatus: true,
    };

    // Récupérer tous les DJs avec availableStatus = true
    let availableDjs = await prisma.userDj.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        artistName: 'asc',
      },
    });

    // Si une date est fournie, filtrer les DJs qui ont déjà un événement à cette date (même jour, peu importe l'heure)
    if (date) {
      try {
        const eventDate = new Date(date);
        if (!isNaN(eventDate.getTime())) {
          // Normaliser la date pour ne garder que la partie jour (année/mois/jour)
          const targetYear = eventDate.getFullYear();
          const targetMonth = eventDate.getMonth();
          const targetDay = eventDate.getDate();

          // Récupérer tous les événements UPCOMING ou ONGOING
          const allEvents = await prisma.event.findMany({
            where: {
              status: {
                in: ['UPCOMING', 'ONGOING'],
              },
            },
            include: {
              eventDjs: {
                select: {
                  djId: true,
                },
              },
            },
          });

          // Filtrer les événements qui sont le même jour que la date cible
          const bookedDjUserIds = new Set();
          allEvents.forEach(event => {
            const eventDateObj = new Date(event.date);
            const eventYear = eventDateObj.getFullYear();
            const eventMonth = eventDateObj.getMonth();
            const eventDay = eventDateObj.getDate();

            // Si c'est le même jour (même année, même mois, même jour)
            if (eventYear === targetYear && eventMonth === targetMonth && eventDay === targetDay) {
              event.eventDjs.forEach(ed => {
                bookedDjUserIds.add(ed.djId);
              });
            }
          });

          // Filtrer les DJs disponibles pour exclure ceux qui sont déjà bookés ce jour-là
          availableDjs = availableDjs.filter(dj => !bookedDjUserIds.has(dj.userId));
        }
      } catch (dateError) {
        console.error('Erreur parsing date:', dateError);
        // Si la date est invalide, on continue sans filtrer
      }
    }

    const formattedDjs = availableDjs.map((dj) => ({
      id: dj.id,
      userId: dj.userId,
      artistName: dj.artistName,
      city: dj.city,
      genre: dj.genre,
      hourlyRate: dj.hourlyRate,
      performanceRate: dj.performanceRate,
      availableDays: dj.availableDays ? (typeof dj.availableDays === 'string' ? JSON.parse(dj.availableDays) : dj.availableDays) : null,
      availableStatus: dj.availableStatus,
      averageRatingGlobal: dj.averageRatingGlobal,
    }));

    res.json({
      success: true,
      djs: formattedDjs,
    });
  } catch (error) {
    console.error('Erreur récupération DJs disponibles:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupère tous les lieux disponibles
 * @route GET /api/booker/venues
 */
app.get('/api/booker/venues', authenticateToken, async (req, res) => {
  try {
    const venues = await prisma.userVenue.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        venueName: 'asc',
      },
    });

    const formattedVenues = venues.map((venue) => ({
      id: venue.id,
      venueName: venue.venueName,
      address: venue.address,
      averageRatingGlobal: venue.averageRatingGlobal,
    }));

    res.json({
      success: true,
      venues: formattedVenues,
    });
  } catch (error) {
    console.error('Erreur récupération lieux:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer les événements d'un booker
 * @route GET /api/booker/events
 */
app.get('/api/booker/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Récupérer les événements du booker
    const events = await prisma.event.findMany({
      where: {
        bookerId: booker.id,
      },
      include: {
        venue: {
          select: {
            id: true,
            venueName: true,
            address: true,
          },
        },
        eventDjs: true,
        eventVenues: {
          include: {
            venue: { select: { id: true, venueName: true, address: true } },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Enrichir avec les infos des DJs et leurs statuts d'invitation
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        // Créer un map des statuts d'invitation et eventDjId par userId
        const invitationStatusMap = {};
        const eventDjIdMap = {};
        const paymentInfoMap = {};
        event.eventDjs.forEach((ed) => {
          invitationStatusMap[ed.djId] = ed.status;
          eventDjIdMap[ed.djId] = ed.id; // ID de l'EventDj pour le chat
          const resolvePaymentStatus = () => {
            if (ed?.paymentStatus === 'PAID' || ed?.paidAt) return 'PAID';
            if (ed?.contractStatus === 'SIGNED') return 'PENDING'; // Contrat signé = paiement en attente
            if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
            return 'UPCOMING';
          };
          paymentInfoMap[ed.djId] = {
            paymentStatus: resolvePaymentStatus(),
            paymentAmount: ed.paymentAmount ?? null,
            paymentCurrency: ed.paymentCurrency ?? 'eur',
            paidAt: ed.paidAt ?? null,
            invoiceNumber: ed.invoiceNumber ?? null,
          };
        });

        const djUserIds = event.eventDjs.map((ed) => ed.djId);
        const djs = await prisma.userDj.findMany({
          where: {
            userId: { in: djUserIds },
          },
          select: {
            userId: true,
            artistName: true,
          },
        });

        const activeEventVenues = (event.eventVenues || []).filter((ev) => ev.status === 'ACCEPTED' || ev.status === 'PENDING');
        const eventVenue = activeEventVenues[0] || event.eventVenues?.[0];
        const activeEventDjs = (event.eventDjs || []).filter((ed) => ed.status === 'ACCEPTED' || ed.status === 'PENDING');
        const resolveVenuePaymentStatus = (ev) => {
          if (!ev) return 'UPCOMING';
          if (ev?.paymentStatus === 'PAID' || ev?.paidAt) return 'PAID';
          if (ev?.contractStatus === 'SIGNED') return 'PENDING';
          if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
          return 'UPCOMING';
        };
        const allDjContractsSigned = activeEventDjs.length > 0 && activeEventDjs.every((ed) => ed.contractStatus === 'SIGNED');
        const allVenueContractsSigned =
          (event.eventVenues?.length === 0) ||
          (activeEventVenues.length > 0 && activeEventVenues.every((ev) => ev.contractStatus === 'SIGNED'));
        const canPublishToFeed = allDjContractsSigned && allVenueContractsSigned && !event.publishedOnFeed;
        return {
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          price: event.price,
          capacity: event.capacity,
          sold: event.sold,
          genre: event.genre,
          description: event.description,
          image: event.image,
          status: event.status,
          venue: eventVenue ? {
            id: eventVenue.venue?.id ?? eventVenue.venueId,
            venueName: eventVenue.venue?.venueName ?? event.venue?.venueName ?? null,
            address: eventVenue.venue?.address ?? event.venue?.address ?? null,
            eventVenueId: eventVenue?.id ?? null,
            venueInvitationStatus: eventVenue?.status ?? 'PENDING',
            payment: {
              paymentStatus: resolveVenuePaymentStatus(eventVenue),
              paymentAmount: eventVenue?.paymentAmount ?? null,
              paymentCurrency: eventVenue?.paymentCurrency ?? 'eur',
              paidAt: eventVenue?.paidAt ?? null,
              invoiceNumber: eventVenue?.invoiceNumber ?? null,
            },
          } : null,
          djIds: activeEventDjs.map((ed) => ed.djId),
          venueNeedsReplacement: !activeEventVenues.length,
          djs: djs.map((dj) => ({
            userId: dj.userId,
            artistName: dj.artistName,
            invitationStatus: invitationStatusMap[dj.userId] || 'PENDING', // Statut de l'invitation
            eventDjId: eventDjIdMap[dj.userId], // ID de l'EventDj pour le chat
            payment: paymentInfoMap[dj.userId] ?? { paymentStatus: 'UPCOMING' },
          })),
          publishedOnFeed: event.publishedOnFeed ?? false,
          canPublishToFeed,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        };
      })
    );

    res.json({
      success: true,
      events: enrichedEvents,
    });
  } catch (error) {
    console.error('Erreur récupération événements booker:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// Amis Organisateur ↔ Communauté + Staff événement + Scan QR
// ============================================================================

/** GET /api/booker/friends - Liste des amis Communauté du booker (status ACCEPTED) */
app.get('/api/booker/friends', authenticateToken, async (req, res) => {
  try {
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const friends = await prisma.bookerCommunityFriend.findMany({
      where: { bookerId: booker.id, status: 'ACCEPTED' },
      include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
    });
    res.json({
      success: true,
      friends: friends.map((f) => ({
        id: f.id,
        communityId: f.community.id,
        pseudo: f.community.pseudo || 'Anonyme',
        profileImage: f.community.profileImage,
      })),
    });
  } catch (e) {
    console.error('Erreur liste amis booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/booker/friends - Envoyer une demande d'ami (body: { communityId }) */
app.post('/api/booker/friends', authenticateToken, async (req, res) => {
  try {
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const { communityId } = req.body ?? {};
    if (!communityId) return res.status(400).json({ success: false, message: 'communityId requis.' });
    const existing = await prisma.bookerCommunityFriend.findUnique({
      where: { bookerId_communityId: { bookerId: booker.id, communityId } },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(400).json({ success: false, message: 'Déjà amis.' });
      if (existing.status === 'PENDING') return res.status(400).json({ success: false, message: 'Demande déjà envoyée.' });
      return res.status(400).json({ success: false, message: 'Demande précédemment refusée.' });
    }
    const community = await prisma.userCommunity.findUnique({ where: { id: communityId } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté introuvable.' });
    await prisma.bookerCommunityFriend.create({
      data: { bookerId: booker.id, communityId, status: 'PENDING' },
    });
    res.json({ success: true, message: 'Demande envoyée.' });
  } catch (e) {
    console.error('Erreur envoi demande ami booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/community/staff-events - Événements où l'utilisateur (Communauté) est staff */
app.get('/api/community/staff-events', authenticateToken, async (req, res) => {
  try {
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.json({ success: true, events: [] });
    const staffAssignments = await prisma.eventStaff.findMany({
      where: { communityId: community.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            image: true,
            status: true,
            sold: true,
            capacity: true,
          },
        },
      },
    });
    const events = staffAssignments
      .filter((s) => s.event)
      .map((s) => ({ ...s.event, date: s.event.date?.toISOString?.() ?? s.event.date }));
    res.json({ success: true, events });
  } catch (e) {
    console.error('Erreur staff-events:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/community/booker-friend-requests - Demandes reçues (côté Communauté) */
app.get('/api/community/booker-friend-requests', authenticateToken, async (req, res) => {
  try {
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté requis.' });
    const requests = await prisma.bookerCommunityFriend.findMany({
      where: { communityId: community.id, status: 'PENDING' },
      include: { booker: { select: { id: true, pseudo: true, profileImage: true } } },
    });
    res.json({
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        bookerId: r.booker.id,
        pseudo: r.booker.pseudo || 'Organisateur',
        profileImage: r.booker.profileImage,
      })),
    });
  } catch (e) {
    console.error('Erreur demandes amis booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** PUT /api/booker/friends/:id/respond - Accepter ou refuser (body: { accept: true|false }) */
app.put('/api/booker/friends/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body ?? {};
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté requis.' });
    const link = await prisma.bookerCommunityFriend.findUnique({ where: { id } });
    if (!link || link.communityId !== community.id) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (link.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Demande déjà traitée.' });
    await prisma.bookerCommunityFriend.update({
      where: { id },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
    });
    res.json({ success: true, message: accept ? 'Demande acceptée.' : 'Demande refusée.' });
  } catch (e) {
    console.error('Erreur réponse demande ami:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/events/:eventId/staff - Liste du staff (booker ou staff) */
app.get('/api/events/:eventId/staff', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { booker: true, eventStaff: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } } },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isBooker = event.booker?.userId === req.user.id;
    const myCommunity = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    const isStaff = myCommunity && event.eventStaff.some((s) => s.communityId === myCommunity.id);
    if (!isBooker && !isStaff) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    res.json({
      success: true,
      staff: event.eventStaff.map((s) => ({
        communityId: s.community.id,
        pseudo: s.community.pseudo || 'Staff',
        profileImage: s.community.profileImage,
        role: s.role,
      })),
    });
  } catch (e) {
    console.error('Erreur liste staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/events/:eventId/staff - Ajouter un staff (booker uniquement, community doit être ami) */
app.post('/api/events/:eventId/staff', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { communityId, role = 'STAFF_SCAN' } = req.body ?? {};
    if (!communityId) return res.status(400).json({ success: false, message: 'communityId requis.' });
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const event = await prisma.event.findFirst({ where: { id: eventId, bookerId: booker.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isFriend = await prisma.bookerCommunityFriend.findUnique({
      where: { bookerId_communityId: { bookerId: booker.id, communityId } },
    });
    if (!isFriend || isFriend.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Seuls vos amis Communauté peuvent être ajoutés comme staff.' });
    }
    await prisma.eventStaff.upsert({
      where: { eventId_communityId: { eventId, communityId } },
      create: { eventId, communityId, role, addedByBookerId: booker.id },
      update: { role },
    });
    res.json({ success: true, message: 'Staff ajouté.' });
  } catch (e) {
    console.error('Erreur ajout staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** DELETE /api/events/:eventId/staff/:communityId */
app.delete('/api/events/:eventId/staff/:communityId', authenticateToken, async (req, res) => {
  try {
    const { eventId, communityId } = req.params;
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const event = await prisma.event.findFirst({ where: { id: eventId, bookerId: booker.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    await prisma.eventStaff.deleteMany({ where: { eventId, communityId } });
    res.json({ success: true, message: 'Staff retiré.' });
  } catch (e) {
    console.error('Erreur retrait staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/events/:eventId/scan-ticket - Scanner un billet (body: { qrCode } ou { data } du QR) */
app.post('/api/events/:eventId/scan-ticket', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    let qrCode = req.body?.qrCode ?? req.body?.data;
    if (!qrCode && typeof req.body === 'string') qrCode = req.body;
    if (!qrCode) return res.status(400).json({ success: false, message: 'qrCode requis.' });
    // Si le QR contient du JSON (format mobile), extraire qrCode
    if (typeof qrCode === 'object' && qrCode.qrCode) qrCode = qrCode.qrCode;
    if (typeof qrCode === 'string' && qrCode.startsWith('{')) {
      try {
        const parsed = JSON.parse(qrCode);
        qrCode = parsed.qrCode || parsed.data || qrCode;
      } catch {}
    }
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { booker: true, eventStaff: true },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isBooker = event.booker?.userId === req.user.id;
    const myCommunity = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    const isStaff = myCommunity && event.eventStaff.some((s) => s.communityId === myCommunity.id && s.role === 'STAFF_SCAN');
    if (!isBooker && !isStaff) return res.status(403).json({ success: false, message: 'Seul l\'organisateur ou le staff peut scanner.' });
    // Vérifier que le scan est autorisé le jour de l'événement uniquement
    const eventDate = new Date(event.date);
    const now = new Date();
    const sameDay = eventDate.getUTCFullYear() === now.getUTCFullYear() &&
      eventDate.getUTCMonth() === now.getUTCMonth() &&
      eventDate.getUTCDate() === now.getUTCDate();
    if (!sameDay) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Le scan des billets n\'est autorisé que le jour de l\'événement.',
      });
    }
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: { event: { select: { id: true, title: true } }, user: { select: { email: true } } },
    });
    if (!ticket) return res.json({ success: false, valid: false, message: 'Billet introuvable.' });
    if (ticket.eventId !== eventId) return res.json({ success: false, valid: false, message: 'Ce billet n\'est pas pour cet événement.' });
    if (ticket.status === 'used') return res.json({ success: false, valid: false, message: 'Billet déjà utilisé.' });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'used', scannedAt: new Date() },
    });
    res.json({
      success: true,
      valid: true,
      message: 'Billet validé.',
      ticket: { id: ticket.id, eventTitle: ticket.event.title },
    });
  } catch (e) {
    console.error('Erreur scan ticket:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Publier un événement sur le feed (uniquement si tous les contrats sont signés)
 * @route POST /api/booker/events/:eventId/publish-to-feed
 */
app.post('/api/booker/events/:eventId/publish-to-feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, bookerId: booker.id },
      include: { eventDjs: true, eventVenues: true },
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable ou accès refusé.' });
    }

    if (event.publishedOnFeed) {
      return res.status(400).json({ success: false, message: "L'événement est déjà publié sur le feed." });
    }

    const allDjSigned = event.eventDjs.length > 0 && event.eventDjs.every((ed) => ed.contractStatus === 'SIGNED');
    const allVenueSigned = !event.eventVenues?.length || event.eventVenues.every((ev) => ev.contractStatus === 'SIGNED');
    if (!allDjSigned || !allVenueSigned) {
      return res.status(400).json({
        success: false,
        message: "Tous les contrats (DJ et lieu) doivent être signés avant de publier sur le feed.",
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { publishedOnFeed: true },
    });

    return res.json({ success: true, message: "L'événement a été publié sur le feed." });
  } catch (error) {
    console.error('Erreur publication feed:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ MVP: Mettre à jour le statut de paiement d'un booking (Booker -> DJ)
 * @route PUT /api/booker/event-djs/:eventDjId/payment
 * body: { status: 'UPCOMING'|'PENDING'|'PAID', amount?: number (cents), currency?: 'eur', invoiceNumber?: string }
 */
app.put('/api/booker/event-djs/:eventDjId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ed = await prisma.eventDj.findUnique({
      where: { id: eventDjId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ed) return res.status(404).json({ success: false, message: 'Booking (EventDj) introuvable.' });

    // Vérifier que le booker connecté possède cet event
    const isOwner = ed.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ed.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ed.invoiceNumber;

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ed.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ed.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment booking:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Mettre à jour le statut de paiement d'un booking lieu (Booker -> Venue)
 * @route PUT /api/booker/event-venues/:eventVenueId/payment
 * body: { status: 'UPCOMING'|'PENDING'|'PAID', amount?: number (cents), currency?: 'eur', invoiceNumber?: string }
 */
app.put('/api/booker/event-venues/:eventVenueId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ev) return res.status(404).json({ success: false, message: 'Booking (EventVenue) introuvable.' });

    const isOwner = ev.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ev.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ev.invoiceNumber;

    const next = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ev.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ev.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment event-venue:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Contrat booking (MVP) intégré au chat privé Booker <-> DJ
 *
 * Flow:
 * - Booker édite un DRAFT (payload JSON)
 * - Booker "envoie" => status SENT + bookerAcceptedAt + contractHash
 * - DJ "accepte" => status SIGNED + djAcceptedAt (hash immuable)
 */

const stableStringify = (obj) => {
  const seen = new WeakSet();
  const sorter = (v) => {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return null;
      seen.add(v);
      if (Array.isArray(v)) return v.map(sorter);
      return Object.keys(v).sort().reduce((acc, k) => {
        acc[k] = sorter(v[k]);
        return acc;
      }, {});
    }
    return v;
  };
  return JSON.stringify(sorter(obj));
};

const hashContract = (payload) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(stableStringify(payload || {})).digest('hex');
};

const loadEventDjWithAccess = async (eventDjId, userId) => {
  const ed = await prisma.eventDj.findUnique({
    where: { id: eventDjId },
    include: {
      event: { include: { booker: true, venue: true } },
    },
  });
  if (!ed) return { error: { code: 404, message: 'Booking (EventDj) introuvable.' } };
  const isDj = ed.djId === userId;
  const isBooker = ed.event?.booker?.userId === userId;
  if (!isDj && !isBooker) return { error: { code: 403, message: 'Accès refusé.' } };
  return { ed, isDj, isBooker };
};

/**
 * Contrat DJ : ne peut être finalisé (SIGNED) que si le lieu choisi sur l’événement a accepté
 * l’invitation et que le contrat organisateur–lieu est finalisé (accepté par les deux parties ; priorité au volet lieu).
 */
async function getVenueContractGateForDjEvent(eventId, venueId) {
  if (!venueId) {
    return {
      hasVenueOnEvent: false,
      venueInvitationStatus: null,
      venueContractStatus: null,
      canFinalizeDjContract: true,
    };
  }
  const evRow = await prisma.eventVenue.findFirst({
    where: { eventId, venueId },
    select: { status: true, contractStatus: true },
  });
  if (!evRow) {
    return {
      hasVenueOnEvent: true,
      venueInvitationStatus: null,
      venueContractStatus: null,
      canFinalizeDjContract: false,
    };
  }
  const canFinalizeDjContract =
    evRow.status === 'ACCEPTED' && evRow.contractStatus === 'SIGNED';
  return {
    hasVenueOnEvent: true,
    venueInvitationStatus: evRow.status,
    venueContractStatus: evRow.contractStatus,
    canFinalizeDjContract,
  };
}

async function assertVenueContractBeforeDjSign(eventId, venueId) {
  const gate = await getVenueContractGateForDjEvent(eventId, venueId);
  if (gate.canFinalizeDjContract) return { ok: true };
  if (!venueId) return { ok: true };
  if (!gate.venueInvitationStatus) {
    return {
      ok: false,
      message:
        'Finalise d’abord le volet lieu sur cet événement (invitation + contrat lieu) avant d’accepter le contrat DJ.',
    };
  }
  if (gate.venueInvitationStatus !== 'ACCEPTED') {
    return {
      ok: false,
      message: 'Le lieu doit avoir accepté l’invitation avant de finaliser le contrat DJ.',
    };
  }
  return {
    ok: false,
    message: 'Le contrat avec le lieu doit être accepté par les deux parties avant le contrat DJ.',
  };
}

/** Crée un message de notification contrat dans le chat (pour l'autre partie) */
const createContractNotificationMessage = async (eventDjId, senderId, content) => {
  try {
    await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventDjId,
        senderId,
        content,
        read: false,
        deleted: false,
      },
    });
  } catch (err) {
    console.error('Erreur création message notification contrat:', err);
  }
};

/** Crée un message de notification contrat Organisateur ↔ Lieu */
const createContractNotificationMessageVenue = async (eventVenueId, senderId, content) => {
  try {
    await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventVenueId,
        senderId,
        content,
        read: false,
        deleted: false,
      },
    });
  } catch (err) {
    console.error('Erreur création message notification contrat venue:', err);
  }
};

// GET contrat
app.get('/api/contracts/event-djs/:eventDjId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });

    const sentBy = ed.contractSentBy ?? (ed.contractStatus === 'SENT' ? 'BOOKER' : null);

    const venueId = ed.event?.venueId ?? null;
    const venueContractGate = await getVenueContractGateForDjEvent(ed.eventId, venueId);

    return res.json({
      success: true,
      contract: {
        status: ed.contractStatus,
        version: ed.contractVersion,
        payload: ed.contractPayload,
        hash: ed.contractHash,
        sentAt: ed.contractSentAt,
        sentBy,
        bookerAcceptedAt: ed.bookerAcceptedAt,
        djAcceptedAt: ed.djAcceptedAt,
      },
      role: isBooker ? 'BOOKER' : 'DJ',
      venueContractGate,
      booking: {
        eventDjId: ed.id,
        eventId: ed.eventId,
        eventTitle: ed.event?.title,
        eventDate: ed.event?.date,
        eventTime: ed.event?.time,
        durationHours: ed.event?.durationHours ?? null,
        venueName: ed.event?.venue?.venueName ?? null,
        venueAddress: ed.event?.venue?.address ?? null,
      },
    });
  } catch (e) {
    console.error('Erreur get contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Prévisualisation PDF (base64) — même accès que GET contrat ; payload optionnel (brouillon / contre-proposition)
app.post('/api/contracts/event-djs/:eventDjId/preview-pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const rawPayload = req.body?.payload;
    let payloadForPdf = ed.contractPayload ?? {};
    if (rawPayload != null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      if (ed.contractStatus === 'DRAFT' && isBooker) {
        payloadForPdf = rawPayload;
      } else if (ed.contractStatus === 'SENT' && (isBooker || isDj)) {
        payloadForPdf = rawPayload;
      }
    }
    const { buildDjContractPreviewPdf } = require('./utils/contractPreview');
    const pdfBuffer = await buildDjContractPreviewPdf(prisma, ed, payloadForPdf);
    return res.json({
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (e) {
    console.error('Erreur preview PDF contrat DJ:', e);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
});

// Booker: save draft (modifiable tant que pas SENT/SIGNED)
app.put('/api/contracts/event-djs/:eventDjId/draft', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { payload } = req.body ?? {};
    const { ed, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul le booker peut modifier le contrat.' });

    if (ed.contractStatus !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé. Crée un nouveau contrat.' });
    }

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        contractPayload: payload ?? {},
        contractHash: null,
        contractSentAt: null,
        contractSentBy: null,
        bookerAcceptedAt: null,
        djAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        version: next.contractVersion,
        payload: next.contractPayload,
      },
    });
  } catch (e) {
    console.error('Erreur save contract draft:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Booker: send contract (booker accepts)
app.post('/api/contracts/event-djs/:eventDjId/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul le booker peut envoyer le contrat.' });

    if (ed.contractStatus !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    }

    const payload = ed.contractPayload ?? {};
    const hash = hashContract(payload);

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        contractStatus: 'SENT',
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: 'BOOKER',
        bookerAcceptedAt: new Date(),
        djAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });

    // Notification au DJ : nouvelle offre de contrat
    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    await createContractNotificationMessage(
      eventDjId,
      userId,
      `📋 Nouvelle offre de contrat reçue${eventTitle}`
    );

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        hash: next.contractHash,
        sentAt: next.contractSentAt,
        sentBy: next.contractSentBy,
        bookerAcceptedAt: next.bookerAcceptedAt,
      },
    });
  } catch (e) {
    console.error('Erreur send contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Booker/DJ: counter-propose (modifie le payload et renvoie à l'autre partie)
app.post('/api/contracts/event-djs/:eventDjId/counter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { payload } = req.body ?? {};
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });

    if (ed.contractStatus !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Aucune proposition à modifier.' });
    }

    const sender = isBooker ? 'BOOKER' : 'DJ';
    if (!sender) return res.status(403).json({ success: false, message: 'Accès refusé.' });

    const currentSentBy = ed.contractSentBy ?? 'BOOKER';
    // On ne peut contre-proposer que si l'autre partie a envoyé la dernière version
    if (currentSentBy === sender) {
      return res.status(400).json({ success: false, message: 'Tu as déjà la main. Accepte ou attends la réponse.' });
    }

    const nextPayload = payload ?? {};
    const hash = hashContract(nextPayload);

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        contractStatus: 'SENT',
        contractPayload: nextPayload,
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: sender,
        bookerAcceptedAt: sender === 'BOOKER' ? new Date() : null,
        djAcceptedAt: sender === 'DJ' ? new Date() : null,
        contractVersion: { increment: 1 },
      },
    });

    // Notification à l'autre partie : contre-proposition reçue
    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    await createContractNotificationMessage(
      eventDjId,
      userId,
      `📋 Contre-proposition reçue${eventTitle}`
    );

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        version: next.contractVersion,
        payload: next.contractPayload,
        hash: next.contractHash,
        sentAt: next.contractSentAt,
        sentBy: next.contractSentBy,
        bookerAcceptedAt: next.bookerAcceptedAt,
        djAcceptedAt: next.djAcceptedAt,
      },
    });
  } catch (e) {
    console.error('Erreur counter contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Booker/DJ: accept contract (récepteur accepte => SIGNED si les deux ont accepté)
app.post('/api/contracts/event-djs/:eventDjId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });

    if (ed.contractStatus !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Aucun contrat à accepter.' });
    }

    const role = isBooker ? 'BOOKER' : (isDj ? 'DJ' : null);
    if (!role) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    const currentSentBy = ed.contractSentBy ?? 'BOOKER';
    // On ne peut accepter que si l'autre partie a envoyé la dernière version
    if (currentSentBy === role) {
      return res.status(400).json({ success: false, message: 'Tu as déjà accepté cette version. Attends la réponse.' });
    }

    // Re-hash pour revalidation
    const payload = ed.contractPayload ?? {};
    const expectedHash = ed.contractHash ?? '';
    const actualHash = hashContract(payload);
    if (!expectedHash || expectedHash !== actualHash) {
      return res.status(400).json({ success: false, message: 'Contrat invalide (hash mismatch). Renvoie le contrat.' });
    }

    const now = new Date();
    const nextBookerAt = role === 'BOOKER' ? now : ed.bookerAcceptedAt;
    const nextDjAt = role === 'DJ' ? now : ed.djAcceptedAt;
    const willSign = !!nextBookerAt && !!nextDjAt;
    if (willSign) {
      const assert = await assertVenueContractBeforeDjSign(ed.eventId, ed.event?.venueId ?? null);
      if (!assert.ok) {
        return res.status(400).json({ success: false, message: assert.message });
      }
    }

    const data = {
      // Compat: si un ancien contrat SENT n'a pas sentBy, on le fixe à BOOKER
      contractSentBy: ed.contractSentBy ?? 'BOOKER',
      bookerAcceptedAt: role === 'BOOKER' ? now : ed.bookerAcceptedAt,
      djAcceptedAt: role === 'DJ' ? now : ed.djAcceptedAt,
    };

    const updated = await prisma.eventDj.update({
      where: { id: eventDjId },
      data,
    });

    const shouldSign = !!updated.bookerAcceptedAt && !!updated.djAcceptedAt;
    const next = shouldSign
      ? await prisma.eventDj.update({
          where: { id: eventDjId },
          data: {
            contractStatus: 'SIGNED',
            // Mettre paymentStatus à PENDING après validation du prix (contrat signé)
            ...(updated.paymentStatus !== 'PAID' && !updated.paidAt
              ? { paymentStatus: 'PENDING' }
              : {}),
          },
        })
      : updated;

    // Notification à l'autre partie : contrat accepté ou signé
    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    const notifContent = shouldSign
      ? `📋 Contrat signé !${eventTitle}`
      : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessage(eventDjId, userId, notifContent);

    // Envoi du contrat par email aux deux parties une fois signé
    if (shouldSign) {
      const { sendContractSignedEmailDj } = require('./utils/contractEmail');
      sendContractSignedEmailDj(eventDjId).catch((err) => console.error('[contract] Email:', err));
    }

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        version: next.contractVersion,
        hash: next.contractHash,
        sentAt: next.contractSentAt,
        sentBy: next.contractSentBy,
        bookerAcceptedAt: next.bookerAcceptedAt,
        djAcceptedAt: next.djAcceptedAt,
      },
    });
  } catch (e) {
    console.error('Erreur accept contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Contrats Organisateur ↔ Lieu (même logique que EventDj)
 */
const loadEventVenueWithAccess = async (eventVenueId, userId) => {
  const ev = await prisma.eventVenue.findUnique({
    where: { id: eventVenueId },
    include: { event: { include: { booker: true } }, venue: true },
  });
  if (!ev) return { error: { code: 404, message: 'EventVenue introuvable.' } };
  const isBooker = ev.event?.booker?.userId === userId;
  const isVenue = ev.venue?.userId === userId;
  if (!isBooker && !isVenue) return { error: { code: 403, message: 'Accès refusé.' } };
  return { ev, isBooker, isVenue };
};

app.get('/api/contracts/event-venues/:eventVenueId', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { ev, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const sentBy = ev.contractSentBy ?? (ev.contractStatus === 'SENT' ? 'BOOKER' : null);
    return res.json({
      success: true,
      contract: {
        status: ev.contractStatus,
        version: ev.contractVersion,
        hash: ev.contractHash,
        sentAt: ev.contractSentAt,
        sentBy,
        bookerAcceptedAt: ev.bookerAcceptedAt,
        venueAcceptedAt: ev.venueAcceptedAt,
        payload: ev.contractPayload,
      },
      booking: {
        eventVenueId: ev.id,
        eventId: ev.eventId,
        eventTitle: ev.event?.title,
        eventDate: ev.event?.date,
        eventTime: ev.event?.time ?? null,
        durationHours: ev.event?.durationHours ?? null,
        venueName: ev.venue?.venueName,
      },
    });
  } catch (e) {
    console.error('Erreur get contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/preview-pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;
    const { isBooker, isVenue, error } = await loadEventVenueWithAccess(eventVenueId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const full = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { include: { booker: true, venue: true } }, venue: true },
    });
    if (!full) return res.status(404).json({ success: false, message: 'Introuvable.' });
    const rawPayload = req.body?.payload;
    let payloadForPdf = full.contractPayload ?? {};
    if (rawPayload != null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      if (full.contractStatus === 'DRAFT' && isBooker) {
        payloadForPdf = rawPayload;
      } else if (full.contractStatus === 'SENT' && (isBooker || isVenue)) {
        payloadForPdf = rawPayload;
      }
    }
    const { buildVenueContractPreviewPdf } = require('./utils/contractPreview');
    const pdfBuffer = await buildVenueContractPreviewPdf(prisma, full, payloadForPdf);
    return res.json({
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (e) {
    console.error('Erreur preview PDF contrat lieu:', e);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
});

app.put('/api/contracts/event-venues/:eventVenueId/draft', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { payload } = req.body ?? {};
    const { ev, isBooker, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut modifier le brouillon.' });
    if (ev.contractStatus !== 'DRAFT') return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    const next = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        contractPayload: payload ?? {},
        contractHash: null,
        contractSentAt: null,
        contractSentBy: null,
        bookerAcceptedAt: null,
        venueAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });
    return res.json({ success: true, contract: { status: next.contractStatus, version: next.contractVersion, payload: next.contractPayload } });
  } catch (e) {
    console.error('Erreur save contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/send', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { ev, isBooker, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut envoyer le contrat.' });
    if (ev.contractStatus !== 'DRAFT') return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    const payload = ev.contractPayload ?? {};
    const hash = hashContract(payload);
    await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        contractStatus: 'SENT',
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: 'BOOKER',
        bookerAcceptedAt: new Date(),
        venueAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, `📋 Nouvelle offre de contrat reçue${eventTitle}`);
    return res.json({ success: true, contract: { status: 'SENT' } });
  } catch (e) {
    console.error('Erreur send contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/counter', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { payload } = req.body ?? {};
    const { ev, isBooker, isVenue, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (ev.contractStatus !== 'SENT') return res.status(400).json({ success: false, message: 'Aucune proposition à modifier.' });
    const sender = isBooker ? 'BOOKER' : 'VENUE';
    const currentSentBy = ev.contractSentBy ?? 'BOOKER';
    if (currentSentBy === sender) return res.status(400).json({ success: false, message: 'Tu as déjà la main.' });
    const nextPayload = payload ?? {};
    const hash = hashContract(nextPayload);
    await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        contractStatus: 'SENT',
        contractPayload: nextPayload,
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: sender,
        bookerAcceptedAt: sender === 'BOOKER' ? new Date() : null,
        venueAcceptedAt: sender === 'VENUE' ? new Date() : null,
        contractVersion: { increment: 1 },
      },
    });
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, `📋 Contre-proposition reçue${eventTitle}`);
    return res.json({ success: true, contract: { status: 'SENT' } });
  } catch (e) {
    console.error('Erreur counter contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/accept', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { ev, isBooker, isVenue, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (ev.contractStatus !== 'SENT') return res.status(400).json({ success: false, message: 'Aucun contrat à accepter.' });
    const role = isBooker ? 'BOOKER' : (isVenue ? 'VENUE' : null);
    if (!role) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    const currentSentBy = ev.contractSentBy ?? 'BOOKER';
    if (currentSentBy === role) return res.status(400).json({ success: false, message: 'Tu as déjà accepté.' });
    const payload = ev.contractPayload ?? {};
    const expectedHash = ev.contractHash ?? '';
    const actualHash = hashContract(payload);
    if (!expectedHash || expectedHash !== actualHash) return res.status(400).json({ success: false, message: 'Contrat invalide.' });
    const now = new Date();
    const data = {
      contractSentBy: ev.contractSentBy ?? 'BOOKER',
      bookerAcceptedAt: role === 'BOOKER' ? now : ev.bookerAcceptedAt,
      venueAcceptedAt: role === 'VENUE' ? now : ev.venueAcceptedAt,
    };
    const updated = await prisma.eventVenue.update({ where: { id: eventVenueId }, data });
    const shouldSign = !!updated.bookerAcceptedAt && !!updated.venueAcceptedAt;
    if (shouldSign) {
      await prisma.eventVenue.update({
        where: { id: eventVenueId },
        data: {
          contractStatus: 'SIGNED',
          ...(updated.paymentStatus !== 'PAID' && !updated.paidAt ? { paymentStatus: 'PENDING' } : {}),
        },
      });
    }
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    const notifContent = shouldSign ? `📋 Contrat signé !${eventTitle}` : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, notifContent);

    // Envoi du contrat par email aux deux parties une fois signé
    if (shouldSign) {
      const { sendContractSignedEmailVenue } = require('./utils/contractEmail');
      sendContractSignedEmailVenue(eventVenueId).catch((err) => console.error('[contract] Email:', err));
    }

    return res.json({ success: true, contract: { status: shouldSign ? 'SIGNED' : 'SENT' } });
  } catch (e) {
    console.error('Erreur accept contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Supprimer un événement (Booker)
 * @route DELETE /api/booker/events/:eventId
 */
app.delete('/api/booker/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Vérifier que l'événement existe et appartient au booker
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        booker: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé.',
      });
    }

    if (event.bookerId !== booker.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres événements.',
      });
    }

    // Vérifier s'il y a des tickets vendus
    const ticketsCount = await prisma.ticket.count({
      where: { eventId: eventId },
    });

    if (ticketsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer l'événement : ${ticketsCount} ticket(s) déjà vendu(s).`,
      });
    }

    // Supprimer les EventDj associés (cascade)
    await prisma.eventDj.deleteMany({
      where: { eventId: eventId },
    });

    // Supprimer l'événement
    await prisma.event.delete({
      where: { id: eventId },
    });

    res.json({
      success: true,
      message: 'Événement supprimé avec succès.',
    });
  } catch (error) {
    console.error('Erreur suppression événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Modifier un événement (Booker) - champs limités
 * @route PUT /api/booker/events/:eventId
 * body (tous optionnels): { title?, description?, image?, genre?, location?, time? }
 */
app.put('/api/booker/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { title, description, image, genre, location, time, durationHours } = req.body ?? {};

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    // Vérifier que l'événement existe et appartient au booker
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }
    if (event.bookerId !== booker.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
    }

    const data = {};
    if (typeof title === 'string') data.title = title.trim();
    if (typeof description === 'string') data.description = description.trim() || null;
    if (typeof image === 'string') data.image = image.trim() || null;
    if (typeof genre === 'string') data.genre = genre.trim() || event.genre;
    if (typeof location === 'string') data.location = location.trim() || event.location;
    if (typeof time === 'string') data.time = time.trim() || event.time;
    if (durationHours !== undefined) {
      if (durationHours === null || durationHours === '') {
        data.durationHours = null;
      } else {
        const n = parseFloat(String(durationHours).replace(',', '.'));
        if (Number.isFinite(n) && n > 0) data.durationHours = n;
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à modifier.' });
    }

    // Empêcher les changements "critiques" via cet endpoint
    delete data.price;
    delete data.capacity;
    delete data.sold;
    delete data.status;
    delete data.date;
    delete data.venueId;
    delete data.bookerId;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
    });

    return res.json({ success: true, message: 'Événement modifié.', event: updated });
  } catch (error) {
    console.error('Erreur modification événement:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Uploader une image pour un événement (Booker)
 * @route POST /api/booker/events/:eventId/upload-image
 * form-data: image=<file>
 */
app.post(
  '/api/booker/events/:eventId/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      const booker = await prisma.userBooker.findFirst({ where: { userId } });
      if (!booker) {
        return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
      }
      if (event.bookerId !== booker.id) {
        return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucune image fournie.' });
      }

      if (!req.file.mimetype.startsWith('image/')) {
        if (MEDIA_STORAGE === 'local' && req.file.filename) {
          const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ success: false, message: 'Le fichier doit être une image.' });
      }

      let imageUrl = null;
      if (MEDIA_STORAGE === 'r2') {
        const key = makeObjectKey('events', req.file.originalname);
        const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
        imageUrl = uploaded.url;
      } else {
        // ✅ CORRECTION: Utiliser PUBLIC_URL en priorité pour éviter les URLs temporaires
        const publicUrl = process.env.PUBLIC_URL;
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = publicUrl
          ? publicUrl.replace(/\/$/, '')
          : (origin ? origin.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`);
        imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      }

      await prisma.event.update({
        where: { id: eventId },
        data: { image: imageUrl },
      });

      return res.json({ success: true, imageUrl });
    } catch (error) {
      console.error('Erreur upload image event:', error);
      if (MEDIA_STORAGE === 'local' && req.file && req.file.filename) {
        const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
);

/**
 * Crée un nouvel événement pour un booker
 * @route POST /api/booker/events
 */
app.post('/api/booker/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      date,
      time,
      venueId,
      djIds,
      djSlotAssignments,
      price,
      capacity,
      genre,
      description,
      image,
      durationHours,
    } = req.body;

    // Validation des champs requis
    if (!title || !date || !time || !venueId || !djIds || !Array.isArray(djIds) || djIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Les champs title, date, time, venueId et djIds (tableau non vide) sont requis.',
      });
    }

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Vérifier que le lieu existe et récupérer sa note moyenne
    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        venueName: true,
        address: true,
        averageRatingGlobal: true,
      },
    });

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Lieu non trouvé.',
      });
    }

    // Vérifier que les DJs existent et sont disponibles
    const djs = await prisma.userDj.findMany({
      where: {
        userId: { in: djIds },
        availableStatus: true,
      },
      select: {
        userId: true,
        artistName: true,
      },
    });

    if (djs.length !== djIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Un ou plusieurs DJs ne sont pas disponibles ou n\'existent pas.',
      });
    }

    const durationParsed =
      durationHours != null && durationHours !== ''
        ? parseFloat(String(durationHours).replace(',', '.'))
        : null;
    const durationForSlots =
      Number.isFinite(durationParsed) && durationParsed > 0 ? durationParsed : null;

    if (djSlotAssignments != null) {
      if (!Array.isArray(djSlotAssignments)) {
        return res.status(400).json({
          success: false,
          message: 'djSlotAssignments doit être un tableau.',
        });
      }
      if (djSlotAssignments.length > djIds.length) {
        return res.status(400).json({
          success: false,
          message: 'djSlotAssignments ne peut pas dépasser le nombre de DJs.',
        });
      }
      for (let i = 0; i < djSlotAssignments.length; i++) {
        const a = djSlotAssignments[i];
        if (a == null || typeof a !== 'object') continue;
        const ss = a.slotStart != null ? String(a.slotStart).trim() : '';
        const se = a.slotEnd != null ? String(a.slotEnd).trim() : '';
        if (!ss && !se) continue;
        if (!ss || !se) {
          return res.status(400).json({
            success: false,
            message: 'Chaque créneau DJ doit avoir slotStart et slotEnd (format HH:mm).',
          });
        }
        if (durationForSlots != null) {
          const fit = djSlotFitsEventWindow(ss, se, String(time).trim(), durationForSlots);
          if (!fit.ok) {
            return res.status(400).json({ success: false, message: fit.message });
          }
        }
      }
    }

    // ✅ Le prix DJ n'est plus auto-calculé: il sera défini via contrat Booker ↔ DJ.
    const calculatedPrice = price ? parseFloat(price) : 0;

    // Vérifier les conflits de date/lieu
    // Convertir la date en DateTime
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Date invalide.',
      });
    }

    // Vérifier que la date n'est pas dans le passé (on compare uniquement la date, pas l'heure)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventDay < today) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de créer un événement à une date passée.',
      });
    }

    // Créer les dates de début et fin de journée sans modifier l'objet original
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Vérifier s'il y a déjà un événement à ce lieu à cette date
    const conflictingEvent = await prisma.event.findFirst({
      where: {
        venueId: venueId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['UPCOMING', 'ONGOING'],
        },
        // Exclure l'événement actuel si on est en mode édition (pas le cas ici, mais pour sécurité)
        id: {
          not: undefined, // Pas de filtre, on cherche tous les événements
        },
      },
    });

    if (conflictingEvent) {
      return res.status(409).json({
        success: false,
        message: 'Un événement existe déjà à ce lieu à cette date.',
        conflictingEvent: {
          id: conflictingEvent.id,
          title: conflictingEvent.title,
          date: conflictingEvent.date,
        },
      });
    }

    // Vérifier que les DJs ne sont pas déjà bookés à cette date (seulement les invitations ACCEPTED)
    const conflictingDjEvents = await prisma.eventDj.findMany({
      where: {
        djId: { in: djIds },
        status: 'ACCEPTED', // Seulement les invitations acceptées comptent comme des réservations
        event: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            in: ['UPCOMING', 'ONGOING'],
          },
        },
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
          },
        },
      },
    });

    if (conflictingDjEvents.length > 0) {
      // Trouver tous les DJs en conflit
      const conflictingDjs = conflictingDjEvents.map(ed => {
        const dj = djs.find(d => d.userId === ed.djId);
        return dj?.artistName || 'DJ inconnu';
      });

      const conflictingDj = conflictingDjEvents[0];
      const dj = djs.find(d => d.userId === conflictingDj.djId);
      
      return res.status(409).json({
        success: false,
        message: conflictingDjs.length === 1
          ? `Le DJ ${dj?.artistName || 'sélectionné'} est déjà booké à cette date.`
          : `Les DJs ${conflictingDjs.join(', ')} sont déjà bookés à cette date.`,
        conflictingEvent: {
          id: conflictingDj.event.id,
          title: conflictingDj.event.title,
          date: conflictingDj.event.date,
          time: conflictingDj.event.time,
        },
        conflictingDjs: conflictingDjs,
      });
    }

    // Créer l'événement
    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        date: eventDate,
        time: time.trim(),
          durationHours:
          durationHours != null && durationHours !== ''
            ? (() => {
                const n = parseFloat(String(durationHours).replace(',', '.'));
                return Number.isFinite(n) && n > 0 ? n : null;
              })()
            : null,
        location: venue.address,
        price: calculatedPrice,
        capacity: capacity ? parseInt(capacity) : 100,
        genre: genre ? genre.trim() : 'Mixed',
        description: description ? description.trim() : null,
        image: image || null,
        venueId: venueId,
        bookerId: booker.id,
        status: 'UPCOMING',
        eventDjs: {
          create: djIds.map((djId, idx) => {
            const a = Array.isArray(djSlotAssignments) ? djSlotAssignments[idx] : null;
            const ss = a?.slotStart != null ? String(a.slotStart).trim() : '';
            const se = a?.slotEnd != null ? String(a.slotEnd).trim() : '';
            const hasSlot = ss && se;
            return {
              djId,
              status: 'PENDING', // Les invitations commencent en PENDING
              slotStart: hasSlot ? ss : null,
              slotEnd: hasSlot ? se : null,
            };
          }),
        },
        eventVenues: {
          create: {
            venueId: venueId,
            status: 'PENDING', // Invitation lieu en attente
          },
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            venueName: true,
            address: true,
          },
        },
        eventDjs: {
          include: {},
        },
        eventVenues: {
          include: {},
        },
      },
    });

    // Créer automatiquement un message de bienvenue dans le chat de groupe
    try {
      await prisma.message.create({
        data: {
          type: 'GROUP',
          eventId: event.id,
          eventDjId: null, // Explicitement null pour les messages de groupe
          senderId: userId,
          content: `🎉 Événement "${event.title}" créé ! Bienvenue dans le chat de groupe. Vous pouvez discuter ici avec tous les participants.`,
          read: false,
          deleted: false,
        },
      });
    } catch (groupChatError) {
      console.error('Erreur création message chat de groupe:', groupChatError);
      // Ne pas bloquer la création de l'événement si le chat échoue
    }

    // Créer automatiquement un message de bienvenue dans chaque chat privé (DJ)
    for (const eventDj of event.eventDjs) {
      try {
        await prisma.message.create({
          data: {
            type: 'PRIVATE',
            eventDjId: eventDj.id,
            senderId: userId,
            content: `👋 Bonjour ! Vous avez été invité à l'événement "${event.title}". N'hésitez pas à me contacter si vous avez des questions.`,
            read: false,
            deleted: false,
          },
        });
      } catch (privateChatError) {
        console.error(`Erreur création message chat privé pour EventDj ${eventDj.id}:`, privateChatError);
      }
    }

    // Créer message de bienvenue dans le chat privé Organisateur ↔ Lieu
    const eventVenues = event.eventVenues || [];
    for (const ev of eventVenues) {
      try {
        await prisma.message.create({
          data: {
            type: 'PRIVATE',
            eventVenueId: ev.id,
            senderId: userId,
            content: `👋 Bonjour ! Votre lieu a été sélectionné pour l'événement "${event.title}". N'hésitez pas à me contacter pour discuter des modalités.`,
            read: false,
            deleted: false,
          },
        });
      } catch (e) {
        console.error(`Erreur création message chat EventVenue ${ev.id}:`, e);
      }
    }

    // Récupérer les infos des DJs pour la réponse
    const eventDjsInfo = await prisma.userDj.findMany({
      where: {
        userId: { in: djIds },
      },
      select: {
        userId: true,
        artistName: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Événement créé avec succès.',
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price, // Le prix calculé est déjà dans event.price
        capacity: event.capacity,
        genre: event.genre,
        description: event.description,
        image: event.image,
        status: event.status,
        venue: {
          id: event.venue.id,
          name: event.venue.venueName,
          address: event.venue.address,
        },
        djs: eventDjsInfo.map((dj) => ({
          userId: dj.userId,
          artistName: dj.artistName,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur création événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement.',
    });
  }
});

/**
 * Ajouter un DJ à un événement existant (Booker)
 * @route POST /api/booker/events/:eventId/djs
 */
app.post('/api/booker/events/:eventId/djs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { djId } = req.body;

    if (!djId) {
      return res.status(400).json({
        success: false,
        message: 'Le champ djId est requis.',
      });
    }

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Vérifier que l'événement existe et appartient au booker
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé.',
      });
    }

    if (event.bookerId !== booker.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres événements.',
      });
    }

    // Vérifier que le DJ existe
    const dj = await prisma.userDj.findFirst({
      where: { userId: djId },
    });

    if (!dj) {
      return res.status(404).json({
        success: false,
        message: 'DJ non trouvé.',
      });
    }

    // Vérifier que ce DJ n'est pas déjà associé à cet événement
    const existingEventDj = await prisma.eventDj.findUnique({
      where: {
        eventId_djId: {
          eventId,
          djId,
        },
      },
    });

    if (existingEventDj) {
      return res.status(400).json({
        success: false,
        message: 'Ce DJ est déjà associé à cet événement.',
      });
    }

    // Créer l'association EventDj avec statut en attente par défaut
    const newEventDj = await prisma.eventDj.create({
      data: {
        eventId,
        djId,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'DJ ajouté à l\'événement avec succès.',
      eventDj: newEventDj,
    });
  } catch (error) {
    console.error('Erreur ajout DJ à un événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Ajouter un lieu à un événement existant (remplacement après annulation)
 * @route POST /api/booker/events/:eventId/venues
 */
app.post('/api/booker/events/:eventId/venues', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { venueId } = req.body;

    if (!venueId) {
      return res.status(400).json({ success: false, message: 'Le champ venueId est requis.' });
    }

    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }
    if (event.bookerId !== booker.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
    }

    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    const existingEventVenue = await prisma.eventVenue.findUnique({
      where: { eventId_venueId: { eventId, venueId } },
    });
    let newEventVenue;
    if (existingEventVenue) {
      if (existingEventVenue.status !== 'CANCELLED' && existingEventVenue.status !== 'REJECTED') {
        return res.status(400).json({
          success: false,
          message: 'Ce lieu est déjà associé à cet événement.',
        });
      }
      newEventVenue = await prisma.eventVenue.update({
        where: { id: existingEventVenue.id },
        data: { status: 'PENDING', rejectionReason: null },
      });
    } else {
      newEventVenue = await prisma.eventVenue.create({
        data: { eventId, venueId, status: 'PENDING' },
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { venueId },
    });

    res.status(201).json({
      success: true,
      message: 'Lieu ajouté à l\'événement avec succès.',
      eventVenue: newEventVenue,
    });
  } catch (error) {
    console.error('Erreur ajout lieu à un événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupère le classement des DJs basé sur leurs notes moyennes
 * @route GET /api/djs/ranking
 */
app.get('/api/djs/ranking', async (req, res) => {
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
      },
      orderBy: {
        averageRatingGlobal: 'desc',
      },
    });

    const formattedDjs = djs.map((dj, index) => ({
      id: dj.id,
      userId: dj.userId,
      artistName: dj.artistName,
      city: dj.city,
      currentRank: index + 1,
      score: Math.round(dj.averageRatingGlobal * 100) || 0,
      averageRatingGlobal: dj.averageRatingGlobal,
      totalRatings: dj.totalRatingsCommunity + dj.totalRatingsBooker + dj.totalRatingsVenue,
    }));

    res.json({ success: true, djs: formattedDjs });
  } catch (error) {
    console.error('Erreur récupération classement DJs:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

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
        const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
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
      const filePath = path.join(__dirname, 'uploads', 'media', req.file.filename);
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

    const formattedEvents = upcomingEvents.map((event) => ({
      type: 'event',
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      price: event.price,
      genre: event.genre,
      image: normalizeImageUrl(event.image),
      venue: event.venue ? { name: event.venue.venueName, address: event.venue.address } : null,
      booker: event.booker ? { name: event.booker.pseudo?.trim() || `${event.booker.nom} ${event.booker.prenom}` } : null,
      createdAt: event.createdAt,
    }));

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
    const formattedEvents = upcomingEvents.map((event) => ({
      type: 'event',
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      location: event.location,
      price: event.price,
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
    }));

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

/**
 * Endpoint de test pour vérifier que le serveur fonctionne
 * @route GET /api/test
 */
app.get('/api/test', async (req, res) => {
  try {
    const [registeredUsers, eventsCount] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
    ]);
    
    res.json({
      message: '🎉 Backend Insane Nights & Days fonctionne parfaitement',
      timestamp: new Date().toISOString(),
      walletUsersCount: 0, // Plus utilisé, gardé pour compatibilité
      registeredUsersCount: registeredUsers,
      eventsCount: eventsCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors du test.' });
  }
});

// Mettre à jour les statuts au démarrage (désactivable en prod)
const ENABLE_EVENT_STATUS_CRON = (process.env.ENABLE_EVENT_STATUS_CRON ?? 'true').toLowerCase() === 'true';
if (ENABLE_EVENT_STATUS_CRON) {
  updateEventStatuses();
  // Mettre à jour les statuts toutes les 5 minutes
  setInterval(updateEventStatuses, 5 * 60 * 1000);
} else {
  console.log('⏸️  Cron status événements désactivé (ENABLE_EVENT_STATUS_CRON=false)');
}

// Railway expects the app to listen on all interfaces.
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur Insane Nights & Days démarré sur le port ${PORT}`);
  console.log(`🔗 Test local: http://localhost:${PORT}/api/test`);
  if (ENABLE_EVENT_STATUS_CRON) {
    console.log(`⏰ Mise à jour automatique des statuts d'événements activée (toutes les 5 minutes)`);
  }
});

server.on('error', (err) => {
  console.error('❌ Erreur serveur HTTP:', err);
});

const shutdown = async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Log but try not to hard-crash in production.
process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});


