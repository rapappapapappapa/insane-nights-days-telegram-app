/**
 * Upload et gestion médias DJ / Lieu.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');

module.exports = function registerMediaUploadRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    deleteFromR2,
    uploadLocal,
    uploadMemory,
  } = deps;

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
          const oldFilePath = path.join(SERVER_ROOT, 'uploads', 'media', path.basename(old.url));
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
      const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
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
      const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
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
        const filePath = path.join(SERVER_ROOT, 'uploads', 'media', filename);
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

};
