/**
 * Tickets QR, stats, ranking, endpoint test.
 */
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const { calculateDjRatings, calculateVenueRatings } = require('../utils/ratingCalculations');

module.exports = function registerMiscRoutes(app, deps) {
  const { authenticateToken } = deps;

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
      message: '🎉 Backend NOX fonctionne parfaitement',
      timestamp: new Date().toISOString(),
      walletUsersCount: 0, // Plus utilisé, gardé pour compatibilité
      registeredUsersCount: registeredUsers,
      eventsCount: eventsCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur lors du test.' });
  }
});
};
