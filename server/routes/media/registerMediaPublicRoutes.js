/**
 * Médias DJ publics et notes lieu.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');

module.exports = function registerMediaPublicRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    deleteFromR2,
  } = deps;

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
        const filePath = path.join(SERVER_ROOT, 'uploads', 'media', filename);
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
};
