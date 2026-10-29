/**
 * Upload photo/bannière profils Communauté et Lieu (avant userRoutes).
 */
const path = require('path');
const prisma = require('../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '..');

module.exports = function registerUserProfileUploadRoutes(app, deps) {
  const { authenticateToken, MEDIA_STORAGE, makeObjectKey, uploadToR2, uploadLocal, uploadMemory } = deps;

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
          const fp = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
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
          const fp = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
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
};
