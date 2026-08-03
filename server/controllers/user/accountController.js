/**
 * account — extrait de userController.js
 */

const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { handleError, sendError, sendSuccess } = require('../../utils/helpers');
const { validatePassword } = require('../../utils/validation');
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
    const { sendMail } = require('../../utils/mailer');
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
  exportUserData,
  deleteAccount,
};
