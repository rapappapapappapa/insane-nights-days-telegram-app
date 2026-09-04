/**
 * Serveur principal NOX
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
const {
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  deleteFromR2,
} = require('./utils/mediaStorage');
const { parseTicketQuantity } = require('./utils/validation');
const { djSlotFitsEventWindow } = require('./utils/djSlotWindow');

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

// ✅ Sécurité: Rate limiting général (défaut 2000 req/15min par IP, voir RATE_LIMIT_MAX)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 2000,
  message: { success: false, message: 'Trop de requêtes. Réessayez plus tard.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.warn('[rateLimit] 429 général', req.ip, req.method, req.originalUrl);
    res.status(options.statusCode).json(options.message);
  },
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
app.use('/api/auth/google', authLimiter);
app.use('/api/auth/apple', authLimiter);

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

// Note: les webhooks (Stripe, Yousign) ont besoin du body brut pour vérifier la signature.
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    if (req.originalUrl && req.originalUrl.startsWith('/api/webhooks/')) {
      req.rawBody = buf;
    }
  },
})); // Augmenter la limite pour les vidéos
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ Healthcheck Railway (+ ping DB pour diagnostic « tout vide » sans erreur applicative)
app.get('/api/health', async (req, res) => {
  let emailConfigured = false;
  let dbOk = false;
  try {
    const prismaHealth = require('./lib/prisma');
    await prismaHealth.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch (e) {
    console.error('[health] DB indisponible:', e?.message || e);
  }
  try {
    const { isConfigured, getProvider } = require('./utils/mailer');
    emailConfigured = isConfigured();
    const payload = { success: true, status: 'ok', db: dbOk, emailConfigured };
    if (emailConfigured) payload.emailProvider = getProvider();
    res.json(payload);
  } catch {
    res.json({ success: true, status: 'ok', db: dbOk, emailConfigured: false });
  }
});
const prisma = require('./lib/prisma');

require('./routes/registerAdminAndReports')(app, {
  authenticateToken,
  requireAdmin,
  bcrypt,
  MEDIA_STORAGE,
  deleteFromR2,
});

require('./routes/registerChatRoutes')(app, {
  authenticateToken,
});

require('./routes/registerPushRoutes')(app, {
  authenticateToken,
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

// Pages légales publiques (URL requise par App Store / Play Store)
app.use('/legal', express.static(path.join(__dirname, 'public', 'legal')));

// Servir les fichiers statiques uniquement en mode local
if (MEDIA_STORAGE === 'local') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}
// Servir les fichiers uploadés de manière statique
// (déplacé plus haut: conditionnel selon MEDIA_STORAGE)

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


require('./routes/registerTicketsAndPayments')(app, {
  authenticateToken,
  parseTicketQuantity,
  uuidv4,
  stripe,
  stripeSecretKey,
  stripePublishableKey,
  stripeWebhookSecret,
  eurosToCents,
});

require('./routes/registerFeedRoutes')(app, {
  authenticateToken,
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  uploadLocal,
  uploadMemory,
});

require('./routes/registerBookerOrganizerRoutes')(app, {
  authenticateToken,
  djSlotFitsEventWindow,
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  uploadLocal,
  uploadMemory,
});

// ============================================================================
// ROUTES MODULAIRES
// ============================================================================

app.use('/api/auth', authRoutes);

const profileDeps = {
  authenticateToken,
  authController,
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  deleteFromR2,
  uploadLocal,
  uploadMemory,
};

require('./routes/registerUserProfileUploadRoutes')(app, profileDeps);
require('./routes/registerProfileRoutes')(app, profileDeps);

app.use('/api/user', userRoutes);

app.post('/api/wallet/connect', authController.connectWallet);

const { updateEventStatuses } = require('./routes/registerEventPublicRoutes')(app, {
  authenticateToken,
  userController,
});

require('./routes/registerRatingRoutes')(app, { authenticateToken });
require('./routes/registerDjPublicRoutes')(app, {});
require('./routes/registerMediaBookingsRoutes')(app, profileDeps);
require('./routes/registerMiscRoutes')(app, { authenticateToken });
require('./routes/registerYousignWebhook')(app);

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
  console.log(`🚀 Serveur NOX démarré sur le port ${PORT}`);
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


