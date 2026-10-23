/**
 * djProfile — extrait de userController.js
 */

const prisma = require('../../lib/prisma');
const { handleError, sendError, sendSuccess } = require('../../utils/helpers');
const DEBUG_LOGS = process.env.DEBUG_LOGS === 'true';
const dlog = (...args) => {
  if (DEBUG_LOGS) console.log(...args);
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

module.exports = {
  getCurrentDjProfile,
  updateDjProfile,
};
