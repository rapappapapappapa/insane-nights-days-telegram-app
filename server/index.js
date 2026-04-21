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


