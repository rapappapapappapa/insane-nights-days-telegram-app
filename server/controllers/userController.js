/**
 * Contrôleur pour la gestion des utilisateurs et profils
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { validatePassword } = require('../utils/validation');
const { handleError, sendError, sendSuccess } = require('../utils/helpers');

const prisma = new PrismaClient();
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';
const dlog = (...args) => {
  if (DEBUG_LOGS) console.log(...args);
};

/**
 * Récupère tous les profils d'un utilisateur (Community, DJ, Booker, Venue)
 * @param {Object} req - Requête Express (contient req.user depuis authenticateToken)
 * @param {Object} res - Réponse Express
 */
const getUserProfiles = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        communities: true,
        djs: true,
        bookers: true,
        venues: true,
        prestataires: true,
      },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    const profiles = {
      community: user.communities.map((c) => ({
        id: c.id,
        type: 'COMMUNITY',
        pseudo: c.pseudo,
        nom: c.nom,
        prenom: c.prenom,
        pays: c.pays,
        isnNumber: c.isnNumber,
        profileImage: c.profileImage,
        bannerImage: c.bannerImage,
        genres: c.genres,
      })),
      dj: user.djs.map((d) => ({
        id: d.id,
        type: 'DJ',
        artistName: d.artistName,
        city: d.city,
        profileImage: d.profileImage,
        legalName: d.legalName,
        address: d.address,
        postalCode: d.postalCode,
        country: d.country,
        siret: d.siret,
        vatNumber: d.vatNumber,
      })),
      booker: user.bookers.map((b) => ({
        id: b.id,
        type: 'BOOKER',
        pseudo: b.pseudo,
        nom: b.nom,
        prenom: b.prenom,
        phonePro: b.phonePro,
        bookerType: b.bookerType,
        profileImage: b.profileImage,
        companyName: b.companyName,
        address: b.address,
        postalCode: b.postalCode,
        city: b.city,
        country: b.country,
        siret: b.siret,
        rentalEquipmentInventory: Array.isArray(b.rentalEquipmentInventory) ? b.rentalEquipmentInventory : [],
      })),
      venue: user.venues.map((v) => ({
        id: v.id,
        type: 'VENUE',
        venueName: v.venueName,
        address: v.address,
        profileImage: v.profileImage,
        bannerImage: v.bannerImage,
        companyName: v.companyName,
        legalRepresentative: v.legalRepresentative,
        postalCode: v.postalCode,
        city: v.city,
        country: v.country,
        siret: v.siret,
        maxCapacity: v.maxCapacity ?? null,
      })),
      prestataire: user.prestataires.map((p) => ({
        id: p.id,
        type: 'PRESTATAIRE',
        businessName: p.businessName,
        prestationGenres: Array.isArray(p.prestationGenres) ? p.prestationGenres : [],
        phonePro: p.phonePro,
        city: p.city,
        country: p.country,
        bio: p.bio,
        profileImage: p.profileImage,
        bannerImage: p.bannerImage,
        availableDays: p.availableDays,
        availableStatus: p.availableStatus,
      })),
    };

    return sendSuccess(res, {
      activeProfileType: user.activeProfileType,
      profiles,
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Bascule le profil actif d'un utilisateur
 * @param {Object} req - Requête Express
 * @param {Object} req.body.profileType - Type de profil ('COMMUNITY', 'DJ', 'BOOKER', 'VENUE')
 * @param {Object} res - Réponse Express
 */
const switchProfile = async (req, res) => {
  try {
    const { profileType } = req.body;
    const userId = req.user.id;

    const validProfileTypes = ['COMMUNITY', 'DJ', 'BOOKER', 'VENUE', 'PRESTATAIRE'];
    if (!profileType || !validProfileTypes.includes(profileType)) {
      return sendError(res, 'profileType requis et doit être COMMUNITY, DJ, BOOKER, VENUE ou PRESTATAIRE.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        communities: true,
        djs: true,
        bookers: true,
        venues: true,
        prestataires: true,
      },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    // Vérifier que l'utilisateur a au moins un profil du type demandé
    let hasProfile = false;
    switch (profileType) {
      case 'COMMUNITY':
        hasProfile = user.communities && user.communities.length > 0;
        break;
      case 'DJ':
        hasProfile = user.djs && user.djs.length > 0;
        break;
      case 'BOOKER':
        hasProfile = user.bookers && user.bookers.length > 0;
        break;
      case 'VENUE':
        hasProfile = user.venues && user.venues.length > 0;
        break;
      case 'PRESTATAIRE':
        hasProfile = user.prestataires && user.prestataires.length > 0;
        break;
    }

    if (!hasProfile) {
      return sendError(res, `Vous n'avez pas de profil ${profileType}. Créez-en un d'abord.`, 404);
    }

    // Mettre à jour le profil actif
    await prisma.user.update({
      where: { id: userId },
      data: {
        activeProfileType: profileType,
        accountType: profileType, // Garde pour compatibilité
      },
    });

    return sendSuccess(res, {
      message: `Profil basculé vers ${profileType}`,
      activeProfileType: profileType,
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Change le mot de passe d'un utilisateur
 * @param {Object} req - Requête Express
 * @param {Object} req.body.oldPassword - Ancien mot de passe
 * @param {Object} req.body.newPassword - Nouveau mot de passe
 * @param {Object} req.body.confirmPassword - Confirmation du nouveau mot de passe
 * @param {Object} res - Réponse Express
 */
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body ?? {};
    const userId = req.user.id;

    // Vérifier que tous les champs sont fournis
    if (!oldPassword || !newPassword || !confirmPassword) {
      return sendError(res, 'Tous les champs sont requis (ancien mot de passe, nouveau mot de passe, confirmation).', 400);
    }

    // Vérifier que le nouveau mot de passe et la confirmation correspondent
    if (newPassword !== confirmPassword) {
      return sendError(res, 'Le nouveau mot de passe et la confirmation ne correspondent pas.', 400);
    }

    // Valider la longueur du nouveau mot de passe
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return sendError(res, passwordValidation.message, 400);
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    // Vérifier que l'ancien mot de passe est correct
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return sendError(res, 'L\'ancien mot de passe est incorrect.', 401);
    }

    // Vérifier que le nouveau mot de passe est différent de l'ancien
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return sendError(res, 'Le nouveau mot de passe doit être différent de l\'ancien.', 400);
    }

    // Hasher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
      },
    });

    return sendSuccess(res, {
      message: 'Mot de passe modifié avec succès.',
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère les informations d'un utilisateur par son ID
 * @param {Object} req - Requête Express
 * @param {Object} req.params.userId - ID de l'utilisateur
 * @param {Object} res - Réponse Express
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[getUserById] userId invalide:', userId);
      return sendError(res, 'ID utilisateur requis', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId.trim() }, // L'ID est un UUID (String), pas besoin de parseInt
      include: {
        tickets: {
          include: {
            event: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    const ticketsCount = user.tickets.length;
    const lastTicket = user.tickets[0] || null;

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        score: user.score ?? 0,
        level: user.level ?? 1,
        sbtActive: user.sbtActive ?? false,
        tickets: ticketsCount,
        lastTicket: lastTicket
          ? {
              id: lastTicket.id,
              title: lastTicket.event?.title || 'Événement supprimé',
              quantity: lastTicket.quantity || 1,
              location: lastTicket.event?.location || '',
              lastPurchasedAt: lastTicket.purchaseDate 
                ? new Date(lastTicket.purchaseDate).toISOString()
                : (lastTicket.createdAt ? new Date(lastTicket.createdAt).toISOString() : null),
              eventDate: lastTicket.event?.date 
                ? (lastTicket.event.date instanceof Date 
                    ? lastTicket.event.date.toISOString() 
                    : lastTicket.event.date)
                : null,
              createdAt: lastTicket.createdAt 
                ? (lastTicket.createdAt instanceof Date 
                    ? lastTicket.createdAt.toISOString() 
                    : lastTicket.createdAt)
                : null,
            }
          : null,
        eventsParticipated: ticketsCount,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère les informations de l'utilisateur connecté avec son dernier ticket
 * @param {Object} req - Requête Express (contient req.user depuis authenticateToken)
 * @param {Object} res - Réponse Express
 */
const getCurrentUser = async (req, res) => {
  try {
    dlog('[getCurrentUser] Début - req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'undefined');
    
    // Vérifier que req.user existe (devrait être défini par authenticateToken)
    if (!req.user || !req.user.id) {
      console.error('[getCurrentUser] req.user ou req.user.id manquant:', { user: req.user });
      return sendError(res, 'Utilisateur non authentifié', 401);
    }

    const userId = req.user.id;
    dlog('[getCurrentUser] userId:', userId, 'type:', typeof userId);

    // Validation supplémentaire pour s'assurer que userId est une string valide
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[getCurrentUser] userId invalide:', userId, 'type:', typeof userId);
      return sendError(res, 'ID utilisateur invalide', 400);
    }

    const trimmedUserId = userId.trim();
    dlog('[getCurrentUser] Recherche utilisateur avec id:', trimmedUserId);

    const user = await prisma.user.findUnique({
      where: { id: trimmedUserId },
      include: {
        tickets: {
          include: {
            event: true,
          },
          orderBy: {
            purchaseDate: 'desc',
          },
          take: 1, // Prendre seulement le dernier ticket
        },
      },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    const ticketsCount = await prisma.ticket.count({
      where: { userId: userId },
    });

    dlog('[getCurrentUser] Nombre de tickets:', ticketsCount);
    dlog('[getCurrentUser] Tickets récupérés:', user.tickets.length);
    
    const lastTicket = user.tickets[0] || null;
    dlog('[getCurrentUser] Dernier ticket:', lastTicket ? {
      id: lastTicket.id,
      eventTitle: lastTicket.event?.title,
      eventLocation: lastTicket.event?.location,
      purchaseDate: lastTicket.purchaseDate,
    } : 'null');

    const formattedLastTicket = lastTicket
      ? {
          id: lastTicket.id,
          title: lastTicket.event?.title || 'Événement supprimé',
          quantity: 1, // Chaque ticket est individuel
          location: lastTicket.event?.location || '',
          lastPurchasedAt: lastTicket.purchaseDate 
            ? new Date(lastTicket.purchaseDate).toISOString()
            : (lastTicket.createdAt ? new Date(lastTicket.createdAt).toISOString() : null),
          eventDate: lastTicket.event?.date 
            ? (lastTicket.event.date instanceof Date 
                ? lastTicket.event.date.toISOString() 
                : lastTicket.event.date)
            : null,
          createdAt: lastTicket.createdAt 
            ? (lastTicket.createdAt instanceof Date 
                ? lastTicket.createdAt.toISOString() 
                : lastTicket.createdAt)
            : null,
        }
      : null;

    dlog('[getCurrentUser] Ticket formaté:', formattedLastTicket);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'USER',
        emailVerified: !!user.emailVerified,
        score: user.score ?? 0,
        level: user.level ?? 1,
        sbtActive: user.sbtActive ?? false,
        activeProfileType: user.activeProfileType,
        tickets: ticketsCount,
        lastTicket: formattedLastTicket,
        eventsParticipated: ticketsCount,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Envoie un code de vérification email à l'utilisateur connecté
 * @route POST /api/user/me/email/verification/send
 */
const sendEmailVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        emailVerificationSentAt: true,
      },
    });

    if (!user) return sendError(res, 'Utilisateur non trouvé', 404);
    if (user.emailVerified) {
      return sendSuccess(res, { message: 'Email déjà vérifié.' });
    }

    // Anti-spam: bloquer seulement si dernier envoi < 30s (évite double-clic)
    if (user.emailVerificationSentAt) {
      const last = new Date(user.emailVerificationSentAt);
      const diffMs = now.getTime() - last.getTime();
      const invalidOrFuture = isNaN(diffMs) || diffMs < 0;
      const codeExpired = diffMs > 30 * 60 * 1000; // 30 min
      const tooSoon = diffMs < 30 * 1000; // 30 s
      if (!invalidOrFuture && !codeExpired && tooSoon) {
        const waitSec = Math.ceil((30 * 1000 - diffMs) / 1000);
        return sendError(res, `Veuillez patienter ${waitSec}s avant de renvoyer un code.`, 429);
      }
    }

    const crypto = require('crypto');
    const { sendMail } = require('../utils/mailer');
    const salt = (process.env.AUTH_CODE_SALT || '').trim();
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');

    const subject = 'Nox — Vérification email';
    const text = `Ton code de vérification est: ${code}\n\nIl expire dans 30 minutes.`;
    const html = `<p>Ton code de vérification est:</p><h2>${code}</h2><p>Il expire dans 30 minutes.</p>`;

    try {
      await sendMail({ to: user.email, subject, text, html });
    } catch (e) {
      if (process.env.NODE_ENV === 'production') {
        return sendError(res, 'Impossible d\'envoyer l\'email. Vérifie la config serveur.', 500);
      }
      const debugCode = process.env.DEBUG_LOGS === 'true' ? code : undefined;
      return sendSuccess(res, { message: 'Code généré (email non envoyé).', debugCode });
    }

    // Mettre à jour la DB uniquement après envoi réussi (évite de bloquer si l'envoi a échoué)
    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationCodeHash: codeHash,
        emailVerificationSentAt: now,
      },
    });

    return sendSuccess(res, { message: 'Code envoyé.' });
  } catch (e) {
    console.error('Erreur sendEmailVerification:', e);
    return sendError(res, 'Erreur serveur', 500);
  }
};

/**
 * Confirme la vérification email (code)
 * @route POST /api/user/me/email/verification/confirm
 * body: { code }
 */
const confirmEmailVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const codeRaw = req.body?.code;
    const code = typeof codeRaw === 'string' ? codeRaw.trim() : '';
    if (!/^\d{6}$/.test(code)) {
      return sendError(res, 'Code invalide (6 chiffres).', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        emailVerified: true,
        emailVerificationCodeHash: true,
        emailVerificationSentAt: true,
      },
    });
    if (!user) return sendError(res, 'Utilisateur non trouvé', 404);
    if (user.emailVerified) return sendSuccess(res, { message: 'Email déjà vérifié.' });
    if (!user.emailVerificationCodeHash || !user.emailVerificationSentAt) {
      return sendError(res, 'Aucun code en cours. Demande un nouveau code.', 400);
    }

    const sentAt = new Date(user.emailVerificationSentAt);
    const now = new Date();
    if (now.getTime() - sentAt.getTime() > 30 * 60 * 1000) {
      return sendError(res, 'Code expiré. Demande un nouveau code.', 400);
    }

    const crypto = require('crypto');
    const salt = (process.env.AUTH_CODE_SALT || '').trim();
    const codeHash = crypto.createHash('sha256').update(`${salt}:${code}`).digest('hex');
    if (codeHash !== user.emailVerificationCodeHash) {
      return sendError(res, 'Code incorrect.', 400);
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        emailVerifiedAt: now,
        emailVerificationCodeHash: null,
        emailVerificationSentAt: null,
      },
    });

    return sendSuccess(res, { message: 'Email vérifié.' });
  } catch (e) {
    console.error('Erreur confirmEmailVerification:', e);
    return sendError(res, 'Erreur serveur', 500);
  }
};

