/**
 * Contrôleur pour la gestion des utilisateurs et profils
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { validatePassword } = require('../utils/validation');
const { handleError, sendError, sendSuccess } = require('../utils/helpers');

const prisma = new PrismaClient();

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
      },
    });

    if (!user) {
      return sendError(res, 'Utilisateur non trouvé', 404);
    }

    const profiles = {
      community: user.communities.map((c) => ({
        id: c.id,
        type: 'COMMUNITY',
        nom: c.nom,
        prenom: c.prenom,
        pays: c.pays,
        isnNumber: c.isnNumber,
      })),
      dj: user.djs.map((d) => ({
        id: d.id,
        type: 'DJ',
        artistName: d.artistName,
        city: d.city,
      })),
      booker: user.bookers.map((b) => ({
        id: b.id,
        type: 'BOOKER',
        nom: b.nom,
        prenom: b.prenom,
        bookerType: b.bookerType,
      })),
      venue: user.venues.map((v) => ({
        id: v.id,
        type: 'VENUE',
        venueName: v.venueName,
        address: v.address,
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

    const validProfileTypes = ['COMMUNITY', 'DJ', 'BOOKER', 'VENUE'];
    if (!profileType || !validProfileTypes.includes(profileType)) {
      return sendError(res, 'profileType requis et doit être COMMUNITY, DJ, BOOKER ou VENUE.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        communities: true,
        djs: true,
        bookers: true,
        venues: true,
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
    console.log('[getCurrentUser] Début - req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'undefined');
    
    // Vérifier que req.user existe (devrait être défini par authenticateToken)
    if (!req.user || !req.user.id) {
      console.error('[getCurrentUser] req.user ou req.user.id manquant:', { user: req.user });
      return sendError(res, 'Utilisateur non authentifié', 401);
    }

    const userId = req.user.id;
    console.log('[getCurrentUser] userId:', userId, 'type:', typeof userId);

    // Validation supplémentaire pour s'assurer que userId est une string valide
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('[getCurrentUser] userId invalide:', userId, 'type:', typeof userId);
      return sendError(res, 'ID utilisateur invalide', 400);
    }

    const trimmedUserId = userId.trim();
    console.log('[getCurrentUser] Recherche utilisateur avec id:', trimmedUserId);

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

    console.log('[getCurrentUser] Nombre de tickets:', ticketsCount);
    console.log('[getCurrentUser] Tickets récupérés:', user.tickets.length);
    
    const lastTicket = user.tickets[0] || null;
    console.log('[getCurrentUser] Dernier ticket:', lastTicket ? {
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

    console.log('[getCurrentUser] Ticket formaté:', formattedLastTicket);

    return sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
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
 * Récupère le profil DJ actif de l'utilisateur connecté
 * @param {Object} req - Requête Express (contient req.user depuis authenticateToken)
 * @param {Object} res - Réponse Express
 */
const getCurrentDjProfile = async (req, res) => {
  try {
    console.log('[getCurrentDjProfile] Début - req.user:', req.user ? { id: req.user.id, email: req.user.email } : 'undefined');
    
    if (!req.user || !req.user.id) {
      console.error('[getCurrentDjProfile] req.user ou req.user.id manquant');
      return sendError(res, 'Utilisateur non authentifié', 401);
    }

    const userId = req.user.id;
    console.log('[getCurrentDjProfile] userId:', userId);

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

    console.log('[getCurrentDjProfile] Nombre de profils DJ:', user.djs?.length || 0);

    if (!user.djs || user.djs.length === 0) {
      console.error('[getCurrentDjProfile] Aucun profil DJ trouvé pour userId:', userId);
      return sendError(res, 'Aucun profil DJ trouvé', 404);
    }

    // Si plusieurs profils DJ, prendre le premier (ou celui correspondant au profil actif)
    const djProfile = user.djs[0];
    console.log('[getCurrentDjProfile] Profil DJ trouvé:', djProfile.artistName);

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

    console.log('[updateDjProfile] ===== DÉBUT MISE À JOUR =====');
    console.log('[updateDjProfile] User ID:', userId);
    console.log('[updateDjProfile] Toutes les clés dans req.body:', Object.keys(req.body));
    console.log('[updateDjProfile] req.body complet:', JSON.stringify(req.body, null, 2));
    console.log('[updateDjProfile] bio dans req.body:', req.body.bio);
    console.log('[updateDjProfile] genre dans req.body:', req.body.genre);
    console.log('[updateDjProfile] "bio" in req.body:', 'bio' in req.body);
    console.log('[updateDjProfile] req.body.hasOwnProperty("bio"):', req.body.hasOwnProperty('bio'));

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
    
    console.log('[updateDjProfile] updateData final (TOUS les champs):', JSON.stringify(updateData, null, 2));
    
    // Note: artistName, city, phone, birthDate ne sont PAS modifiés (champs d'inscription)
    
    console.log('[updateDjProfile] Données à mettre à jour:', JSON.stringify(updateData, null, 2));
    console.log('[updateDjProfile] Nombre de champs à mettre à jour:', Object.keys(updateData).length);
    
    // Si aucun champ à mettre à jour, on continue quand même
    if (Object.keys(updateData).length === 0) {
      console.warn('[updateDjProfile] ⚠️ Aucun champ éitable à mettre à jour');
    }
    
    console.log('[updateDjProfile] Exécution de la mise à jour Prisma...');
    console.log('[updateDjProfile] ID du DJ:', djProfile.id);
    console.log('[updateDjProfile] updateData avant Prisma:', JSON.stringify(updateData, null, 2));
    
    const updatedDj = await prisma.userDj.update({
      where: { id: djProfile.id },
      data: updateData,
    });
    
    console.log('[updateDjProfile] ✅ Mise à jour Prisma réussie');
    console.log('[updateDjProfile] Bio après update:', updatedDj.bio || '(null)');

    console.log('[updateDjProfile] Profil mis à jour dans la DB:');
    console.log('  - bio:', updatedDj.bio || '(null)');
    console.log('  - genre:', updatedDj.genre || '(null)');
    console.log('  - mainCity:', updatedDj.mainCity || '(null)');
    console.log('  - languages:', updatedDj.languages || '(null)');
    console.log('  - hourlyRate:', updatedDj.hourlyRate || '(null)');
    console.log('  - performanceRate:', updatedDj.performanceRate || '(null)');

    // Récupérer le profil complet depuis la DB pour être sûr
    const finalDj = await prisma.userDj.findUnique({
      where: { id: updatedDj.id },
    });

    console.log('[updateDjProfile] Profil final récupéré de la DB:');
    console.log('  - bio:', finalDj.bio || '(null)');
    console.log('  - genre:', finalDj.genre || '(null)');
    console.log('  - mainCity:', finalDj.mainCity || '(null)');

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
      },
    });
  } catch (error) {
    handleError(error, res, 'Erreur serveur');
  }
};

module.exports = {
  getUserProfiles,
  switchProfile,
  changePassword,
  getUserById,
  getCurrentUser,
  getCurrentDjProfile,
  updateDjProfile,
};

