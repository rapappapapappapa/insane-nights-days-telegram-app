/**
 * Création / mise à jour des profils (Community, DJ, Booker, Venue, Prestataire).
 */
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { normalizeGenreStrings, normalizeAvailableDays } = require('../utils/prestataireProfile');
const SERVER_ROOT = path.join(__dirname, '..');

const DEFAULT_PRESTATAIRE_AVAILABLE_DAYS_JSON = JSON.stringify({
  M: true, Ma: true, Me: true, J: true, V: true, S: false, D: false,
});

module.exports = function registerProfileRoutes(app, deps) {
  const {
    authenticateToken,
    authController,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

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
          const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
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
        const oldFilePath = path.join(SERVER_ROOT, 'uploads', 'media', path.basename(bookerProfile.profileImage));
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
    const { venueName, address, companyName, legalRepresentative, postalCode, city, country, siret, maxCapacity } =
      req.body ?? {};
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
    if (maxCapacity !== undefined && maxCapacity !== null && String(maxCapacity).trim() !== '') {
      const mc = parseInt(String(maxCapacity).replace(/\s/g, ''), 10);
      if (!Number.isFinite(mc) || mc < 1) {
        return res.status(400).json({
          success: false,
          message: 'maxCapacity doit être un entier positif (≥ 1) ou être omis.',
        });
      }
      venueData.maxCapacity = mc;
    }

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
        maxCapacity: venueProfile.maxCapacity ?? null,
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

// Création profil Prestataire (photo, vidéo, technique, etc.)
app.post('/api/profile/prestataire', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessName, phonePro, city, country, bio, prestationGenres, serviceType } = req.body ?? {};

    let genres = normalizeGenreStrings(prestationGenres);
    if (genres.length === 0 && typeof serviceType === 'string' && serviceType.trim()) {
      genres = normalizeGenreStrings([serviceType.trim()]);
    }

    if (!businessName?.trim() || !phonePro?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis : businessName, phonePro.',
      });
    }
    if (genres.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un genre de prestation est requis (prestationGenres).',
      });
    }

    const existing = await prisma.userPrestataire.findUnique({ where: { userId } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Un profil prestataire existe déjà pour ce compte.',
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé.' });
    }

    const daysStored = normalizeAvailableDays(req.body.availableDays) ?? DEFAULT_PRESTATAIRE_AVAILABLE_DAYS_JSON;
    const availableStatus =
      req.body.availableStatus !== undefined ? Boolean(req.body.availableStatus) : true;

    const data = {
      userId,
      businessName: businessName.trim(),
      prestationGenres: genres,
      phonePro: phonePro.trim(),
      city: city != null ? String(city).trim() || null : null,
      country: country != null ? String(country).trim() || null : null,
      bio: bio != null ? String(bio).trim() || null : null,
      availableDays: daysStored,
      availableStatus,
    };

    const profile = await prisma.userPrestataire.create({ data });

    await prisma.user.update({
      where: { id: userId },
      data: {
        accountType: 'PRESTATAIRE',
        activeProfileType: 'PRESTATAIRE',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Profil Prestataire créé avec succès.',
      profile: {
        id: profile.id,
        businessName: profile.businessName,
        prestationGenres: profile.prestationGenres,
        phonePro: profile.phonePro,
        availableDays: profile.availableDays,
        availableStatus: profile.availableStatus,
      },
    });
  } catch (error) {
    console.error('Erreur création profil Prestataire:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du profil Prestataire.',
    });
  }
});

app.put('/api/prestataire/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { businessName, phonePro, city, country, bio, prestationGenres, serviceType } = req.body ?? {};

    let genres = normalizeGenreStrings(prestationGenres);
    if (genres.length === 0 && typeof serviceType === 'string' && serviceType.trim()) {
      genres = normalizeGenreStrings([serviceType.trim()]);
    }

    if (!businessName?.trim() || !phonePro?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Champs requis : businessName, phonePro.',
      });
    }
    if (genres.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un genre de prestation est requis (prestationGenres).',
      });
    }

    const row = await prisma.userPrestataire.findUnique({ where: { userId } });
    if (!row) {
      return res.status(404).json({ success: false, message: 'Profil Prestataire non trouvé.' });
    }

    const parsedDays = normalizeAvailableDays(req.body.availableDays);
    const daysStored = parsedDays !== undefined ? parsedDays : row.availableDays;

    const availableStatus =
      req.body.availableStatus !== undefined ? Boolean(req.body.availableStatus) : row.availableStatus;

    const updated = await prisma.userPrestataire.update({
      where: { id: row.id },
      data: {
        businessName: businessName.trim(),
        prestationGenres: genres,
        phonePro: phonePro.trim(),
        city: city != null ? String(city).trim() || null : null,
        country: country != null ? String(country).trim() || null : null,
        bio: bio != null ? String(bio).trim() || null : null,
        availableDays: daysStored,
        availableStatus,
      },
    });

    return res.json({
      success: true,
      message: 'Profil Prestataire mis à jour avec succès.',
      profile: {
        id: updated.id,
        businessName: updated.businessName,
        prestationGenres: updated.prestationGenres,
        phonePro: updated.phonePro,
        city: updated.city,
        country: updated.country,
        bio: updated.bio,
        profileImage: updated.profileImage,
        bannerImage: updated.bannerImage,
        availableDays: updated.availableDays,
        availableStatus: updated.availableStatus,
      },
    });
  } catch (error) {
    console.error('Erreur mise à jour profil Prestataire:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil Prestataire.',
    });
  }
});
};
