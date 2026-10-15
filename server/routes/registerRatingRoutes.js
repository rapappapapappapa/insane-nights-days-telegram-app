/**
 * Notes DJ / Lieu et vérification.
 */
const prisma = require('../lib/prisma');
const { calculateDjRatings, calculateVenueRatings } = require('../utils/ratingCalculations');

module.exports = function registerRatingRoutes(app, deps) {
  const { authenticateToken } = deps;

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
};