/**
 * Récupère le profil DJ actif de l'utilisateur connecté
 * @param {Object} req - Requête Express (contient req.user depuis authenticateToken)
 * @param {Object} res - Réponse Express
 */
const getCurrentDjProfile = async (req, res) => {
  try {
    dlog('[getCurrentDjProfile] Début - req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'undefined');
    
    if (!req.user || !req.user.id) {
      console.error('[getCurrentDjProfile] req.user ou req.user.id manquant');
      return sendError(res, 'Utilisateur non authentifié', 401);
    }

    const userId = req.user.id;
    dlog('[getCurrentDjProfile] userId:', userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        djs: true,
      },
    });

    if (!user) {
      console.error('[getCurrentDjProfile] Utilisateur non trouvé pour userId:', userId);
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    dlog('[getCurrentDjProfile] Nombre de profils DJ:', user.djs?.length || 0);

    if (!user.djs || user.djs.length === 0) {
      console.error('[getCurrentDjProfile] Aucun profil DJ trouvé pour userId:', userId);
      return sendError(res, 'Aucun profil DJ trouvé', 404);
    }

    // Si plusieurs profils DJ, prendre le premier (ou celui correspondant au profil actif)
    const djProfile = user.djs[0];
    dlog('[getCurrentDjProfile] Profil DJ trouvé:', djProfile.artistName);

    return sendSuccess(res, {
      dj: {
        id: djProfile.id,
        artistName: djProfile.artistName,
        city: djProfile.city,
        phone: djProfile.phone,
        birthDate: djProfile.birthDate,
        // Champs éditables
        bio: djProfile.bio,
        genre: djProfile.genre,
        mainCity: djProfile.mainCity,
        languages: djProfile.languages,
        // Tarifs
        hourlyRate: djProfile.hourlyRate,
        performanceRate: djProfile.performanceRate,
        minTravelFee: djProfile.minTravelFee,
        extraFees: djProfile.extraFees,
        // Disponibilités
        availableDays: djProfile.availableDays,
        availableStatus: djProfile.availableStatus,
        // Réseaux sociaux
        soundcloudUrl: djProfile.soundcloudUrl,
        spotifyUrl: djProfile.spotifyUrl,
        youtubeUrl: djProfile.youtubeUrl,
        instagramUrl: djProfile.instagramUrl,
        tiktokUrl: djProfile.tiktokUrl,
        equipment: djProfile.equipment,
        // Infos légales (contrats)
        legalName: djProfile.legalName,
        address: djProfile.address,
        postalCode: djProfile.postalCode,
        country: djProfile.country,
        siret: djProfile.siret,
        vatNumber: djProfile.vatNumber,
        // Ratings
        averageRatingGlobal: djProfile.averageRatingGlobal,
        totalRatingsGlobal: djProfile.totalRatingsCommunity + djProfile.totalRatingsBooker + djProfile.totalRatingsVenue,
      },
    });
  } catch (error) {
    console.error('[getCurrentDjProfile] Erreur:', error);
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Met à jour le profil DJ de l'utilisateur connecté
 * @param {Object} req - Requête Express
 * @param {Object} req.body.artistName - Nom d'artiste
 * @param {Object} req.body.city - Ville
 * @param {Object} req.body.phone - Téléphone
 * @param {Object} req.body.birthDate - Date de naissance
 * @param {Object} res - Réponse Express
 */
const updateDjProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      artistName, city, phone, birthDate, // Champs non-éditables (requis pour validation mais non modifiés)
      bio, genre, mainCity, languages, // Champs éditables
      hourlyRate, performanceRate, minTravelFee, extraFees, // Tarifs
      availableDays, availableStatus // Disponibilités
    } = req.body;

    dlog('[updateDjProfile] ===== DÉBUT MISE À JOUR =====');
    dlog('[updateDjProfile] User ID:', userId);
    dlog('[updateDjProfile] Toutes les clés dans req.body:', Object.keys(req.body));
    dlog('[updateDjProfile] req.body complet:', JSON.stringify(req.body, null, 2));
    dlog('[updateDjProfile] bio dans req.body:', req.body.bio);
    dlog('[updateDjProfile] genre dans req.body:', req.body.genre);
    dlog('[updateDjProfile] "bio" in req.body:', 'bio' in req.body);
    dlog('[updateDjProfile] req.body.hasOwnProperty("bio"):', req.body.hasOwnProperty('bio'));

    // Validation - les champs de base doivent exister (mais ne seront pas modifiés)
    if (!artistName || !city) {
      return sendError(res, 'artistName et city sont requis', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        djs: true,
      },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    if (!user.djs || user.djs.length === 0) {
      return sendError(res, 'Aucun profil DJ trouvé', 404);
    }

    // Mettre à jour le premier profil DJ (ou celui correspondant au profil actif)
    const djProfile = user.djs[0];
    
    // APPROCHE ULTRA-SIMPLIFIÉE : mettre à jour directement tous les champs éditables
    // Comme pour les médias, on met à jour directement sans conditions complexes
    const updateData = {};
    
    // Champs texte - traiter les chaînes vides comme null
    // Utiliser req.body directement sans vérifier undefined
    updateData.bio = (req.body.bio && typeof req.body.bio === 'string' && req.body.bio.trim()) ? req.body.bio.trim() : null;
    updateData.genre = (req.body.genre && typeof req.body.genre === 'string' && req.body.genre.trim()) ? req.body.genre.trim() : null;
    updateData.mainCity = (req.body.mainCity && typeof req.body.mainCity === 'string' && req.body.mainCity.trim()) ? req.body.mainCity.trim() : null;
    updateData.languages = (req.body.languages && typeof req.body.languages === 'string' && req.body.languages.trim()) ? req.body.languages.trim() : null;
    
    // Tarifs
    updateData.hourlyRate = (req.body.hourlyRate && req.body.hourlyRate !== '') ? parseFloat(req.body.hourlyRate) : null;
    updateData.performanceRate = (req.body.performanceRate && req.body.performanceRate !== '') ? parseFloat(req.body.performanceRate) : null;
    updateData.minTravelFee = (req.body.minTravelFee && req.body.minTravelFee !== '') ? parseFloat(req.body.minTravelFee) : null;
    updateData.extraFees = (req.body.extraFees && req.body.extraFees !== '') ? parseFloat(req.body.extraFees) : null;
    
    // Disponibilités
    updateData.availableDays = req.body.availableDays ? (typeof req.body.availableDays === 'string' ? req.body.availableDays : JSON.stringify(req.body.availableDays)) : null;
    updateData.availableStatus = req.body.availableStatus !== undefined ? req.body.availableStatus : true;
    
    // Réseaux sociaux
    updateData.soundcloudUrl = (req.body.soundcloudUrl && typeof req.body.soundcloudUrl === 'string' && req.body.soundcloudUrl.trim()) ? req.body.soundcloudUrl.trim() : null;
    updateData.spotifyUrl = (req.body.spotifyUrl && typeof req.body.spotifyUrl === 'string' && req.body.spotifyUrl.trim()) ? req.body.spotifyUrl.trim() : null;
    updateData.youtubeUrl = (req.body.youtubeUrl && typeof req.body.youtubeUrl === 'string' && req.body.youtubeUrl.trim()) ? req.body.youtubeUrl.trim() : null;
    updateData.instagramUrl = (req.body.instagramUrl && typeof req.body.instagramUrl === 'string' && req.body.instagramUrl.trim()) ? req.body.instagramUrl.trim() : null;
    updateData.tiktokUrl = (req.body.tiktokUrl && typeof req.body.tiktokUrl === 'string' && req.body.tiktokUrl.trim()) ? req.body.tiktokUrl.trim() : null;
    
    // Matériel
    updateData.equipment = (req.body.equipment && typeof req.body.equipment === 'string' && req.body.equipment.trim()) ? req.body.equipment.trim() : null;

    // Infos légales (contrats) : modifiables une seule fois, uniquement quand vides
    const djLegalFields = ['legalName', 'address', 'postalCode', 'country', 'siret', 'vatNumber'];
    const djLegalKeys = ['legalName', 'address', 'postalCode', 'country', 'siret', 'vatNumber'];
    for (let i = 0; i < djLegalFields.length; i++) {
      const field = djLegalFields[i];
      const key = djLegalKeys[i];
      const incoming = req.body[key];
      const current = djProfile[field];
      const isEmpty = current == null || String(current).trim() === '';
      if (incoming !== undefined && isEmpty) {
        updateData[field] = incoming != null && String(incoming).trim() ? String(incoming).trim() : null;
      }
    }
    
    dlog('[updateDjProfile] updateData final (TOUS les champs):', JSON.stringify(updateData, null, 2));
    
    // Note: artistName, city, phone, birthDate ne sont PAS modifiés (champs d'inscription)
    
    dlog('[updateDjProfile] Données à mettre à jour:', JSON.stringify(updateData, null, 2));
    dlog('[updateDjProfile] Nombre de champs à mettre à jour:', Object.keys(updateData).length);
    
    // Si aucun champ à mettre à jour, on continue quand même
    if (Object.keys(updateData).length === 0) {
      console.warn('[updateDjProfile] ⚠️ Aucun champ éitable à mettre à jour');
    }
    
    dlog('[updateDjProfile] Exécution de la mise à jour Prisma...');
    dlog('[updateDjProfile] ID du DJ:', djProfile.id);
    dlog('[updateDjProfile] updateData avant Prisma:', JSON.stringify(updateData, null, 2));
    
    const updatedDj = await prisma.userDj.update({
      where: { id: djProfile.id },
      data: updateData,
    });
    
    dlog('[updateDjProfile] ✅ Mise à jour Prisma réussie');
    dlog('[updateDjProfile] Bio après update:', updatedDj.bio || '(null)');

    dlog('[updateDjProfile] Profil mis à jour dans la DB:');
    dlog('  - bio:', updatedDj.bio || '(null)');
    dlog('  - genre:', updatedDj.genre || '(null)');
    dlog('  - mainCity:', updatedDj.mainCity || '(null)');
    dlog('  - languages:', updatedDj.languages || '(null)');
    dlog('  - hourlyRate:', updatedDj.hourlyRate || '(null)');
    dlog('  - performanceRate:', updatedDj.performanceRate || '(null)');

    // Récupérer le profil complet depuis la DB pour être sûr
    const finalDj = await prisma.userDj.findUnique({
      where: { id: updatedDj.id },
    });

    dlog('[updateDjProfile] Profil final récupéré de la DB:');
    dlog('  - bio:', finalDj.bio || '(null)');
    dlog('  - genre:', finalDj.genre || '(null)');
    dlog('  - mainCity:', finalDj.mainCity || '(null)');

    return sendSuccess(res, {
      message: 'Profil DJ mis à jour avec succès',
      dj: {
        id: finalDj.id,
        artistName: finalDj.artistName,
        city: finalDj.city,
        phone: finalDj.phone,
        birthDate: finalDj.birthDate,
        // Retourner tous les champs éditables mis à jour
        bio: finalDj.bio,
        genre: finalDj.genre,
        mainCity: finalDj.mainCity,
        languages: finalDj.languages,
        hourlyRate: finalDj.hourlyRate,
        performanceRate: finalDj.performanceRate,
        minTravelFee: finalDj.minTravelFee,
        extraFees: finalDj.extraFees,
        availableDays: finalDj.availableDays,
        availableStatus: finalDj.availableStatus,
        soundcloudUrl: finalDj.soundcloudUrl,
        spotifyUrl: finalDj.spotifyUrl,
        youtubeUrl: finalDj.youtubeUrl,
        instagramUrl: finalDj.instagramUrl,
        tiktokUrl: finalDj.tiktokUrl,
        equipment: finalDj.equipment,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère le profil public d'un profil Communauté par ID (pour voir un ami)
 * GET /api/user/community/:communityId
 * Retourne uniquement les infos publiques : pseudo, profileImage, bannerImage, genres
 */
const getCommunityProfileById = async (req, res) => {
  try {
    const { communityId } = req.params;
    if (!communityId) return sendError(res, 'communityId requis.', 400);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(communityId)) return sendError(res, 'Profil introuvable.', 404);
    const community = await prisma.userCommunity.findUnique({
      where: { id: communityId },
      select: { id: true, pseudo: true, profileImage: true, bannerImage: true, genres: true },
    });
    if (!community) return sendError(res, 'Profil introuvable.', 404);
    return sendSuccess(res, {
      profile: {
        id: community.id,
        pseudo: community.pseudo || 'Anonyme',
        profileImage: community.profileImage,
        bannerImage: community.bannerImage,
        genres: community.genres,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère le profil Communauté de l'utilisateur connecté (premier profil)
 */
const getCommunityProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const community = await prisma.userCommunity.findFirst({
      where: { userId },
    });
    if (!community) {
      return sendError(res, 'Profil Communauté non trouvé.', 404);
    }
    return sendSuccess(res, {
      profile: {
        id: community.id,
        pseudo: community.pseudo,
        nom: community.nom,
        prenom: community.prenom,
        pays: community.pays,
        dateNaissance: community.dateNaissance,
        isnNumber: community.isnNumber,
        profileImage: community.profileImage,
        bannerImage: community.bannerImage,
        genres: community.genres,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Met à jour le profil Communauté (pseudo, genres)
 * Pseudo Communauté : unique pour la recherche d'amis (différent du artistName DJ)
 */
const updateCommunityProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pseudo, genres } = req.body ?? {};
    const community = await prisma.userCommunity.findFirst({
      where: { userId },
    });
    if (!community) {
      return sendError(res, 'Profil Communauté non trouvé.', 404);
    }
    const updateData = {};
    if (pseudo !== undefined) {
      const newPseudo = pseudo && String(pseudo).trim() ? String(pseudo).trim() : null;
      if (newPseudo) {
        const existing = await prisma.userCommunity.findFirst({
          where: {
            pseudo: newPseudo,
            id: { not: community.id },
          },
        });
        if (existing) {
          return sendError(res, 'Ce pseudo Communauté est déjà pris. Choisis-en un autre.', 409);
        }
      }
      updateData.pseudo = newPseudo;
    }
    if (genres !== undefined) updateData.genres = genres && String(genres).trim() ? String(genres).trim() : null;
    const updated = await prisma.userCommunity.update({
      where: { id: community.id },
      data: updateData,
    });
    return sendSuccess(res, {
      profile: {
        id: updated.id,
        pseudo: updated.pseudo,
        nom: updated.nom,
        prenom: updated.prenom,
        profileImage: updated.profileImage,
        bannerImage: updated.bannerImage,
        genres: updated.genres,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère l'ID du profil Communauté de l'utilisateur connecté
 */
const getMyCommunityId = async (userId) => {
  const community = await prisma.userCommunity.findFirst({
    where: { userId },
  });
  return community?.id ?? null;
};

/**
 * Liste des amis (Communauté) - relations avec status ACCEPTED
 */
const getCommunityFriends = async (req, res) => {
  try {
    const userId = req.user.id;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis pour accéder aux amis.', 400);
    }
    const friendships = await prisma.communityFriend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterCommunityId: myCommunityId },
          { requestedCommunityId: myCommunityId },
        ],
      },
      include: {
        requester: { select: { id: true, pseudo: true, profileImage: true } },
        requested: { select: { id: true, pseudo: true, profileImage: true } },
      },
    });
    const friends = friendships.map((f) => {
      const other = f.requesterCommunityId === myCommunityId ? f.requested : f.requester;
      return {
        id: f.id,
        communityId: other.id,
        pseudo: other.pseudo || 'Anonyme',
        profileImage: other.profileImage,
        since: f.createdAt,
      };
    });
    return sendSuccess(res, { friends });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Liste des demandes d'amis reçues (status PENDING)
 */
const getCommunityFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const requests = await prisma.communityFriend.findMany({
      where: {
        requestedCommunityId: myCommunityId,
        status: 'PENDING',
      },
      include: {
        requester: { select: { id: true, pseudo: true, profileImage: true } },
      },
    });
    const list = requests.map((r) => ({
      id: r.id,
      communityId: r.requester.id,
      pseudo: r.requester.pseudo || 'Anonyme',
      profileImage: r.requester.profileImage,
      createdAt: r.createdAt,
    }));
    return sendSuccess(res, { requests: list });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Envoyer une demande d'ami
 * body: { requestedCommunityId }
 */
const sendCommunityFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestedCommunityId } = req.body ?? {};
    if (!requestedCommunityId) {
      return sendError(res, 'requestedCommunityId requis.', 400);
    }
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    if (requestedCommunityId === myCommunityId) {
      return sendError(res, 'Impossible de s\'ajouter soi-même.', 400);
    }
    const targetExists = await prisma.userCommunity.findUnique({
      where: { id: requestedCommunityId },
    });
    if (!targetExists) {
      return sendError(res, 'Profil Communauté introuvable.', 404);
    }
    const existing = await prisma.communityFriend.findUnique({
      where: {
        requesterCommunityId_requestedCommunityId: {
          requesterCommunityId: myCommunityId,
          requestedCommunityId,
        },
      },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') {
        return sendError(res, 'Vous êtes déjà amis.', 400);
      }
      if (existing.status === 'PENDING') {
        return sendError(res, 'Demande déjà envoyée.', 400);
      }
      return sendError(res, 'Action impossible.', 400);
    }
    const reverse = await prisma.communityFriend.findUnique({
      where: {
        requesterCommunityId_requestedCommunityId: {
          requesterCommunityId: requestedCommunityId,
          requestedCommunityId: myCommunityId,
        },
      },
    });
    if (reverse) {
      if (reverse.status === 'PENDING') {
        return sendError(res, 'Cette personne vous a déjà envoyé une demande. Acceptez-la.', 400);
      }
      if (reverse.status === 'ACCEPTED') {
        return sendError(res, 'Vous êtes déjà amis.', 400);
      }
    }
    await prisma.communityFriend.create({
      data: {
        requesterCommunityId: myCommunityId,
        requestedCommunityId,
        status: 'PENDING',
      },
    });
    return sendSuccess(res, { message: 'Demande envoyée.' });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Accepter ou refuser une demande d'ami
 * body: { action: 'accept'|'decline' }
 */
const respondToCommunityFriendRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { action } = req.body ?? {};
    if (!id || !action || !['accept', 'decline'].includes(action)) {
      return sendError(res, 'Paramètre id et action (accept|decline) requis.', 400);
    }
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const friendship = await prisma.communityFriend.findUnique({
      where: { id },
    });
    if (!friendship || friendship.requestedCommunityId !== myCommunityId || friendship.status !== 'PENDING') {
      return sendError(res, 'Demande introuvable ou déjà traitée.', 404);
    }
    if (action === 'accept') {
      await prisma.communityFriend.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
      return sendSuccess(res, { message: 'Demande acceptée.' });
    }
    await prisma.communityFriend.delete({
      where: { id },
    });
    return sendSuccess(res, { message: 'Demande refusée.' });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Retirer un ami
 */
const removeCommunityFriend = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const friendship = await prisma.communityFriend.findUnique({
      where: { id },
    });
    if (!friendship || friendship.status !== 'ACCEPTED') {
      return sendError(res, 'Amitié introuvable.', 404);
    }
    const isMine = friendship.requesterCommunityId === myCommunityId || friendship.requestedCommunityId === myCommunityId;
    if (!isMine) {
      return sendError(res, 'Non autorisé.', 403);
    }
    await prisma.communityFriend.delete({
      where: { id },
    });
    return sendSuccess(res, { message: 'Ami retiré.' });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Récupère le profil Venue de l'utilisateur connecté (premier lieu)
 */
const getVenueProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const venue = await prisma.userVenue.findFirst({
      where: { userId },
    });
    if (!venue) {
      return sendError(res, 'Profil Lieu non trouvé.', 404);
    }
    return sendSuccess(res, {
      profile: {
        id: venue.id,
        venueName: venue.venueName,
        address: venue.address,
        profileImage: venue.profileImage,
        bannerImage: venue.bannerImage,
        companyName: venue.companyName,
        legalRepresentative: venue.legalRepresentative,
        postalCode: venue.postalCode,
        city: venue.city,
        country: venue.country,
        siret: venue.siret,
        maxCapacity: venue.maxCapacity ?? null,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Met à jour le profil Venue (nom, adresse - champs de base)
 */
const updateVenueProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { venueName, address, companyName, legalRepresentative, postalCode, city, country, siret, maxCapacity } =
      req.body ?? {};
    const venue = await prisma.userVenue.findFirst({
      where: { userId },
    });
    if (!venue) {
      return sendError(res, 'Profil Lieu non trouvé.', 404);
    }
    const updateData = {};
    if (venueName !== undefined && String(venueName).trim()) updateData.venueName = String(venueName).trim();
    if (address !== undefined && String(address).trim()) updateData.address = String(address).trim();
    if (maxCapacity !== undefined) {
      if (maxCapacity === null || maxCapacity === '' || String(maxCapacity).trim() === '') {
        updateData.maxCapacity = null;
      } else {
        const mc = parseInt(String(maxCapacity).replace(/\s/g, ''), 10);
        if (!Number.isFinite(mc) || mc < 1) {
          return sendError(res, 'maxCapacity doit être un entier positif (≥ 1) ou être vide.', 400);
        }
        updateData.maxCapacity = mc;
      }
    }
    const venueLegalFields = ['companyName', 'legalRepresentative', 'postalCode', 'city', 'country', 'siret'];
    const venueLegalValues = { companyName, legalRepresentative, postalCode, city, country, siret };
    for (const field of venueLegalFields) {
      const incoming = venueLegalValues[field];
      const current = venue[field];
      const isEmpty = current == null || String(current).trim() === '';
      if (incoming !== undefined && isEmpty) {
        updateData[field] = incoming != null && String(incoming).trim() ? String(incoming).trim() : null;
      }
    }
    const filtered = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== undefined));
    const updated = await prisma.userVenue.update({
      where: { id: venue.id },
      data: filtered,
    });
    return sendSuccess(res, {
      profile: {
        id: updated.id,
        venueName: updated.venueName,
        address: updated.address,
        profileImage: updated.profileImage,
        bannerImage: updated.bannerImage,
        companyName: updated.companyName,
        legalRepresentative: updated.legalRepresentative,
        postalCode: updated.postalCode,
        city: updated.city,
        country: updated.country,
        siret: updated.siret,
        maxCapacity: updated.maxCapacity ?? null,
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Vérifier si un pseudo Communauté est disponible
 * GET /api/user/community/pseudo/check?pseudo=xyz
 */
const checkCommunityPseudoAvailable = async (req, res) => {
  try {
    const userId = req.user.id;
    const pseudo = (req.query.pseudo || '').trim();
    if (!pseudo || pseudo.length < 2) {
      return sendSuccess(res, { available: false, message: 'Pseudo trop court (min. 2 caractères).' });
    }
    const myCommunity = await prisma.userCommunity.findFirst({
      where: { userId },
    });
    const existing = await prisma.userCommunity.findFirst({
      where: {
        pseudo,
        ...(myCommunity ? { id: { not: myCommunity.id } } : {}),
      },
    });
    return sendSuccess(res, { available: !existing });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Rechercher des profils Communauté par pseudo
 * GET ?q=pseudo
 * Le pseudo Communauté doit être défini (éditer le profil Communauté).
 */
const searchCommunities = async (req, res) => {
  try {
    const userId = req.user.id;
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return sendSuccess(res, { results: [] });
    }
    const myCommunityId = await getMyCommunityId(userId);
    const where = {
      AND: [
        { pseudo: { not: null } },
        {
          OR: [
            { pseudo: { equals: q, mode: 'insensitive' } },
            { pseudo: { contains: q, mode: 'insensitive' } },
          ],
        },
        ...(myCommunityId ? [{ id: { not: myCommunityId } }] : []),
      ],
    };
    const communities = await prisma.userCommunity.findMany({
      where,
      select: { id: true, pseudo: true, profileImage: true },
      take: 20,
    });
    if (process.env.DEBUG_LOGS === 'true') {
      console.log('[searchCommunities]', { q, myCommunityId, count: communities.length });
    }
    const results = communities.map((c) => ({
      id: c.id,
      pseudo: c.pseudo || 'Anonyme',
      profileImage: c.profileImage,
    }));
    return sendSuccess(res, { results });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

// ============================================================================
// Groupes d'événements (amis qui vont ensemble)
// ============================================================================

/**
 * Créer un groupe pour un événement
 * POST /api/events/:eventId/groups
 * body: { name?, friendCommunityIds?: string[] }
 */
const createEventGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { name, friendCommunityIds = [] } = req.body ?? {};
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendError(res, 'Profil Communauté requis.', 400);
    }
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return sendError(res, 'Événement introuvable.', 404);
    const existing = await prisma.eventGroup.findUnique({
      where: { eventId_creatorCommunityId: { eventId, creatorCommunityId: myCommunityId } },
      include: {
        event: { select: { id: true, title: true, date: true, time: true, location: true } },
        creator: { select: { id: true, pseudo: true, profileImage: true } },
        members: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } },
      },
    });
    if (existing) {
      return sendSuccess(res, { group: existing, alreadyExists: true });
    }
    const group = await prisma.eventGroup.create({
      data: {
        eventId,
        creatorCommunityId: myCommunityId,
        name: name && String(name).trim() ? String(name).trim() : null,
      },
      include: {
        event: { select: { id: true, title: true, date: true, time: true, location: true } },
        creator: { select: { id: true, pseudo: true, profileImage: true } },
        members: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } },
      },
    });
    if (Array.isArray(friendCommunityIds) && friendCommunityIds.length > 0) {
      const friends = await prisma.communityFriend.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [
            { requesterCommunityId: myCommunityId, requestedCommunityId: { in: friendCommunityIds } },
            { requestedCommunityId: myCommunityId, requesterCommunityId: { in: friendCommunityIds } },
          ],
        },
      });
      const validIds = [...new Set(friends.map((f) => (f.requesterCommunityId === myCommunityId ? f.requestedCommunityId : f.requesterCommunityId)))];
      if (validIds.length > 0) {
        await prisma.eventGroupMember.createMany({
          data: validIds.map((communityId) => ({ groupId: group.id, communityId })),
        });
        const updated = await prisma.eventGroup.findUnique({
          where: { id: group.id },
          include: {
            event: { select: { id: true, title: true, date: true, time: true, location: true } },
            creator: { select: { id: true, pseudo: true, profileImage: true } },
            members: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } },
          },
        });
        return sendSuccess(res, { group: updated }, 201);
      }
    }
    return sendSuccess(res, { group }, 201);
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Lister mes groupes pour un événement
 * GET /api/events/:eventId/groups
 */
const getEventGroups = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) {
      return sendSuccess(res, { groups: [] });
    }
    const groups = await prisma.eventGroup.findMany({
      where: {
        eventId,
        OR: [
          { creatorCommunityId: myCommunityId },
          { members: { some: { communityId: myCommunityId } } },
        ],
      },
      include: {
        creator: { select: { id: true, pseudo: true, profileImage: true } },
        members: {
          include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
        },
      },
    });
    const formatted = groups.map((g) => ({
      id: g.id,
      name: g.name,
      eventId: g.eventId,
      creator: g.creator,
      members: g.members.map((m) => ({
        id: m.id,
        communityId: m.communityId,
        pseudo: m.community.pseudo || 'Anonyme',
        profileImage: m.community.profileImage,
        status: m.status,
      })),
    }));
    return sendSuccess(res, { groups: formatted });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Inviter des amis dans un groupe
 * POST /api/events/:eventId/groups/:groupId/invite
 * body: { communityIds: string[] }
 */
const inviteToEventGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId, groupId } = req.params;
    const { communityIds } = req.body ?? {};
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) return sendError(res, 'Profil Communauté requis.', 400);
    if (!Array.isArray(communityIds) || communityIds.length === 0) {
      return sendError(res, 'communityIds requis (tableau).', 400);
    }
    const group = await prisma.eventGroup.findFirst({
      where: { id: groupId, eventId, creatorCommunityId: myCommunityId },
    });
    if (!group) return sendError(res, 'Groupe introuvable ou tu n\'es pas le créateur.', 404);
    const friends = await prisma.communityFriend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { requesterCommunityId: myCommunityId, requestedCommunityId: { in: communityIds } },
          { requestedCommunityId: myCommunityId, requesterCommunityId: { in: communityIds } },
        ],
      },
    });
    const validIds = [...new Set(friends.map((f) => (f.requesterCommunityId === myCommunityId ? f.requestedCommunityId : f.requesterCommunityId)))];
    const created = [];
    for (const cid of validIds) {
      if (cid === myCommunityId) continue;
      const existing = await prisma.eventGroupMember.findUnique({
        where: { groupId_communityId: { groupId, communityId: cid } },
      });
      if (!existing) {
        const m = await prisma.eventGroupMember.create({
          data: { groupId, communityId: cid, status: 'INVITED' },
          include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
        });
        created.push(m);
      }
    }
    return sendSuccess(res, { invited: created.length, members: created });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Répondre à une invitation (rejoindre ou refuser)
 * PUT /api/event-groups/:groupId/respond
 * body: { action: 'join' | 'decline' }
 */
