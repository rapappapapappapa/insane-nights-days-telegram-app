/**
 * Invitations DJ / Lieu / Prestataire (accept, reject, cancel).
 */
const prisma = require('../../lib/prisma');

module.exports = function registerInvitationRoutes(app, deps) {
  const { authenticateToken } = deps;

app.put('/api/dj/invitations/:invitationId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    // Récupérer l'invitation
    const invitation = await prisma.eventDj.findUnique({
      where: { id: invitationId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation non trouvée.',
      });
    }

    // Vérifier que l'invitation appartient au DJ connecté
    if (invitation.djId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette invitation.',
      });
    }

    // Vérifier que l'invitation est en PENDING
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${invitation.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    // Mettre à jour le statut à ACCEPTED
    const updatedInvitation = await prisma.eventDj.update({
      where: { id: invitationId },
      data: { status: 'ACCEPTED' },
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
    });

    res.json({
      success: true,
      message: 'Invitation acceptée avec succès.',
      invitation: {
        id: updatedInvitation.id,
        eventId: updatedInvitation.event.id,
        eventTitle: updatedInvitation.event.title,
        eventDate: updatedInvitation.event.date,
        eventTime: updatedInvitation.event.time,
        eventLocation: updatedInvitation.event.location,
        invitationStatus: updatedInvitation.status,
        venue: updatedInvitation.event.venue ? {
          id: updatedInvitation.event.venue.id,
          name: updatedInvitation.event.venue.venueName,
          address: updatedInvitation.event.venue.address,
        } : null,
        booker: updatedInvitation.event.booker ? {
          id: updatedInvitation.event.booker.id,
          name: `${updatedInvitation.event.booker.prenom} ${updatedInvitation.event.booker.nom}`,
          type: updatedInvitation.event.booker.bookerType,
        } : null,
      },
    });
  } catch (error) {
    console.error('Erreur acceptation invitation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Refuse une invitation à un événement
 * @route PUT /api/dj/invitations/:invitationId/reject
 */
app.put('/api/dj/invitations/:invitationId/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    // Récupérer l'invitation
    const invitation = await prisma.eventDj.findUnique({
      where: { id: invitationId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
          },
        },
      },
    });

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation non trouvée.',
      });
    }

    // Vérifier que l'invitation appartient au DJ connecté
    if (invitation.djId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette invitation.',
      });
    }

    // Vérifier que l'invitation est en PENDING
    if (invitation.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${invitation.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const { reason } = req.body ?? {};
    const rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    // Mettre à jour le statut à REJECTED
    const updatedInvitation = await prisma.eventDj.update({
      where: { id: invitationId },
      data: { status: 'REJECTED', rejectionReason },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Invitation refusée.',
      invitation: {
        id: updatedInvitation.id,
        eventId: updatedInvitation.event.id,
        eventTitle: updatedInvitation.event.title,
        invitationStatus: updatedInvitation.status,
      },
    });
  } catch (error) {
    console.error('Erreur refus invitation:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Annule un booking (après acceptation)
 * @route PUT /api/dj/invitations/:invitationId/cancel
 */
app.put('/api/dj/invitations/:invitationId/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { invitationId } = req.params;

    const invitation = await prisma.eventDj.findUnique({
      where: { id: invitationId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!invitation) {
      return res.status(404).json({ success: false, message: 'Booking introuvable.' });
    }
    if (invitation.djId !== userId) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (invitation.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Seul un booking accepté peut être annulé.',
      });
    }

    const { reason } = req.body ?? {};
    const cancellationReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    await prisma.eventDj.update({
      where: { id: invitationId },
      data: { status: 'CANCELLED', rejectionReason: cancellationReason },
    });

    return res.json({
      success: true,
      message: 'Booking annulé.',
      invitation: { id: invitation.id, eventId: invitation.event.id, invitationStatus: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Erreur annulation booking DJ:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Accepte une invitation lieu à un événement
 * @route PUT /api/venue/invitations/:eventVenueId/accept
 */
app.put('/api/venue/invitations/:eventVenueId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const venue = await prisma.userVenue.findFirst({ where: { userId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ev) {
      return res.status(404).json({ success: false, message: 'Invitation non trouvée.' });
    }
    if (ev.venueId !== venue.id) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette invitation.' });
    }
    if (ev.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${ev.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const updated = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: { status: 'ACCEPTED' },
      include: {
        event: {
          include: {
            venue: { select: { id: true, venueName: true, address: true } },
            booker: { select: { id: true, nom: true, prenom: true, bookerType: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Invitation acceptée avec succès.',
      invitation: {
        id: updated.id,
        eventId: updated.event.id,
        eventTitle: updated.event.title,
        eventDate: updated.event.date,
        eventTime: updated.event.time,
        invitationStatus: updated.status,
        venue: updated.event.venue ? { id: updated.event.venue.id, name: updated.event.venue.venueName, address: updated.event.venue.address } : null,
        booker: updated.event.booker ? { id: updated.event.booker.id, name: `${updated.event.booker.prenom} ${updated.event.booker.nom}`, type: updated.event.booker.bookerType } : null,
      },
    });
  } catch (error) {
    console.error('Erreur acceptation invitation lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Refuse une invitation lieu à un événement
 * @route PUT /api/venue/invitations/:eventVenueId/reject
 */
app.put('/api/venue/invitations/:eventVenueId/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const venue = await prisma.userVenue.findFirst({ where: { userId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ev) {
      return res.status(404).json({ success: false, message: 'Invitation non trouvée.' });
    }
    if (ev.venueId !== venue.id) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette invitation.' });
    }
    if (ev.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${ev.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const { reason } = req.body ?? {};
    const rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    const updated = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: { status: 'REJECTED', rejectionReason },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    res.json({
      success: true,
      message: 'Invitation refusée.',
      invitation: {
        id: updated.id,
        eventId: updated.event.id,
        eventTitle: updated.event.title,
        invitationStatus: updated.status,
      },
    });
  } catch (error) {
    console.error('Erreur refus invitation lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Annule un booking lieu (après acceptation)
 * @route PUT /api/venue/invitations/:eventVenueId/cancel
 */
app.put('/api/venue/invitations/:eventVenueId/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;

    const venue = await prisma.userVenue.findFirst({ where: { userId } });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Profil lieu non trouvé.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ev) {
      return res.status(404).json({ success: false, message: 'Booking introuvable.' });
    }
    if (ev.venueId !== venue.id) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (ev.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Seul un booking accepté peut être annulé.',
      });
    }

    const { reason } = req.body ?? {};
    const cancellationReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: { status: 'CANCELLED', rejectionReason: cancellationReason },
    });

    return res.json({
      success: true,
      message: 'Booking annulé.',
      invitation: { id: ev.id, eventId: ev.event.id, invitationStatus: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Erreur annulation booking lieu:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route PUT /api/prestataire/invitations/:eventPrestataireId/accept
 */
app.put('/api/prestataire/invitations/:eventPrestataireId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;

    const prest = await prisma.userPrestataire.findFirst({ where: { userId } });
    if (!prest) {
      return res.status(404).json({ success: false, message: 'Profil prestataire non trouvé.' });
    }

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ep) {
      return res.status(404).json({ success: false, message: 'Invitation non trouvée.' });
    }
    if (ep.prestataireId !== prest.id) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette invitation.' });
    }
    if (ep.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${ep.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const updated = await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: { status: 'ACCEPTED' },
      include: {
        event: {
          include: {
            venue: { select: { id: true, venueName: true, address: true } },
            booker: { select: { id: true, nom: true, prenom: true, bookerType: true } },
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Invitation acceptée avec succès.',
      invitation: {
        id: updated.id,
        eventId: updated.event.id,
        eventTitle: updated.event.title,
        eventDate: updated.event.date,
        eventTime: updated.event.time,
        invitationStatus: updated.status,
        venue: updated.event.venue
          ? { id: updated.event.venue.id, name: updated.event.venue.venueName, address: updated.event.venue.address }
          : null,
        booker: updated.event.booker
          ? { id: updated.event.booker.id, name: `${updated.event.booker.prenom} ${updated.event.booker.nom}`, type: updated.event.booker.bookerType }
          : null,
      },
    });
  } catch (error) {
    console.error('Erreur acceptation invitation prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route PUT /api/prestataire/invitations/:eventPrestataireId/reject
 */
app.put('/api/prestataire/invitations/:eventPrestataireId/reject', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;

    const prest = await prisma.userPrestataire.findFirst({ where: { userId } });
    if (!prest) {
      return res.status(404).json({ success: false, message: 'Profil prestataire non trouvé.' });
    }

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ep) {
      return res.status(404).json({ success: false, message: 'Invitation non trouvée.' });
    }
    if (ep.prestataireId !== prest.id) {
      return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette invitation.' });
    }
    if (ep.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cette invitation a déjà été ${ep.status === 'ACCEPTED' ? 'acceptée' : 'refusée'}.`,
      });
    }

    const { reason } = req.body ?? {};
    const rejectionReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    const updated = await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: { status: 'REJECTED', rejectionReason },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    res.json({
      success: true,
      message: 'Invitation refusée.',
      invitation: {
        id: updated.id,
        eventId: updated.event.id,
        eventTitle: updated.event.title,
        invitationStatus: updated.status,
      },
    });
  } catch (error) {
    console.error('Erreur refus invitation prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route PUT /api/prestataire/invitations/:eventPrestataireId/cancel
 */
app.put('/api/prestataire/invitations/:eventPrestataireId/cancel', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;

    const prest = await prisma.userPrestataire.findFirst({ where: { userId } });
    if (!prest) {
      return res.status(404).json({ success: false, message: 'Profil prestataire non trouvé.' });
    }

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { select: { id: true, title: true, date: true, time: true } } },
    });

    if (!ep) {
      return res.status(404).json({ success: false, message: 'Booking introuvable.' });
    }
    if (ep.prestataireId !== prest.id) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (ep.status !== 'ACCEPTED') {
      return res.status(400).json({
        success: false,
        message: 'Seul un booking accepté peut être annulé.',
      });
    }

    const { reason } = req.body ?? {};
    const cancellationReason = typeof reason === 'string' && reason.trim() ? reason.trim() : null;

    await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: { status: 'CANCELLED', rejectionReason: cancellationReason },
    });

    return res.json({
      success: true,
      message: 'Booking annulé.',
      invitation: { id: ep.id, eventId: ep.event.id, invitationStatus: 'CANCELLED' },
    });
  } catch (error) {
    console.error('Erreur annulation booking prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// Endpoint pour récupérer les médias d'un DJ
};
