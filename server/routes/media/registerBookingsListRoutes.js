/**
 * Listes de réservations DJ / Lieu / Prestataire.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerBookingsListRoutes(app, deps) {
  const { authenticateToken } = deps;

app.get('/api/dj/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Récupérer le profil DJ de l'utilisateur
    const dj = await prisma.userDj.findFirst({
      where: { userId },
    });

    if (!dj) {
      return res.status(404).json({ success: false, message: 'Profil DJ non trouvé.' });
    }

    // Récupérer les événements où ce DJ est associé
    // djId dans EventDj pointe vers User.id (pas UserDj.id)
    const eventDjs = await prisma.eventDj.findMany({
      where: { djId: userId },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                venueName: true,
                address: true,
              },
            },
            booker: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                bookerType: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          date: 'desc',
        },
      },
    });

    const resolvePaymentStatus = (ed, eventStatus) => {
      if (ed?.paymentStatus === 'PAID' || ed?.paidAt) return 'PAID';
      if (ed?.contractStatus === 'SIGNED') return 'PENDING'; // Contrat signé = paiement en attente
      if (eventStatus === 'FINISHED' || eventStatus === 'ONGOING') return 'PENDING';
      return 'UPCOMING';
    };

    const bookings = eventDjs.map((ed) => ({
      id: ed.id,
      eventId: ed.event.id,
      eventTitle: ed.event.title,
      eventDate: ed.event.date,
      eventTime: ed.event.time,
      eventLocation: ed.event.location,
      eventStatus: ed.event.status,
      invitationStatus: ed.status, // Statut de l'invitation (PENDING, ACCEPTED, REJECTED)
      paymentStatus: resolvePaymentStatus(ed, ed.event.status),
      paymentAmount: ed.paymentAmount ?? null,
      paymentCurrency: ed.paymentCurrency ?? 'eur',
      paidAt: ed.paidAt ?? null,
      invoiceNumber: ed.invoiceNumber ?? null,
      venue: ed.event.venue ? {
        id: ed.event.venue.id,
        name: ed.event.venue.venueName,
        address: ed.event.venue.address,
      } : null,
      booker: ed.event.booker ? {
        id: ed.event.booker.id,
        name: `${ed.event.booker.prenom} ${ed.event.booker.nom}`,
        type: ed.event.booker.bookerType,
      } : null,
      createdAt: ed.createdAt,
    }));

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error('Erreur récupération bookings DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer les bookings d'un lieu (événements où il est associé via EventVenue)
app.get('/api/venue/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const venue = await prisma.userVenue.findFirst({
      where: { userId },
    });

    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const eventVenues = await prisma.eventVenue.findMany({
      where: { venueId: venue.id },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                venueName: true,
                address: true,
              },
            },
            booker: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                bookerType: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          date: 'desc',
        },
      },
    });

    const resolvePaymentStatus = (ev, eventStatus) => {
      if (ev?.paymentStatus === 'PAID' || ev?.paidAt) return 'PAID';
      if (ev?.contractStatus === 'SIGNED') return 'PENDING';
      if (eventStatus === 'FINISHED' || eventStatus === 'ONGOING') return 'PENDING';
      return 'UPCOMING';
    };

    const bookings = eventVenues.map((ev) => ({
      id: ev.id,
      eventVenueId: ev.id,
      eventId: ev.event.id,
      eventTitle: ev.event.title,
      eventDate: ev.event.date,
      eventTime: ev.event.time,
      eventLocation: ev.event.location,
      eventStatus: ev.event.status,
      invitationStatus: ev.status,
      paymentStatus: resolvePaymentStatus(ev, ev.event.status),
      paymentAmount: ev.paymentAmount ?? null,
      paymentCurrency: ev.paymentCurrency ?? 'eur',
      paidAt: ev.paidAt ?? null,
      invoiceNumber: ev.invoiceNumber ?? null,
      venue: ev.event.venue ? {
        id: ev.event.venue.id,
        name: ev.event.venue.venueName,
        address: ev.event.venue.address,
      } : null,
      booker: ev.event.booker ? {
        id: ev.event.booker.id,
        name: `${ev.event.booker.prenom} ${ev.event.booker.nom}`,
        type: ev.event.booker.bookerType,
      } : null,
      createdAt: ev.createdAt,
    }));

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error('Erreur récupération bookings lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Bookings prestataire (EventPrestataire)
app.get('/api/prestataire/bookings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const prest = await prisma.userPrestataire.findFirst({
      where: { userId },
    });

    if (!prest) {
      return res.status(404).json({ success: false, message: 'Profil prestataire non trouvé.' });
    }

    const rows = await prisma.eventPrestataire.findMany({
      where: { prestataireId: prest.id },
      include: {
        event: {
          include: {
            venue: {
              select: {
                id: true,
                venueName: true,
                address: true,
              },
            },
            booker: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                bookerType: true,
              },
            },
          },
        },
      },
      orderBy: {
        event: {
          date: 'desc',
        },
      },
    });

    const resolvePaymentStatus = (ep, eventStatus) => {
      if (ep?.paymentStatus === 'PAID' || ep?.paidAt) return 'PAID';
      if (ep?.contractStatus === 'SIGNED') return 'PENDING';
      if (eventStatus === 'FINISHED' || eventStatus === 'ONGOING') return 'PENDING';
      return 'UPCOMING';
    };

    const bookings = rows.map((ep) => ({
      id: ep.id,
      eventPrestataireId: ep.id,
      eventId: ep.event.id,
      eventTitle: ep.event.title,
      eventDate: ep.event.date,
      eventTime: ep.event.time,
      eventLocation: ep.event.location,
      eventStatus: ep.event.status,
      invitationStatus: ep.status,
      paymentStatus: resolvePaymentStatus(ep, ep.event.status),
      paymentAmount: ep.paymentAmount ?? null,
      paymentCurrency: ep.paymentCurrency ?? 'eur',
      paidAt: ep.paidAt ?? null,
      invoiceNumber: ep.invoiceNumber ?? null,
      venue: ep.event.venue
        ? {
            id: ep.event.venue.id,
            name: ep.event.venue.venueName,
            address: ep.event.venue.address,
          }
        : null,
      booker: ep.event.booker
        ? {
            id: ep.event.booker.id,
            name: `${ep.event.booker.prenom} ${ep.event.booker.nom}`,
            type: ep.event.booker.bookerType,
          }
        : null,
      createdAt: ep.createdAt,
    }));

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error('Erreur récupération bookings prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Accepte une invitation à un événement
 * @route PUT /api/dj/invitations/:invitationId/accept
 */
};