const respondToEventGroupInvitation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;
    const { action } = req.body ?? {};
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) return sendError(res, 'Profil Communauté requis.', 400);
    if (!action || !['join', 'decline'].includes(action)) {
      return sendError(res, 'action requis: join ou decline.', 400);
    }
    const member = await prisma.eventGroupMember.findFirst({
      where: { groupId, communityId: myCommunityId },
      include: { group: { include: { event: true, creator: true } } },
    });
    if (!member) return sendError(res, 'Invitation introuvable.', 404);
    if (member.status !== 'INVITED') {
      return sendError(res, 'Tu as déjà répondu à cette invitation.', 400);
    }
    await prisma.eventGroupMember.update({
      where: { id: member.id },
      data: { status: action === 'join' ? 'JOINED' : 'DECLINED' },
    });
    return sendSuccess(res, {
      message: action === 'join' ? 'Tu as rejoint le groupe.' : 'Invitation refusée.',
      status: action === 'join' ? 'JOINED' : 'DECLINED',
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Mes invitations à des groupes d'événements
 * GET /api/user/community/event-groups/invitations
 */
const getEventGroupInvitations = async (req, res) => {
  try {
    const userId = req.user.id;
    const myCommunityId = await getMyCommunityId(userId);
    if (!myCommunityId) return sendSuccess(res, { invitations: [] });
    const members = await prisma.eventGroupMember.findMany({
      where: { communityId: myCommunityId, status: 'INVITED' },
      include: {
        group: {
          include: {
            event: { select: { id: true, title: true, date: true, time: true, location: true } },
            creator: { select: { id: true, pseudo: true, profileImage: true } },
          },
        },
      },
    });
    const invitations = members.map((m) => ({
      id: m.id,
      groupId: m.groupId,
      status: m.status,
      event: m.group.event,
      creator: m.group.creator,
    }));
    return sendSuccess(res, { invitations });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

/**
 * Export des données personnelles (RGPD - droit à la portabilité)
 * GET /api/user/me/export
 */
const exportUserData = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        communities: true,
        djs: true,
        bookers: true,
        venues: true,
        tickets: { include: { event: { select: { id: true, title: true, date: true } } } },
      },
    });
    if (!user) return sendError(res, 'Utilisateur non trouvé.', 404);

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        emailVerified: user.emailVerified,
      },
      communities: user.communities.map((c) => ({
        id: c.id,
        pseudo: c.pseudo,
        nom: c.nom,
        prenom: c.prenom,
        pays: c.pays,
        genres: c.genres,
        createdAt: c.createdAt,
      })),
      djs: user.djs.map((d) => ({
        id: d.id,
        artistName: d.artistName,
        city: d.city,
        genre: d.genre,
        bio: d.bio,
        createdAt: d.createdAt,
      })),
      bookers: user.bookers.map((b) => ({
        id: b.id,
        pseudo: b.pseudo,
        nom: b.nom,
        prenom: b.prenom,
        bookerType: b.bookerType,
        createdAt: b.createdAt,
      })),
      venues: user.venues.map((v) => ({
        id: v.id,
        venueName: v.venueName,
        address: v.address,
        maxCapacity: v.maxCapacity ?? null,
        createdAt: v.createdAt,
      })),
      tickets: user.tickets.map((t) => ({
        id: t.id,
        eventId: t.eventId,
        event: t.event,
        purchaseDate: t.purchaseDate,
      })),
    };

    res.setHeader('Content-Disposition', `attachment; filename="insane-export-${userId.slice(0, 8)}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(exportData);
  } catch (error) {
    handleError(error, res, 'Erreur export données');
  }
};

/**
 * Suppression du compte (RGPD - droit à l'effacement)
 * DELETE /api/user/me
 * body: { password: string } - confirmation par mot de passe
 */
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body ?? {};

    if (!password) {
      return sendError(res, 'Le mot de passe est requis pour confirmer la suppression.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 'Utilisateur non trouvé.', 404);

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return sendError(res, 'Mot de passe incorrect.', 401);
    }

    await prisma.user.delete({ where: { id: userId } });

    return sendSuccess(res, {
      message: 'Compte supprimé. Vos données ont été effacées.',
    });
  } catch (error) {
    handleError(error, res, 'Erreur suppression compte');
  }
};

module.exports = {
  getUserProfiles,
  switchProfile,
  changePassword,
  getUserById,
  getCurrentUser,
  sendEmailVerification,
  confirmEmailVerification,
  getCurrentDjProfile,
  updateDjProfile,
  getCommunityProfile,
  getCommunityProfileById,
  updateCommunityProfile,
  getCommunityFriends,
  getCommunityFriendRequests,
  sendCommunityFriendRequest,
  respondToCommunityFriendRequest,
  removeCommunityFriend,
  searchCommunities,
  checkCommunityPseudoAvailable,
  getVenueProfile,
  updateVenueProfile,
  createEventGroup,
  getEventGroups,
  inviteToEventGroup,
  respondToEventGroupInvitation,
  getEventGroupInvitations,
  exportUserData,
  deleteAccount,
};

