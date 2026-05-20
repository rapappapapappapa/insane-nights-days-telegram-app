/**
 * Organisateur (booker) : lieux / DJs disponibles, événements, contrats, staff, scan, amis.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '..');
const {
  presetsForApi,
  normalizeEquipmentRentalForStorage,
  normalizeBookerRentalInventory,
} = require('../utils/rentalEquipment');
const { normalizeTicketTiersInput, minTierPriceEUR } = require('../utils/ticketTiers');

module.exports = function registerBookerOrganizerRoutes(app, deps) {
  const {
    authenticateToken,
    djSlotFitsEventWindow,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;
app.get('/api/booker/available-djs', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query; // Date optionnelle pour filtrer les DJs disponibles

    // Construire la condition de base
    const whereCondition = {
      availableStatus: true,
    };

    // Récupérer tous les DJs avec availableStatus = true
    let availableDjs = await prisma.userDj.findMany({
      where: whereCondition,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        artistName: 'asc',
      },
    });

    // Si une date est fournie, filtrer les DJs qui ont déjà un événement à cette date (même jour, peu importe l'heure)
    if (date) {
      try {
        const eventDate = new Date(date);
        if (!isNaN(eventDate.getTime())) {
          // Normaliser la date pour ne garder que la partie jour (année/mois/jour)
          const targetYear = eventDate.getFullYear();
          const targetMonth = eventDate.getMonth();
          const targetDay = eventDate.getDate();

          // Récupérer tous les événements UPCOMING ou ONGOING
          const allEvents = await prisma.event.findMany({
            where: {
              status: {
                in: ['UPCOMING', 'ONGOING'],
              },
            },
            include: {
              eventDjs: {
                select: {
                  djId: true,
                },
              },
            },
          });

          // Filtrer les événements qui sont le même jour que la date cible
          const bookedDjUserIds = new Set();
          allEvents.forEach(event => {
            const eventDateObj = new Date(event.date);
            const eventYear = eventDateObj.getFullYear();
            const eventMonth = eventDateObj.getMonth();
            const eventDay = eventDateObj.getDate();

            // Si c'est le même jour (même année, même mois, même jour)
            if (eventYear === targetYear && eventMonth === targetMonth && eventDay === targetDay) {
              event.eventDjs.forEach(ed => {
                bookedDjUserIds.add(ed.djId);
              });
            }
          });

          // Filtrer les DJs disponibles pour exclure ceux qui sont déjà bookés ce jour-là
          availableDjs = availableDjs.filter(dj => !bookedDjUserIds.has(dj.userId));
        }
      } catch (dateError) {
        console.error('Erreur parsing date:', dateError);
        // Si la date est invalide, on continue sans filtrer
      }
    }

    const formattedDjs = availableDjs.map((dj) => ({
      id: dj.id,
      userId: dj.userId,
      artistName: dj.artistName,
      city: dj.city,
      genre: dj.genre,
      hourlyRate: dj.hourlyRate,
      performanceRate: dj.performanceRate,
      availableDays: dj.availableDays ? (typeof dj.availableDays === 'string' ? JSON.parse(dj.availableDays) : dj.availableDays) : null,
      availableStatus: dj.availableStatus,
      averageRatingGlobal: dj.averageRatingGlobal,
    }));

    res.json({
      success: true,
      djs: formattedDjs,
    });
  } catch (error) {
    console.error('Erreur récupération DJs disponibles:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Prestataires disponibles (profils UserPrestataire) pour invitation optionnelle
 * @route GET /api/booker/available-prestataires
 */
app.get('/api/booker/available-prestataires', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;

    let prestataires = await prisma.userPrestataire.findMany({
      where: { availableStatus: true },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { businessName: 'asc' },
    });

    if (date) {
      try {
        const eventDate = new Date(date);
        if (!Number.isNaN(eventDate.getTime())) {
          const targetYear = eventDate.getFullYear();
          const targetMonth = eventDate.getMonth();
          const targetDay = eventDate.getDate();

          const allEvents = await prisma.event.findMany({
            where: { status: { in: ['UPCOMING', 'ONGOING'] } },
            include: {
              eventPrestataires: { select: { prestataireId: true } },
            },
          });

          const bookedPrestataireProfileIds = new Set();
          allEvents.forEach((evt) => {
            const d = new Date(evt.date);
            if (
              d.getFullYear() === targetYear &&
              d.getMonth() === targetMonth &&
              d.getDate() === targetDay
            ) {
              evt.eventPrestataires.forEach((ep) => {
                bookedPrestataireProfileIds.add(ep.prestataireId);
              });
            }
          });

          prestataires = prestataires.filter((p) => !bookedPrestataireProfileIds.has(p.id));
        }
      } catch (dateErr) {
        console.error('Erreur parsing date prestataires:', dateErr);
      }
    }

    const formatted = prestataires.map((p) => ({
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      prestationGenres: Array.isArray(p.prestationGenres) ? p.prestationGenres : [],
      city: p.city,
      country: p.country,
      profileImage: p.profileImage,
      availableDays: p.availableDays,
      availableStatus: p.availableStatus,
    }));

    res.json({ success: true, prestataires: formatted });
  } catch (error) {
    console.error('Erreur récupération prestataires disponibles:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Presets matériel NOX pour location (création événement).
 * @route GET /api/booker/rental-equipment-presets?lang=fr|en
 */
app.get('/api/booker/rental-equipment-presets', authenticateToken, (req, res) => {
  try {
    const lang = req.query?.lang === 'en' ? 'en' : 'fr';
    res.json({ success: true, presets: presetsForApi(lang) });
  } catch (error) {
    console.error('Erreur presets location:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Catalogue personnel du booker (articles réutilisables en location).
 * @route PUT /api/booker/profile/rental-inventory  body: { items: [{ id?, label, qty }] }
 */
app.put('/api/booker/profile/rental-inventory', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }
    const normalized = normalizeBookerRentalInventory(req.body?.items);
    if (normalized === null) {
      return res.status(400).json({ success: false, message: 'Format du catalogue invalide.' });
    }
    const updated = await prisma.userBooker.update({
      where: { id: booker.id },
      data: { rentalEquipmentInventory: normalized },
    });
    const inv = updated.rentalEquipmentInventory;
    return res.json({
      success: true,
      rentalEquipmentInventory: Array.isArray(inv) ? inv : normalized,
    });
  } catch (error) {
    console.error('Erreur mise à jour catalogue location booker:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupère tous les lieux disponibles
 * @route GET /api/booker/venues
 */
app.get('/api/booker/venues', authenticateToken, async (req, res) => {
  try {
    const venues = await prisma.userVenue.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        venueName: 'asc',
      },
    });

    const formattedVenues = venues.map((venue) => ({
      id: venue.id,
      venueName: venue.venueName,
      address: venue.address,
      averageRatingGlobal: venue.averageRatingGlobal,
      maxCapacity: venue.maxCapacity ?? null,
    }));

    res.json({
      success: true,
      venues: formattedVenues,
    });
  } catch (error) {
    console.error('Erreur récupération lieux:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupérer les événements d'un booker
 * @route GET /api/booker/events
 */
app.get('/api/booker/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Récupérer les événements du booker
    const events = await prisma.event.findMany({
      where: {
        bookerId: booker.id,
      },
      include: {
        venue: {
          select: {
            id: true,
            venueName: true,
            address: true,
          },
        },
        eventDjs: true,
        eventVenues: {
          include: {
            venue: { select: { id: true, venueName: true, address: true } },
          },
        },
        eventPrestataires: {
          include: {
            prestataire: { select: { id: true, businessName: true, prestationGenres: true, profileImage: true } },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Enrichir avec les infos des DJs et leurs statuts d'invitation
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        // Créer un map des statuts d'invitation et eventDjId par userId
        const invitationStatusMap = {};
        const eventDjIdMap = {};
        const paymentInfoMap = {};
        event.eventDjs.forEach((ed) => {
          invitationStatusMap[ed.djId] = ed.status;
          eventDjIdMap[ed.djId] = ed.id; // ID de l'EventDj pour le chat
          const resolvePaymentStatus = () => {
            if (ed?.paymentStatus === 'PAID' || ed?.paidAt) return 'PAID';
            if (ed?.contractStatus === 'SIGNED') return 'PENDING'; // Contrat signé = paiement en attente
            if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
            return 'UPCOMING';
          };
          paymentInfoMap[ed.djId] = {
            paymentStatus: resolvePaymentStatus(),
            paymentAmount: ed.paymentAmount ?? null,
            paymentCurrency: ed.paymentCurrency ?? 'eur',
            paidAt: ed.paidAt ?? null,
            invoiceNumber: ed.invoiceNumber ?? null,
          };
        });

        const djUserIds = event.eventDjs.map((ed) => ed.djId);
        const djs = await prisma.userDj.findMany({
          where: {
            userId: { in: djUserIds },
          },
          select: {
            userId: true,
            artistName: true,
          },
        });

        const eventTickets = await prisma.ticket.findMany({
          where: { eventId: event.id },
          select: {
            id: true,
            userId: true,
            status: true,
            scannedAt: true,
            user: {
              select: {
                username: true,
                communities: {
                  select: { pseudo: true, prenom: true, nom: true },
                  take: 1,
                },
              },
            },
          },
          orderBy: { purchaseDate: 'asc' },
        });
        const ticketHolders = eventTickets.map((t) => {
          const c = t.user?.communities?.[0];
          let displayName = c?.pseudo || '';
          if (!displayName) {
            const full = [c?.prenom, c?.nom].filter(Boolean).join(' ').trim();
            displayName = full || '';
          }
          if (!displayName) displayName = t.user?.username || 'Participant';
          const entered = t.status === 'used' || !!t.scannedAt;
          return {
            ticketId: t.id,
            displayName,
            ticketStatus: t.status,
            entered,
          };
        });

        const activeEventVenues = (event.eventVenues || []).filter((ev) => ev.status === 'ACCEPTED' || ev.status === 'PENDING');
        const eventVenue = activeEventVenues[0] || event.eventVenues?.[0];
        const activeEventPrestataires = (event.eventPrestataires || []).filter(
          (ep) => ep.status === 'ACCEPTED' || ep.status === 'PENDING'
        );
        const eventPrestataireRow = activeEventPrestataires[0] || event.eventPrestataires?.[0];
        const activeEventDjs = (event.eventDjs || []).filter((ed) => ed.status === 'ACCEPTED' || ed.status === 'PENDING');
        const resolveVenuePaymentStatus = (ev) => {
          if (!ev) return 'UPCOMING';
          if (ev?.paymentStatus === 'PAID' || ev?.paidAt) return 'PAID';
          if (ev?.contractStatus === 'SIGNED') return 'PENDING';
          if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
          return 'UPCOMING';
        };
        const resolvePrestatairePaymentStatus = (ep) => {
          if (!ep) return 'UPCOMING';
          if (ep?.paymentStatus === 'PAID' || ep?.paidAt) return 'PAID';
          if (ep?.contractStatus === 'SIGNED') return 'PENDING';
          if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
          return 'UPCOMING';
        };
        const allDjContractsSigned = activeEventDjs.length > 0 && activeEventDjs.every((ed) => ed.contractStatus === 'SIGNED');
        const allVenueContractsSigned =
          (event.eventVenues?.length === 0) ||
          (activeEventVenues.length > 0 && activeEventVenues.every((ev) => ev.contractStatus === 'SIGNED'));
        const allPrestataireContractsSigned =
          (event.eventPrestataires?.length === 0) ||
          (activeEventPrestataires.length > 0 &&
            activeEventPrestataires.every((ep) => ep.contractStatus === 'SIGNED'));
        const canPublishToFeed =
          allDjContractsSigned &&
          allVenueContractsSigned &&
          allPrestataireContractsSigned &&
          !event.publishedOnFeed;
        return {
          id: event.id,
          title: event.title,
          date: event.date,
          time: event.time,
          location: event.location,
          price: event.price,
          capacity: event.capacity,
          sold: event.sold,
          genre: event.genre,
          description: event.description,
          image: event.image,
          equipmentRental: event.equipmentRental ?? null,
          status: event.status,
          venue: eventVenue ? {
            id: eventVenue.venue?.id ?? eventVenue.venueId,
            venueName: eventVenue.venue?.venueName ?? event.venue?.venueName ?? null,
            address: eventVenue.venue?.address ?? event.venue?.address ?? null,
            eventVenueId: eventVenue?.id ?? null,
            venueInvitationStatus: eventVenue?.status ?? 'PENDING',
            payment: {
              paymentStatus: resolveVenuePaymentStatus(eventVenue),
              paymentAmount: eventVenue?.paymentAmount ?? null,
              paymentCurrency: eventVenue?.paymentCurrency ?? 'eur',
              paidAt: eventVenue?.paidAt ?? null,
              invoiceNumber: eventVenue?.invoiceNumber ?? null,
            },
          } : null,
          prestataire: eventPrestataireRow
            ? {
                id: eventPrestataireRow.prestataire?.id ?? eventPrestataireRow.prestataireId,
                businessName: eventPrestataireRow.prestataire?.businessName ?? null,
                prestationGenres: Array.isArray(eventPrestataireRow.prestataire?.prestationGenres)
                  ? eventPrestataireRow.prestataire.prestationGenres
                  : [],
                profileImage: eventPrestataireRow.prestataire?.profileImage ?? null,
                eventPrestataireId: eventPrestataireRow.id,
                prestataireInvitationStatus: eventPrestataireRow.status ?? 'PENDING',
                payment: {
                  paymentStatus: resolvePrestatairePaymentStatus(eventPrestataireRow),
                  paymentAmount: eventPrestataireRow.paymentAmount ?? null,
                  paymentCurrency: eventPrestataireRow.paymentCurrency ?? 'eur',
                  paidAt: eventPrestataireRow.paidAt ?? null,
                  invoiceNumber: eventPrestataireRow.invoiceNumber ?? null,
                },
              }
            : null,
          djIds: activeEventDjs.map((ed) => ed.djId),
          venueNeedsReplacement: !activeEventVenues.length,
          djs: djs.map((dj) => ({
            userId: dj.userId,
            artistName: dj.artistName,
            invitationStatus: invitationStatusMap[dj.userId] || 'PENDING', // Statut de l'invitation
            eventDjId: eventDjIdMap[dj.userId], // ID de l'EventDj pour le chat
            payment: paymentInfoMap[dj.userId] ?? { paymentStatus: 'UPCOMING' },
          })),
          publishedOnFeed: event.publishedOnFeed ?? false,
          canPublishToFeed,
          ticketHolders,
          createdAt: event.createdAt,
          updatedAt: event.updatedAt,
        };
      })
    );

    res.json({
      success: true,
      events: enrichedEvents,
    });
  } catch (error) {
    console.error('Erreur récupération événements booker:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// Amis Organisateur ↔ Communauté + Staff événement + Scan QR
// ============================================================================

/** GET /api/booker/friends - Liste des amis Communauté du booker (status ACCEPTED) */
app.get('/api/booker/friends', authenticateToken, async (req, res) => {
  try {
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const friends = await prisma.bookerCommunityFriend.findMany({
      where: { bookerId: booker.id, status: 'ACCEPTED' },
      include: { community: { select: { id: true, pseudo: true, profileImage: true } } },
    });
    res.json({
      success: true,
      friends: friends.map((f) => ({
        id: f.id,
        communityId: f.community.id,
        pseudo: f.community.pseudo || 'Anonyme',
        profileImage: f.community.profileImage,
      })),
    });
  } catch (e) {
    console.error('Erreur liste amis booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/booker/friends - Envoyer une demande d'ami (body: { communityId }) */
app.post('/api/booker/friends', authenticateToken, async (req, res) => {
  try {
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const { communityId } = req.body ?? {};
    if (!communityId) return res.status(400).json({ success: false, message: 'communityId requis.' });
    const existing = await prisma.bookerCommunityFriend.findUnique({
      where: { bookerId_communityId: { bookerId: booker.id, communityId } },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') return res.status(400).json({ success: false, message: 'Déjà amis.' });
      if (existing.status === 'PENDING') return res.status(400).json({ success: false, message: 'Demande déjà envoyée.' });
      return res.status(400).json({ success: false, message: 'Demande précédemment refusée.' });
    }
    const community = await prisma.userCommunity.findUnique({ where: { id: communityId } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté introuvable.' });
    await prisma.bookerCommunityFriend.create({
      data: { bookerId: booker.id, communityId, status: 'PENDING' },
    });
    res.json({ success: true, message: 'Demande envoyée.' });
  } catch (e) {
    console.error('Erreur envoi demande ami booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/community/staff-events - Événements où l'utilisateur (Communauté) est staff */
app.get('/api/community/staff-events', authenticateToken, async (req, res) => {
  try {
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.json({ success: true, events: [] });
    const staffAssignments = await prisma.eventStaff.findMany({
      where: { communityId: community.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            image: true,
            status: true,
            sold: true,
            capacity: true,
          },
        },
      },
    });
    const events = staffAssignments
      .filter((s) => s.event)
      .map((s) => ({ ...s.event, date: s.event.date?.toISOString?.() ?? s.event.date }));
    res.json({ success: true, events });
  } catch (e) {
    console.error('Erreur staff-events:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/community/booker-friend-requests - Demandes reçues (côté Communauté) */
app.get('/api/community/booker-friend-requests', authenticateToken, async (req, res) => {
  try {
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté requis.' });
    const requests = await prisma.bookerCommunityFriend.findMany({
      where: { communityId: community.id, status: 'PENDING' },
      include: { booker: { select: { id: true, pseudo: true, profileImage: true } } },
    });
    res.json({
      success: true,
      requests: requests.map((r) => ({
        id: r.id,
        bookerId: r.booker.id,
        pseudo: r.booker.pseudo || 'Organisateur',
        profileImage: r.booker.profileImage,
      })),
    });
  } catch (e) {
    console.error('Erreur demandes amis booker:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** PUT /api/booker/friends/:id/respond - Accepter ou refuser (body: { accept: true|false }) */
app.put('/api/booker/friends/:id/respond', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { accept } = req.body ?? {};
    const community = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    if (!community) return res.status(404).json({ success: false, message: 'Profil Communauté requis.' });
    const link = await prisma.bookerCommunityFriend.findUnique({ where: { id } });
    if (!link || link.communityId !== community.id) return res.status(404).json({ success: false, message: 'Demande introuvable.' });
    if (link.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Demande déjà traitée.' });
    await prisma.bookerCommunityFriend.update({
      where: { id },
      data: { status: accept ? 'ACCEPTED' : 'DECLINED' },
    });
    res.json({ success: true, message: accept ? 'Demande acceptée.' : 'Demande refusée.' });
  } catch (e) {
    console.error('Erreur réponse demande ami:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** GET /api/events/:eventId/staff - Liste du staff (booker ou staff) */
app.get('/api/events/:eventId/staff', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { booker: true, eventStaff: { include: { community: { select: { id: true, pseudo: true, profileImage: true } } } } },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isBooker = event.booker?.userId === req.user.id;
    const myCommunity = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    const isStaff = myCommunity && event.eventStaff.some((s) => s.communityId === myCommunity.id);
    if (!isBooker && !isStaff) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    res.json({
      success: true,
      staff: event.eventStaff.map((s) => ({
        communityId: s.community.id,
        pseudo: s.community.pseudo || 'Staff',
        profileImage: s.community.profileImage,
        role: s.role,
      })),
    });
  } catch (e) {
    console.error('Erreur liste staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/events/:eventId/staff - Ajouter un staff (booker uniquement, community doit être ami) */
app.post('/api/events/:eventId/staff', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { communityId, role = 'STAFF_SCAN' } = req.body ?? {};
    if (!communityId) return res.status(400).json({ success: false, message: 'communityId requis.' });
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const event = await prisma.event.findFirst({ where: { id: eventId, bookerId: booker.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isFriend = await prisma.bookerCommunityFriend.findUnique({
      where: { bookerId_communityId: { bookerId: booker.id, communityId } },
    });
    if (!isFriend || isFriend.status !== 'ACCEPTED') {
      return res.status(400).json({ success: false, message: 'Seuls vos amis Communauté peuvent être ajoutés comme staff.' });
    }
    await prisma.eventStaff.upsert({
      where: { eventId_communityId: { eventId, communityId } },
      create: { eventId, communityId, role, addedByBookerId: booker.id },
      update: { role },
    });
    res.json({ success: true, message: 'Staff ajouté.' });
  } catch (e) {
    console.error('Erreur ajout staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** DELETE /api/events/:eventId/staff/:communityId */
app.delete('/api/events/:eventId/staff/:communityId', authenticateToken, async (req, res) => {
  try {
    const { eventId, communityId } = req.params;
    const booker = await prisma.userBooker.findFirst({ where: { userId: req.user.id } });
    if (!booker) return res.status(404).json({ success: false, message: 'Profil Booker requis.' });
    const event = await prisma.event.findFirst({ where: { id: eventId, bookerId: booker.id } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    await prisma.eventStaff.deleteMany({ where: { eventId, communityId } });
    res.json({ success: true, message: 'Staff retiré.' });
  } catch (e) {
    console.error('Erreur retrait staff:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/** POST /api/events/:eventId/scan-ticket - Scanner un billet (body: { qrCode } ou { data } du QR) */
app.post('/api/events/:eventId/scan-ticket', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    let qrCode = req.body?.qrCode ?? req.body?.data;
    if (!qrCode && typeof req.body === 'string') qrCode = req.body;
    if (!qrCode) return res.status(400).json({ success: false, message: 'qrCode requis.' });
    // Si le QR contient du JSON (format mobile), extraire qrCode
    if (typeof qrCode === 'object' && qrCode.qrCode) qrCode = qrCode.qrCode;
    if (typeof qrCode === 'string' && qrCode.startsWith('{')) {
      try {
        const parsed = JSON.parse(qrCode);
        qrCode = parsed.qrCode || parsed.data || qrCode;
      } catch {}
    }
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { booker: true, eventStaff: true },
    });
    if (!event) return res.status(404).json({ success: false, message: 'Événement introuvable.' });
    const isBooker = event.booker?.userId === req.user.id;
    const myCommunity = await prisma.userCommunity.findFirst({ where: { userId: req.user.id } });
    const isStaff = myCommunity && event.eventStaff.some((s) => s.communityId === myCommunity.id && s.role === 'STAFF_SCAN');
    if (!isBooker && !isStaff) return res.status(403).json({ success: false, message: 'Seul l\'organisateur ou le staff peut scanner.' });
    // Fenêtre de scan : même jour UTC, OU ONGOING, OU SCAN_TICKET_ALLOW_ANY_DAY (explicite), OU défaut Railway si var absente, OU scanTestSecret
    const eventDate = new Date(event.date);
    const now = new Date();
    const sameDay =
      eventDate.getUTCFullYear() === now.getUTCFullYear() &&
      eventDate.getUTCMonth() === now.getUTCMonth() &&
      eventDate.getUTCDate() === now.getUTCDate();
    const rawAllowAnyDay = process.env.SCAN_TICKET_ALLOW_ANY_DAY;
    const deployedOnRailway = Boolean(
      process.env.RAILWAY_PUBLIC_DOMAIN ||
        process.env.RAILWAY_ENVIRONMENT ||
        process.env.RAILWAY_SERVICE_NAME,
    );
    const scanTicketAllowAnyDay =
      rawAllowAnyDay !== undefined && String(rawAllowAnyDay).trim() !== ''
        ? String(rawAllowAnyDay).toLowerCase() === 'true'
        : deployedOnRailway;
    // Phase de test : même effet que ALLOW_ANY_DAY si le client envoie scanTestSecret identique à SCAN_TICKET_TEST_SECRET (≥ 8 car.).
    const serverTestSecret = process.env.SCAN_TICKET_TEST_SECRET;
    const clientTestSecret = req.body?.scanTestSecret;
    const allowByTestSecret =
      typeof serverTestSecret === 'string' &&
      serverTestSecret.length >= 8 &&
      typeof clientTestSecret === 'string' &&
      clientTestSecret === serverTestSecret;
    const allowScanByWindow =
      scanTicketAllowAnyDay || allowByTestSecret || event.status === 'ONGOING' || sameDay;
    if (!allowScanByWindow) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: 'Le scan des billets n\'est autorisé que le jour de l\'événement (ou pendant l\'événement une fois commencé).',
      });
    }
    const ticket = await prisma.ticket.findUnique({
      where: { qrCode },
      include: {
        event: { select: { id: true, title: true } },
        user: {
          select: {
            username: true,
            communities: { select: { pseudo: true, prenom: true, nom: true }, take: 1 },
          },
        },
      },
    });
    if (!ticket) return res.json({ success: false, valid: false, message: 'Billet introuvable.' });
    if (ticket.eventId !== eventId) return res.json({ success: false, valid: false, message: 'Ce billet n\'est pas pour cet événement.' });
    if (ticket.status === 'used') return res.json({ success: false, valid: false, message: 'Billet déjà utilisé.' });
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { status: 'used', scannedAt: new Date() },
    });
    const c = ticket.user?.communities?.[0];
    let holderDisplayName = c?.pseudo || '';
    if (!holderDisplayName) {
      const full = [c?.prenom, c?.nom].filter(Boolean).join(' ').trim();
      holderDisplayName = full || '';
    }
    if (!holderDisplayName) holderDisplayName = ticket.user?.username || 'Participant';
    res.json({
      success: true,
      valid: true,
      message: 'Billet validé.',
      ticket: {
        id: ticket.id,
        eventTitle: ticket.event.title,
        holderDisplayName,
        entered: true,
      },
    });
  } catch (e) {
    console.error('Erreur scan ticket:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Publier un événement sur le feed (uniquement si tous les contrats sont signés)
 * @route POST /api/booker/events/:eventId/publish-to-feed
 */
app.post('/api/booker/events/:eventId/publish-to-feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, bookerId: booker.id },
      include: { eventDjs: true, eventVenues: true, eventPrestataires: true },
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement introuvable ou accès refusé.' });
    }

    if (event.publishedOnFeed) {
      return res.status(400).json({ success: false, message: "L'événement est déjà publié sur le feed." });
    }

    const allDjSigned = event.eventDjs.length > 0 && event.eventDjs.every((ed) => ed.contractStatus === 'SIGNED');
    const allVenueSigned = !event.eventVenues?.length || event.eventVenues.every((ev) => ev.contractStatus === 'SIGNED');
    const allPrestataireSigned =
      !event.eventPrestataires?.length || event.eventPrestataires.every((ep) => ep.contractStatus === 'SIGNED');
    if (!allDjSigned || !allVenueSigned || !allPrestataireSigned) {
      return res.status(400).json({
        success: false,
        message:
          "Tous les contrats (DJ, lieu et prestataire le cas échéant) doivent être signés avant de publier sur le feed.",
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { publishedOnFeed: true },
    });

    return res.json({ success: true, message: "L'événement a été publié sur le feed." });
  } catch (error) {
    console.error('Erreur publication feed:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ MVP: Mettre à jour le statut de paiement d'un booking (Booker -> DJ)
 * @route PUT /api/booker/event-djs/:eventDjId/payment
 * body: { status: 'UPCOMING'|'PENDING'|'PAID', amount?: number (cents), currency?: 'eur', invoiceNumber?: string }
 */
app.put('/api/booker/event-djs/:eventDjId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ed = await prisma.eventDj.findUnique({
      where: { id: eventDjId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ed) return res.status(404).json({ success: false, message: 'Booking (EventDj) introuvable.' });

    // Vérifier que le booker connecté possède cet event
    const isOwner = ed.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ed.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ed.invoiceNumber;

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ed.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ed.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment booking:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Mettre à jour le statut de paiement d'un booking lieu (Booker -> Venue)
 * @route PUT /api/booker/event-venues/:eventVenueId/payment
 * body: { status: 'UPCOMING'|'PENDING'|'PAID', amount?: number (cents), currency?: 'eur', invoiceNumber?: string }
 */
app.put('/api/booker/event-venues/:eventVenueId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ev = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ev) return res.status(404).json({ success: false, message: 'Booking (EventVenue) introuvable.' });

    const isOwner = ev.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ev.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ev.invoiceNumber;

    const next = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ev.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ev.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment event-venue:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Mettre à jour le statut de paiement d'un booking prestataire (Booker → Prestataire)
 * @route PUT /api/booker/event-prestataires/:eventPrestataireId/payment
 */
app.put('/api/booker/event-prestataires/:eventPrestataireId/payment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;
    const { status, amount, currency, invoiceNumber } = req.body ?? {};

    const valid = ['UPCOMING', 'PENDING', 'PAID'];
    if (!status || !valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'status doit être UPCOMING, PENDING ou PAID.' });
    }

    const ep = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: {
        event: { include: { booker: true } },
      },
    });
    if (!ep) return res.status(404).json({ success: false, message: 'Booking (EventPrestataire) introuvable.' });

    const isOwner = ep.event?.booker?.userId === userId;
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextInvoiceNumber =
      (typeof invoiceNumber === 'string' && invoiceNumber.trim())
        ? invoiceNumber.trim()
        : (status === 'PAID' && !ep.invoiceNumber)
          ? `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`
          : ep.invoiceNumber;

    const next = await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: {
        paymentStatus: status,
        paymentAmount: typeof amount === 'number' ? Math.max(0, Math.floor(amount)) : ep.paymentAmount,
        paymentCurrency: typeof currency === 'string' && currency ? currency.toLowerCase() : ep.paymentCurrency,
        paidAt: status === 'PAID' ? new Date() : null,
        invoiceNumber: nextInvoiceNumber,
      },
    });

    return res.json({
      success: true,
      payment: {
        paymentStatus: next.paymentStatus,
        paymentAmount: next.paymentAmount,
        paymentCurrency: next.paymentCurrency,
        paidAt: next.paidAt,
        invoiceNumber: next.invoiceNumber,
      },
    });
  } catch (error) {
    console.error('Erreur update payment event-prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * ✅ Contrat booking (MVP) intégré au chat privé Booker <-> DJ
 *
 * Flow:
 * - Booker édite un DRAFT (payload JSON)
 * - Booker "envoie" => status SENT + bookerAcceptedAt + contractHash
 * - DJ "accepte" => status SIGNED + djAcceptedAt (hash immuable)
 */

const stableStringify = (obj) => {
  const seen = new WeakSet();
  const sorter = (v) => {
    if (v && typeof v === 'object') {
      if (seen.has(v)) return null;
      seen.add(v);
      if (Array.isArray(v)) return v.map(sorter);
      return Object.keys(v).sort().reduce((acc, k) => {
        acc[k] = sorter(v[k]);
        return acc;
      }, {});
    }
    return v;
  };
  return JSON.stringify(sorter(obj));
};

const hashContract = (payload) => {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(stableStringify(payload || {})).digest('hex');
};

/** Partie qui doit répondre (accepter / contre-proposer), pas celle qui a envoyé la dernière version. */
const venueContractResponderRole = (ev) => {
  const sentBy = ev.contractSentBy ?? 'BOOKER';
  return sentBy === 'BOOKER' ? 'VENUE' : 'BOOKER';
};

const prestataireContractResponderRole = (ep) => {
  const sentBy = ep.contractSentBy ?? 'BOOKER';
  return sentBy === 'BOOKER' ? 'PRESTATAIRE' : 'BOOKER';
};

const eventDjResponderRole = (ed) => {
  const sentBy = ed.contractSentBy ?? 'BOOKER';
  return sentBy === 'BOOKER' ? 'DJ' : 'BOOKER';
};

const loadEventDjWithAccess = async (eventDjId, userId) => {
  const ed = await prisma.eventDj.findUnique({
    where: { id: eventDjId },
    include: {
      event: { include: { booker: true, venue: true } },
    },
  });
  if (!ed) return { error: { code: 404, message: 'Booking (EventDj) introuvable.' } };
  const isDj = ed.djId === userId;
  const isBooker = ed.event?.booker?.userId === userId;
  if (!isDj && !isBooker) return { error: { code: 403, message: 'Accès refusé.' } };
  return { ed, isDj, isBooker };
};

/**
 * Contrat DJ : ne peut être finalisé (SIGNED) que si le lieu choisi sur l’événement a accepté
 * l’invitation et que le contrat organisateur–lieu est finalisé (accepté par les deux parties ; priorité au volet lieu).
 */
async function getVenueContractGateForDjEvent(eventId, venueId) {
  if (!venueId) {
    return {
      hasVenueOnEvent: false,
      venueInvitationStatus: null,
      venueContractStatus: null,
      canFinalizeDjContract: true,
    };
  }
  const evRow = await prisma.eventVenue.findFirst({
    where: { eventId, venueId },
    select: { status: true, contractStatus: true },
  });
  if (!evRow) {
    return {
      hasVenueOnEvent: true,
      venueInvitationStatus: null,
      venueContractStatus: null,
      canFinalizeDjContract: false,
    };
  }
  const canFinalizeDjContract =
    evRow.status === 'ACCEPTED' && evRow.contractStatus === 'SIGNED';
  return {
    hasVenueOnEvent: true,
    venueInvitationStatus: evRow.status,
    venueContractStatus: evRow.contractStatus,
    canFinalizeDjContract,
  };
}

async function assertVenueContractBeforeDjSign(eventId, venueId) {
  const gate = await getVenueContractGateForDjEvent(eventId, venueId);
  if (gate.canFinalizeDjContract) return { ok: true };
  if (!venueId) return { ok: true };
  if (!gate.venueInvitationStatus) {
    return {
      ok: false,
      message:
        'Finalise d’abord le volet lieu sur cet événement (invitation + contrat lieu) avant d’accepter le contrat DJ.',
    };
  }
  if (gate.venueInvitationStatus !== 'ACCEPTED') {
    return {
      ok: false,
      message: 'Le lieu doit avoir accepté l’invitation avant de finaliser le contrat DJ.',
    };
  }
  return {
    ok: false,
    message: 'Le contrat avec le lieu doit être accepté par les deux parties avant le contrat DJ.',
  };
}

/** Crée un message de notification contrat dans le chat (pour l'autre partie) */
const createContractNotificationMessage = async (eventDjId, senderId, content) => {
  try {
    await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventDjId,
        senderId,
        content,
        read: false,
        deleted: false,
      },
    });
  } catch (err) {
    console.error('Erreur création message notification contrat:', err);
  }
};

/** Crée un message de notification contrat Organisateur ↔ Lieu */
const createContractNotificationMessageVenue = async (eventVenueId, senderId, content) => {
  try {
    await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventVenueId,
        senderId,
        content,
        read: false,
        deleted: false,
      },
    });
  } catch (err) {
    console.error('Erreur création message notification contrat venue:', err);
  }
};

const createContractNotificationMessagePrestataire = async (eventPrestataireId, senderId, content) => {
  try {
    await prisma.message.create({
      data: {
        type: 'PRIVATE',
        eventPrestataireId,
        senderId,
        content,
        read: false,
        deleted: false,
      },
    });
  } catch (err) {
    console.error('Erreur création message notification contrat prestataire:', err);
  }
};

// GET contrat
app.get('/api/contracts/event-djs/:eventDjId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });

    const sentBy = ed.contractSentBy ?? (ed.contractStatus === 'SENT' ? 'BOOKER' : null);

    const venueId = ed.event?.venueId ?? null;
    const venueContractGate = await getVenueContractGateForDjEvent(ed.eventId, venueId);

    return res.json({
      success: true,
      contract: {
        status: ed.contractStatus,
        version: ed.contractVersion,
        payload: ed.contractPayload,
        hash: ed.contractHash,
        sentAt: ed.contractSentAt,
        sentBy,
        bookerAcceptedAt: ed.bookerAcceptedAt,
        djAcceptedAt: ed.djAcceptedAt,
      },
      role: isBooker ? 'BOOKER' : 'DJ',
      venueContractGate,
      booking: {
        eventDjId: ed.id,
        eventId: ed.eventId,
        eventTitle: ed.event?.title,
        eventDate: ed.event?.date,
        eventTime: ed.event?.time,
        durationHours: ed.event?.durationHours ?? null,
        venueName: ed.event?.venue?.venueName ?? null,
        venueAddress: ed.event?.venue?.address ?? null,
      },
    });
  } catch (e) {
    console.error('Erreur get contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Prévisualisation PDF (base64) — même accès que GET contrat ; payload optionnel (brouillon / contre-proposition)
app.post('/api/contracts/event-djs/:eventDjId/preview-pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const rawPayload = req.body?.payload;
    let payloadForPdf = ed.contractPayload ?? {};
    if (rawPayload != null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      if (ed.contractStatus === 'DRAFT' && isBooker) {
        payloadForPdf = rawPayload;
      } else if (ed.contractStatus === 'SENT' && (isBooker || isDj)) {
        payloadForPdf = rawPayload;
      }
    }
    const { buildDjContractPreviewPdf } = require('../utils/contractPreview');
    const pdfBuffer = await buildDjContractPreviewPdf(prisma, ed, payloadForPdf);
    return res.json({
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (e) {
    console.error('Erreur preview PDF contrat DJ:', e?.message || e, e?.stack);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
});

// Booker: save draft (modifiable tant que pas SENT/SIGNED)
app.put('/api/contracts/event-djs/:eventDjId/draft', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { payload } = req.body ?? {};
    const { ed, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul le booker peut modifier le contrat.' });

    if (ed.contractStatus !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé. Crée un nouveau contrat.' });
    }

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        contractPayload: payload ?? {},
        contractHash: null,
        contractSentAt: null,
        contractSentBy: null,
        bookerAcceptedAt: null,
        djAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        version: next.contractVersion,
        payload: next.contractPayload,
      },
    });
  } catch (e) {
    console.error('Erreur save contract draft:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Booker: send contract (booker accepts)
app.post('/api/contracts/event-djs/:eventDjId/send', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul le booker peut envoyer le contrat.' });

    if (ed.contractStatus !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    }

    const payload = ed.contractPayload ?? {};
    const hash = hashContract(payload);

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        contractStatus: 'SENT',
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: 'BOOKER',
        bookerAcceptedAt: new Date(),
        djAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });

    // Notification au DJ : nouvelle offre de contrat
    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    await createContractNotificationMessage(
      eventDjId,
      userId,
      `📋 Nouvelle offre de contrat reçue${eventTitle}`
    );

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        hash: next.contractHash,
        sentAt: next.contractSentAt,
        sentBy: next.contractSentBy,
        bookerAcceptedAt: next.bookerAcceptedAt,
      },
    });
  } catch (e) {
    console.error('Erreur send contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Booker/DJ: counter-propose (modifie le payload et renvoie à l'autre partie)
app.post('/api/contracts/event-djs/:eventDjId/counter', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { payload } = req.body ?? {};
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });

    if (ed.contractStatus !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Aucune proposition à modifier.' });
    }

    const sender = eventDjResponderRole(ed);
    if (sender === 'BOOKER' && !isBooker) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (sender === 'DJ' && !isDj) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    const nextPayload = payload ?? {};
    const hash = hashContract(nextPayload);

    const next = await prisma.eventDj.update({
      where: { id: eventDjId },
      data: {
        contractStatus: 'SENT',
        contractPayload: nextPayload,
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: sender,
        bookerAcceptedAt: sender === 'BOOKER' ? new Date() : null,
        djAcceptedAt: sender === 'DJ' ? new Date() : null,
        contractVersion: { increment: 1 },
      },
    });

    // Notification à l'autre partie : contre-proposition reçue
    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    await createContractNotificationMessage(
      eventDjId,
      userId,
      `📋 Contre-proposition reçue${eventTitle}`
    );

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        version: next.contractVersion,
        payload: next.contractPayload,
        hash: next.contractHash,
        sentAt: next.contractSentAt,
        sentBy: next.contractSentBy,
        bookerAcceptedAt: next.bookerAcceptedAt,
        djAcceptedAt: next.djAcceptedAt,
      },
    });
  } catch (e) {
    console.error('Erreur counter contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// Booker/DJ: accept contract (récepteur accepte => SIGNED si les deux ont accepté)
app.post('/api/contracts/event-djs/:eventDjId/accept', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventDjId } = req.params;
    const { ed, isDj, isBooker, error } = await loadEventDjWithAccess(eventDjId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });

    if (ed.contractStatus !== 'SENT') {
      return res.status(400).json({ success: false, message: 'Aucun contrat à accepter.' });
    }

    const role = eventDjResponderRole(ed);
    if (role === 'BOOKER' && !isBooker) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (role === 'DJ' && !isDj) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }

    // Re-hash pour revalidation
    const payload = ed.contractPayload ?? {};
    const expectedHash = ed.contractHash ?? '';
    const actualHash = hashContract(payload);
    if (!expectedHash || expectedHash !== actualHash) {
      return res.status(400).json({ success: false, message: 'Contrat invalide (hash mismatch). Renvoie le contrat.' });
    }

    const now = new Date();
    const nextBookerAt = role === 'BOOKER' ? now : ed.bookerAcceptedAt;
    const nextDjAt = role === 'DJ' ? now : ed.djAcceptedAt;
    const willSign = !!nextBookerAt && !!nextDjAt;
    if (willSign) {
      const assert = await assertVenueContractBeforeDjSign(ed.eventId, ed.event?.venueId ?? null);
      if (!assert.ok) {
        return res.status(400).json({ success: false, message: assert.message });
      }
    }

    const data = {
      // Compat: si un ancien contrat SENT n'a pas sentBy, on le fixe à BOOKER
      contractSentBy: ed.contractSentBy ?? 'BOOKER',
      bookerAcceptedAt: role === 'BOOKER' ? now : ed.bookerAcceptedAt,
      djAcceptedAt: role === 'DJ' ? now : ed.djAcceptedAt,
    };

    const updated = await prisma.eventDj.update({
      where: { id: eventDjId },
      data,
    });

    const shouldSign = !!updated.bookerAcceptedAt && !!updated.djAcceptedAt;
    const next = shouldSign
      ? await prisma.eventDj.update({
          where: { id: eventDjId },
          data: {
            contractStatus: 'SIGNED',
            // Mettre paymentStatus à PENDING après validation du prix (contrat signé)
            ...(updated.paymentStatus !== 'PAID' && !updated.paidAt
              ? { paymentStatus: 'PENDING' }
              : {}),
          },
        })
      : updated;

    // Notification à l'autre partie : contrat accepté ou signé
    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    const notifContent = shouldSign
      ? `📋 Contrat signé !${eventTitle}`
      : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessage(eventDjId, userId, notifContent);

    // Envoi du contrat par email aux deux parties une fois signé
    if (shouldSign) {
      const { sendContractSignedEmailDj } = require('../utils/contractEmail');
      sendContractSignedEmailDj(eventDjId).catch((err) => console.error('[contract] Email:', err));
    }

    return res.json({
      success: true,
      contract: {
        status: next.contractStatus,
        version: next.contractVersion,
        hash: next.contractHash,
        sentAt: next.contractSentAt,
        sentBy: next.contractSentBy,
        bookerAcceptedAt: next.bookerAcceptedAt,
        djAcceptedAt: next.djAcceptedAt,
      },
    });
  } catch (e) {
    console.error('Erreur accept contract:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Contrats Organisateur ↔ Lieu (même logique que EventDj)
 */
const loadEventVenueWithAccess = async (eventVenueId, userId) => {
  const ev = await prisma.eventVenue.findUnique({
    where: { id: eventVenueId },
    include: { event: { include: { booker: true } }, venue: true },
  });
  if (!ev) return { error: { code: 404, message: 'EventVenue introuvable.' } };
  const isBooker = ev.event?.booker?.userId === userId;
  const isVenue = ev.venue?.userId === userId;
  if (!isBooker && !isVenue) return { error: { code: 403, message: 'Accès refusé.' } };
  return { ev, isBooker, isVenue };
};

const loadEventPrestataireWithAccess = async (eventPrestataireId, userId) => {
  const ep = await prisma.eventPrestataire.findUnique({
    where: { id: eventPrestataireId },
    include: { event: { include: { booker: true, venue: true } }, prestataire: true },
  });
  if (!ep) return { error: { code: 404, message: 'Lien prestataire introuvable.' } };
  const isBooker = ep.event?.booker?.userId === userId;
  const isPrestataire = ep.prestataire?.userId === userId;
  if (!isBooker && !isPrestataire) return { error: { code: 403, message: 'Accès refusé.' } };
  return { ep, isBooker, isPrestataire };
};

app.get('/api/contracts/event-venues/:eventVenueId', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { ev, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const sentBy = ev.contractSentBy ?? (ev.contractStatus === 'SENT' ? 'BOOKER' : null);
    return res.json({
      success: true,
      contract: {
        status: ev.contractStatus,
        version: ev.contractVersion,
        hash: ev.contractHash,
        sentAt: ev.contractSentAt,
        sentBy,
        bookerAcceptedAt: ev.bookerAcceptedAt,
        venueAcceptedAt: ev.venueAcceptedAt,
        payload: ev.contractPayload,
      },
      booking: {
        eventVenueId: ev.id,
        eventId: ev.eventId,
        eventTitle: ev.event?.title,
        eventDate: ev.event?.date,
        eventTime: ev.event?.time ?? null,
        durationHours: ev.event?.durationHours ?? null,
        venueName: ev.venue?.venueName,
      },
    });
  } catch (e) {
    console.error('Erreur get contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/preview-pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventVenueId } = req.params;
    const { isBooker, isVenue, error } = await loadEventVenueWithAccess(eventVenueId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const full = await prisma.eventVenue.findUnique({
      where: { id: eventVenueId },
      include: { event: { include: { booker: true, venue: true } }, venue: true },
    });
    if (!full) return res.status(404).json({ success: false, message: 'Introuvable.' });
    const rawPayload = req.body?.payload;
    let payloadForPdf = full.contractPayload ?? {};
    if (rawPayload != null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      if (full.contractStatus === 'DRAFT' && isBooker) {
        payloadForPdf = rawPayload;
      } else if (full.contractStatus === 'SENT' && (isBooker || isVenue)) {
        payloadForPdf = rawPayload;
      }
    }
    const { buildVenueContractPreviewPdf } = require('../utils/contractPreview');
    const pdfBuffer = await buildVenueContractPreviewPdf(prisma, full, payloadForPdf);
    return res.json({
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (e) {
    console.error('Erreur preview PDF contrat lieu:', e?.message || e, e?.stack);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
});

app.put('/api/contracts/event-venues/:eventVenueId/draft', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { payload } = req.body ?? {};
    const { ev, isBooker, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut modifier le brouillon.' });
    if (ev.contractStatus !== 'DRAFT') return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    const next = await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        contractPayload: payload ?? {},
        contractHash: null,
        contractSentAt: null,
        contractSentBy: null,
        bookerAcceptedAt: null,
        venueAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });
    return res.json({ success: true, contract: { status: next.contractStatus, version: next.contractVersion, payload: next.contractPayload } });
  } catch (e) {
    console.error('Erreur save contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/send', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { ev, isBooker, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut envoyer le contrat.' });
    if (ev.contractStatus !== 'DRAFT') return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    const payload = ev.contractPayload ?? {};
    const hash = hashContract(payload);
    await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        contractStatus: 'SENT',
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: 'BOOKER',
        bookerAcceptedAt: new Date(),
        venueAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, `📋 Nouvelle offre de contrat reçue${eventTitle}`);
    return res.json({ success: true, contract: { status: 'SENT' } });
  } catch (e) {
    console.error('Erreur send contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/counter', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { payload } = req.body ?? {};
    const { ev, isBooker, isVenue, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (ev.contractStatus !== 'SENT') return res.status(400).json({ success: false, message: 'Aucune proposition à modifier.' });
    const sender = venueContractResponderRole(ev);
    if (sender === 'BOOKER' && !isBooker) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (sender === 'VENUE' && !isVenue) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const nextPayload = payload ?? {};
    const hash = hashContract(nextPayload);
    await prisma.eventVenue.update({
      where: { id: eventVenueId },
      data: {
        contractStatus: 'SENT',
        contractPayload: nextPayload,
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: sender,
        bookerAcceptedAt: sender === 'BOOKER' ? new Date() : null,
        venueAcceptedAt: sender === 'VENUE' ? new Date() : null,
        contractVersion: { increment: 1 },
      },
    });
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, `📋 Contre-proposition reçue${eventTitle}`);
    return res.json({ success: true, contract: { status: 'SENT' } });
  } catch (e) {
    console.error('Erreur counter contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-venues/:eventVenueId/accept', authenticateToken, async (req, res) => {
  try {
    const { eventVenueId } = req.params;
    const { ev, isBooker, isVenue, error } = await loadEventVenueWithAccess(eventVenueId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (ev.contractStatus !== 'SENT') return res.status(400).json({ success: false, message: 'Aucun contrat à accepter.' });
    const role = venueContractResponderRole(ev);
    if (role === 'BOOKER' && !isBooker) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (role === 'VENUE' && !isVenue) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const payload = ev.contractPayload ?? {};
    const expectedHash = ev.contractHash ?? '';
    const actualHash = hashContract(payload);
    if (!expectedHash || expectedHash !== actualHash) return res.status(400).json({ success: false, message: 'Contrat invalide.' });
    const now = new Date();
    const data = {
      contractSentBy: ev.contractSentBy ?? 'BOOKER',
      bookerAcceptedAt: role === 'BOOKER' ? now : ev.bookerAcceptedAt,
      venueAcceptedAt: role === 'VENUE' ? now : ev.venueAcceptedAt,
    };
    const updated = await prisma.eventVenue.update({ where: { id: eventVenueId }, data });
    const shouldSign = !!updated.bookerAcceptedAt && !!updated.venueAcceptedAt;
    if (shouldSign) {
      await prisma.eventVenue.update({
        where: { id: eventVenueId },
        data: {
          contractStatus: 'SIGNED',
          ...(updated.paymentStatus !== 'PAID' && !updated.paidAt ? { paymentStatus: 'PENDING' } : {}),
        },
      });
    }
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    const notifContent = shouldSign ? `📋 Contrat signé !${eventTitle}` : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, notifContent);

    // Envoi du contrat par email aux deux parties une fois signé
    if (shouldSign) {
      const { sendContractSignedEmailVenue } = require('../utils/contractEmail');
      sendContractSignedEmailVenue(eventVenueId).catch((err) => console.error('[contract] Email:', err));
    }

    return res.json({ success: true, contract: { status: shouldSign ? 'SIGNED' : 'SENT' } });
  } catch (e) {
    console.error('Erreur accept contract venue:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Contrats Organisateur ↔ Prestataire (miroir EventVenue)
 */
app.get('/api/contracts/event-prestataires/:eventPrestataireId', authenticateToken, async (req, res) => {
  try {
    const { eventPrestataireId } = req.params;
    const { ep, error } = await loadEventPrestataireWithAccess(eventPrestataireId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const sentBy = ep.contractSentBy ?? (ep.contractStatus === 'SENT' ? 'BOOKER' : null);
    return res.json({
      success: true,
      contract: {
        status: ep.contractStatus,
        version: ep.contractVersion,
        hash: ep.contractHash,
        sentAt: ep.contractSentAt,
        sentBy,
        bookerAcceptedAt: ep.bookerAcceptedAt,
        prestataireAcceptedAt: ep.prestataireAcceptedAt,
        payload: ep.contractPayload,
      },
      booking: {
        eventPrestataireId: ep.id,
        eventId: ep.eventId,
        eventTitle: ep.event?.title,
        eventDate: ep.event?.date,
        eventTime: ep.event?.time ?? null,
        durationHours: ep.event?.durationHours ?? null,
        businessName: ep.prestataire?.businessName,
        prestationGenres: Array.isArray(ep.prestataire?.prestationGenres) ? ep.prestataire.prestationGenres : [],
      },
    });
  } catch (e) {
    console.error('Erreur get contract prestataire:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-prestataires/:eventPrestataireId/preview-pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventPrestataireId } = req.params;
    const { isBooker, isPrestataire, error } = await loadEventPrestataireWithAccess(eventPrestataireId, userId);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    const full = await prisma.eventPrestataire.findUnique({
      where: { id: eventPrestataireId },
      include: { event: { include: { booker: true, venue: true } }, prestataire: true },
    });
    if (!full) return res.status(404).json({ success: false, message: 'Introuvable.' });
    const rawPayload = req.body?.payload;
    let payloadForPdf = full.contractPayload ?? {};
    if (rawPayload != null && typeof rawPayload === 'object' && !Array.isArray(rawPayload)) {
      if (full.contractStatus === 'DRAFT' && isBooker) {
        payloadForPdf = rawPayload;
      } else if (full.contractStatus === 'SENT' && (isBooker || isPrestataire)) {
        payloadForPdf = rawPayload;
      }
    }
    const { buildPrestataireContractPreviewPdf } = require('../utils/contractPreview');
    const pdfBuffer = await buildPrestataireContractPreviewPdf(prisma, full, payloadForPdf);
    return res.json({
      success: true,
      pdfBase64: pdfBuffer.toString('base64'),
    });
  } catch (e) {
    console.error('Erreur preview PDF contrat prestataire:', e?.message || e, e?.stack);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
});

app.put('/api/contracts/event-prestataires/:eventPrestataireId/draft', authenticateToken, async (req, res) => {
  try {
    const { eventPrestataireId } = req.params;
    const { payload } = req.body ?? {};
    const { ep, isBooker, error } = await loadEventPrestataireWithAccess(eventPrestataireId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut modifier le brouillon.' });
    if (ep.contractStatus !== 'DRAFT') return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    const next = await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: {
        contractPayload: payload ?? {},
        contractHash: null,
        contractSentAt: null,
        contractSentBy: null,
        bookerAcceptedAt: null,
        prestataireAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });
    return res.json({ success: true, contract: { status: next.contractStatus, version: next.contractVersion, payload: next.contractPayload } });
  } catch (e) {
    console.error('Erreur save contract prestataire:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-prestataires/:eventPrestataireId/send', authenticateToken, async (req, res) => {
  try {
    const { eventPrestataireId } = req.params;
    const { ep, isBooker, error } = await loadEventPrestataireWithAccess(eventPrestataireId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (!isBooker) return res.status(403).json({ success: false, message: 'Seul l\'organisateur peut envoyer le contrat.' });
    if (ep.contractStatus !== 'DRAFT') return res.status(400).json({ success: false, message: 'Contrat déjà envoyé ou signé.' });
    const payload = ep.contractPayload ?? {};
    const hash = hashContract(payload);
    await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: {
        contractStatus: 'SENT',
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: 'BOOKER',
        bookerAcceptedAt: new Date(),
        prestataireAcceptedAt: null,
        contractVersion: { increment: 1 },
      },
    });
    const eventTitle = ep.event?.title ? ` (${ep.event.title})` : '';
    await createContractNotificationMessagePrestataire(eventPrestataireId, req.user.id, `📋 Nouvelle offre de contrat reçue${eventTitle}`);
    return res.json({ success: true, contract: { status: 'SENT' } });
  } catch (e) {
    console.error('Erreur send contract prestataire:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-prestataires/:eventPrestataireId/counter', authenticateToken, async (req, res) => {
  try {
    const { eventPrestataireId } = req.params;
    const { payload } = req.body ?? {};
    const { ep, isBooker, isPrestataire, error } = await loadEventPrestataireWithAccess(eventPrestataireId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (ep.contractStatus !== 'SENT') return res.status(400).json({ success: false, message: 'Aucune proposition à modifier.' });
    const sender = prestataireContractResponderRole(ep);
    if (sender === 'BOOKER' && !isBooker) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (sender === 'PRESTATAIRE' && !isPrestataire) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const nextPayload = payload ?? {};
    const hash = hashContract(nextPayload);
    await prisma.eventPrestataire.update({
      where: { id: eventPrestataireId },
      data: {
        contractStatus: 'SENT',
        contractPayload: nextPayload,
        contractHash: hash,
        contractSentAt: new Date(),
        contractSentBy: sender,
        bookerAcceptedAt: sender === 'BOOKER' ? new Date() : null,
        prestataireAcceptedAt: sender === 'PRESTATAIRE' ? new Date() : null,
        contractVersion: { increment: 1 },
      },
    });
    const eventTitle = ep.event?.title ? ` (${ep.event.title})` : '';
    await createContractNotificationMessagePrestataire(eventPrestataireId, req.user.id, `📋 Contre-proposition reçue${eventTitle}`);
    return res.json({ success: true, contract: { status: 'SENT' } });
  } catch (e) {
    console.error('Erreur counter contract prestataire:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

app.post('/api/contracts/event-prestataires/:eventPrestataireId/accept', authenticateToken, async (req, res) => {
  try {
    const { eventPrestataireId } = req.params;
    const { ep, isBooker, isPrestataire, error } = await loadEventPrestataireWithAccess(eventPrestataireId, req.user.id);
    if (error) return res.status(error.code).json({ success: false, message: error.message });
    if (ep.contractStatus !== 'SENT') return res.status(400).json({ success: false, message: 'Aucun contrat à accepter.' });
    const role = prestataireContractResponderRole(ep);
    if (role === 'BOOKER' && !isBooker) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    if (role === 'PRESTATAIRE' && !isPrestataire) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const payload = ep.contractPayload ?? {};
    const expectedHash = ep.contractHash ?? '';
    const actualHash = hashContract(payload);
    if (!expectedHash || expectedHash !== actualHash) return res.status(400).json({ success: false, message: 'Contrat invalide.' });
    const now = new Date();
    const data = {
      contractSentBy: ep.contractSentBy ?? 'BOOKER',
      bookerAcceptedAt: role === 'BOOKER' ? now : ep.bookerAcceptedAt,
      prestataireAcceptedAt: role === 'PRESTATAIRE' ? now : ep.prestataireAcceptedAt,
    };
    const updated = await prisma.eventPrestataire.update({ where: { id: eventPrestataireId }, data });
    const shouldSign = !!updated.bookerAcceptedAt && !!updated.prestataireAcceptedAt;
    if (shouldSign) {
      await prisma.eventPrestataire.update({
        where: { id: eventPrestataireId },
        data: {
          contractStatus: 'SIGNED',
          ...(updated.paymentStatus !== 'PAID' && !updated.paidAt ? { paymentStatus: 'PENDING' } : {}),
        },
      });
    }
    const eventTitle = ep.event?.title ? ` (${ep.event.title})` : '';
    const notifContent = shouldSign ? `📋 Contrat signé !${eventTitle}` : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessagePrestataire(eventPrestataireId, req.user.id, notifContent);

    if (shouldSign) {
      const { sendContractSignedEmailPrestataire } = require('../utils/contractEmail');
      sendContractSignedEmailPrestataire(eventPrestataireId).catch((err) => console.error('[contract] Email:', err));
    }

    return res.json({ success: true, contract: { status: shouldSign ? 'SIGNED' : 'SENT' } });
  } catch (e) {
    console.error('Erreur accept contract prestataire:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Supprimer un événement (Booker)
 * @route DELETE /api/booker/events/:eventId
 */
app.delete('/api/booker/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Vérifier que l'événement existe et appartient au booker
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        booker: true,
      },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé.',
      });
    }

    if (event.bookerId !== booker.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres événements.',
      });
    }

    // Vérifier s'il y a des tickets vendus (désactivable en dev/staging : BOOKER_ALLOW_DELETE_WITH_TICKETS=true)
    const allowDeleteWithTickets = (process.env.BOOKER_ALLOW_DELETE_WITH_TICKETS || '').toLowerCase() === 'true';
    const ticketsCount = await prisma.ticket.count({
      where: { eventId: eventId },
    });

    if (ticketsCount > 0 && !allowDeleteWithTickets) {
      return res.status(400).json({
        success: false,
        message: `Impossible de supprimer l'événement : ${ticketsCount} ticket(s) déjà vendu(s).`,
      });
    }

    // Notes liées à l'événement (pas en cascade automatique sur Event)
    await prisma.djRating.deleteMany({ where: { eventId } });
    await prisma.venueRating.deleteMany({ where: { eventId } });

    // Supprimer les EventDj associés (cascade)
    await prisma.eventDj.deleteMany({
      where: { eventId: eventId },
    });

    // Supprimer l'événement
    await prisma.event.delete({
      where: { id: eventId },
    });

    res.json({
      success: true,
      message: 'Événement supprimé avec succès.',
    });
  } catch (error) {
    console.error('Erreur suppression événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Modifier un événement (Booker) - champs limités
 * @route PUT /api/booker/events/:eventId
 * body (tous optionnels): { title?, description?, image?, genre?, location?, time? }
 */
app.put('/api/booker/events/:eventId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { title, description, image, genre, location, time, durationHours } = req.body ?? {};

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    // Vérifier que l'événement existe et appartient au booker
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }
    if (event.bookerId !== booker.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
    }

    const data = {};
    if (typeof title === 'string') data.title = title.trim();
    if (typeof description === 'string') data.description = description.trim() || null;
    if (typeof image === 'string') data.image = image.trim() || null;
    if (typeof genre === 'string') data.genre = genre.trim() || event.genre;
    if (typeof location === 'string') data.location = location.trim() || event.location;
    if (typeof time === 'string') data.time = time.trim() || event.time;
    if (durationHours !== undefined) {
      if (durationHours === null || durationHours === '') {
        data.durationHours = null;
      } else {
        const n = parseFloat(String(durationHours).replace(',', '.'));
        if (Number.isFinite(n) && n > 0) data.durationHours = n;
      }
    }

    if ('equipmentRental' in (req.body ?? {})) {
      data.equipmentRental =
        req.body.equipmentRental === null
          ? null
          : normalizeEquipmentRentalForStorage(req.body.equipmentRental);
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun champ à modifier.' });
    }

    // Empêcher les changements "critiques" via cet endpoint
    delete data.price;
    delete data.capacity;
    delete data.sold;
    delete data.status;
    delete data.date;
    delete data.venueId;
    delete data.bookerId;

    const updated = await prisma.event.update({
      where: { id: eventId },
      data,
    });

    return res.json({ success: true, message: 'Événement modifié.', event: updated });
  } catch (error) {
    console.error('Erreur modification événement:', error);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Uploader une image pour un événement (Booker)
 * @route POST /api/booker/events/:eventId/upload-image
 * form-data: image=<file>
 */
app.post(
  '/api/booker/events/:eventId/upload-image',
  authenticateToken,
  (req, res, next) =>
    (MEDIA_STORAGE === 'r2' ? uploadMemory.single('image') : uploadLocal.single('image'))(req, res, next),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { eventId } = req.params;

      const booker = await prisma.userBooker.findFirst({ where: { userId } });
      if (!booker) {
        return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
      }

      const event = await prisma.event.findUnique({ where: { id: eventId } });
      if (!event) {
        return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
      }
      if (event.bookerId !== booker.id) {
        return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Aucune image fournie.' });
      }

      if (!req.file.mimetype.startsWith('image/')) {
        if (MEDIA_STORAGE === 'local' && req.file.filename) {
          const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }
        return res.status(400).json({ success: false, message: 'Le fichier doit être une image.' });
      }

      let imageUrl = null;
      if (MEDIA_STORAGE === 'r2') {
        const key = makeObjectKey('events', req.file.originalname);
        const uploaded = await uploadToR2({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
        imageUrl = uploaded.url;
      } else {
        // ✅ CORRECTION: Utiliser PUBLIC_URL en priorité pour éviter les URLs temporaires
        const publicUrl = process.env.PUBLIC_URL;
        const origin = req.get('origin') || req.get('referer');
        const baseUrl = publicUrl
          ? publicUrl.replace(/\/$/, '')
          : (origin ? origin.replace(/\/$/, '') : `${req.protocol}://${req.get('host')}`);
        imageUrl = `${baseUrl}/uploads/media/${req.file.filename}`;
      }

      await prisma.event.update({
        where: { id: eventId },
        data: { image: imageUrl },
      });

      return res.json({ success: true, imageUrl });
    } catch (error) {
      console.error('Erreur upload image event:', error);
      if (MEDIA_STORAGE === 'local' && req.file && req.file.filename) {
        const filePath = path.join(SERVER_ROOT, 'uploads', 'media', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
  }
);

/**
 * Crée un nouvel événement pour un booker
 * @route POST /api/booker/events
 */
app.post('/api/booker/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      date,
      time,
      venueId,
      djIds,
      djSlotAssignments,
      price,
      capacity,
      genre,
      description,
      image,
      durationHours,
      equipmentRental,
      ticketTiers: ticketTiersBody,
    } = req.body;

    // Validation des champs requis
    if (!title || !date || !time || !venueId || !djIds || !Array.isArray(djIds) || djIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Les champs title, date, time, venueId et djIds (tableau non vide) sont requis.',
      });
    }

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Vérifier que le lieu existe et récupérer sa note moyenne
    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
      select: {
        id: true,
        venueName: true,
        address: true,
        averageRatingGlobal: true,
        maxCapacity: true,
      },
    });

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Lieu non trouvé.',
      });
    }

    // Vérifier que les DJs existent et sont disponibles
    const djs = await prisma.userDj.findMany({
      where: {
        userId: { in: djIds },
        availableStatus: true,
      },
      select: {
        userId: true,
        artistName: true,
      },
    });

    if (djs.length !== djIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Un ou plusieurs DJs ne sont pas disponibles ou n\'existent pas.',
      });
    }

    const durationParsed =
      durationHours != null && durationHours !== ''
        ? parseFloat(String(durationHours).replace(',', '.'))
        : null;
    const durationForSlots =
      Number.isFinite(durationParsed) && durationParsed > 0 ? durationParsed : null;

    if (djSlotAssignments != null) {
      if (!Array.isArray(djSlotAssignments)) {
        return res.status(400).json({
          success: false,
          message: 'djSlotAssignments doit être un tableau.',
        });
      }
      if (djSlotAssignments.length > djIds.length) {
        return res.status(400).json({
          success: false,
          message: 'djSlotAssignments ne peut pas dépasser le nombre de DJs.',
        });
      }
      for (let i = 0; i < djSlotAssignments.length; i++) {
        const a = djSlotAssignments[i];
        if (a == null || typeof a !== 'object') continue;
        const ss = a.slotStart != null ? String(a.slotStart).trim() : '';
        const se = a.slotEnd != null ? String(a.slotEnd).trim() : '';
        if (!ss && !se) continue;
        if (!ss || !se) {
          return res.status(400).json({
            success: false,
            message: 'Chaque créneau DJ doit avoir slotStart et slotEnd (format HH:mm).',
          });
        }
        if (durationForSlots != null) {
          const fit = djSlotFitsEventWindow(ss, se, String(time).trim(), durationForSlots);
          if (!fit.ok) {
            return res.status(400).json({ success: false, message: fit.message });
          }
        }
      }
    }

    // ✅ Le prix DJ n'est plus auto-calculé: il sera défini via contrat Booker ↔ DJ.
    const calculatedPrice = price ? parseFloat(price) : 0;

    let ticketTiersStored = null;
    let priceForEvent = calculatedPrice;
    if (ticketTiersBody != null && ticketTiersBody !== '') {
      try {
        ticketTiersStored = normalizeTicketTiersInput(ticketTiersBody);
        const minP = minTierPriceEUR(ticketTiersStored);
        if (minP != null) priceForEvent = minP;
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: e?.message || 'ticketTiers invalide.',
        });
      }
    }

    // Vérifier les conflits de date/lieu
    // Convertir la date en DateTime
    const eventDate = new Date(date);
    if (isNaN(eventDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Date invalide.',
      });
    }

    // Vérifier que la date n'est pas dans le passé (on compare uniquement la date, pas l'heure)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (eventDay < today) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de créer un événement à une date passée.',
      });
    }

    // Délai minimal avant la date de l'événement (défaut 7 jours). EVENT_MIN_LEAD_DAYS=0 pour désactiver (tests, démos).
    let minLeadDays = 7;
    const envLead = process.env.EVENT_MIN_LEAD_DAYS;
    if (envLead === '0') {
      minLeadDays = 0;
    } else if (envLead != null && String(envLead).trim() !== '') {
      const n = parseInt(String(envLead), 10);
      if (Number.isFinite(n) && n >= 0) minLeadDays = n;
    }
    if (minLeadDays > 0) {
      const minEventDay = new Date(today);
      minEventDay.setDate(minEventDay.getDate() + minLeadDays);
      if (eventDay < minEventDay) {
        return res.status(400).json({
          success: false,
          message: `La date de l'événement doit être au moins ${minLeadDays} jour(s) après aujourd'hui.`,
          code: 'EVENT_DATE_TOO_SOON',
        });
      }
    }

    // Créer les dates de début et fin de journée sans modifier l'objet original
    const startOfDay = new Date(eventDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(eventDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Vérifier s'il y a déjà un événement à ce lieu à cette date
    const conflictingEvent = await prisma.event.findFirst({
      where: {
        venueId: venueId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['UPCOMING', 'ONGOING'],
        },
        // Exclure l'événement actuel si on est en mode édition (pas le cas ici, mais pour sécurité)
        id: {
          not: undefined, // Pas de filtre, on cherche tous les événements
        },
      },
    });

    if (conflictingEvent) {
      return res.status(409).json({
        success: false,
        message: 'Un événement existe déjà à ce lieu à cette date.',
        conflictingEvent: {
          id: conflictingEvent.id,
          title: conflictingEvent.title,
          date: conflictingEvent.date,
        },
      });
    }

    // Vérifier que les DJs ne sont pas déjà bookés à cette date (seulement les invitations ACCEPTED)
    const conflictingDjEvents = await prisma.eventDj.findMany({
      where: {
        djId: { in: djIds },
        status: 'ACCEPTED', // Seulement les invitations acceptées comptent comme des réservations
        event: {
          date: {
            gte: startOfDay,
            lte: endOfDay,
          },
          status: {
            in: ['UPCOMING', 'ONGOING'],
          },
        },
      },
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

    if (conflictingDjEvents.length > 0) {
      // Trouver tous les DJs en conflit
      const conflictingDjs = conflictingDjEvents.map(ed => {
        const dj = djs.find(d => d.userId === ed.djId);
        return dj?.artistName || 'DJ inconnu';
      });

      const conflictingDj = conflictingDjEvents[0];
      const dj = djs.find(d => d.userId === conflictingDj.djId);
      
      return res.status(409).json({
        success: false,
        message: conflictingDjs.length === 1
          ? `Le DJ ${dj?.artistName || 'sélectionné'} est déjà booké à cette date.`
          : `Les DJs ${conflictingDjs.join(', ')} sont déjà bookés à cette date.`,
        conflictingEvent: {
          id: conflictingDj.event.id,
          title: conflictingDj.event.title,
          date: conflictingDj.event.date,
          time: conflictingDj.event.time,
        },
        conflictingDjs: conflictingDjs,
      });
    }

    const equipmentRentalStored = normalizeEquipmentRentalForStorage(equipmentRental);

    const eventCapacityParsed =
      capacity != null && String(capacity).trim() !== ''
        ? parseInt(String(capacity).replace(/\s/g, ''), 10)
        : 100;
    const eventCapacityFinal =
      Number.isFinite(eventCapacityParsed) && eventCapacityParsed > 0 ? eventCapacityParsed : 100;

    if (venue.maxCapacity != null && eventCapacityFinal > venue.maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `La capacité de l'événement (${eventCapacityFinal}) dépasse le maximum déclaré pour ce lieu (${venue.maxCapacity}).`,
        code: 'EVENT_CAPACITY_EXCEEDS_VENUE',
      });
    }

    // Créer l'événement
    const event = await prisma.event.create({
      data: {
        title: title.trim(),
        date: eventDate,
        time: time.trim(),
          durationHours:
          durationHours != null && durationHours !== ''
            ? (() => {
                const n = parseFloat(String(durationHours).replace(',', '.'));
                return Number.isFinite(n) && n > 0 ? n : null;
              })()
            : null,
        location: venue.address,
        price: priceForEvent,
        capacity: eventCapacityFinal,
        genre: genre ? genre.trim() : 'Mixed',
        description: description ? description.trim() : null,
        image: image || null,
        ...(ticketTiersStored ? { ticketTiers: ticketTiersStored } : {}),
        ...(equipmentRentalStored ? { equipmentRental: equipmentRentalStored } : {}),
        venueId: venueId,
        bookerId: booker.id,
        status: 'UPCOMING',
        eventDjs: {
          create: djIds.map((djId, idx) => {
            const a = Array.isArray(djSlotAssignments) ? djSlotAssignments[idx] : null;
            const ss = a?.slotStart != null ? String(a.slotStart).trim() : '';
            const se = a?.slotEnd != null ? String(a.slotEnd).trim() : '';
            const hasSlot = ss && se;
            return {
              djId,
              status: 'PENDING', // Les invitations commencent en PENDING
              slotStart: hasSlot ? ss : null,
              slotEnd: hasSlot ? se : null,
            };
          }),
        },
        eventVenues: {
          create: {
            venueId: venueId,
            status: 'PENDING', // Invitation lieu en attente
          },
        },
      },
      include: {
        venue: {
          select: {
            id: true,
            venueName: true,
            address: true,
          },
        },
        eventDjs: {
          include: {},
        },
        eventVenues: {
          include: {},
        },
      },
    });

    // Créer automatiquement un message de bienvenue dans le chat de groupe
    try {
      await prisma.message.create({
        data: {
          type: 'GROUP',
          eventId: event.id,
          eventDjId: null, // Explicitement null pour les messages de groupe
          senderId: userId,
          content: `🎉 Événement "${event.title}" créé ! Bienvenue dans le chat de groupe. Vous pouvez discuter ici avec tous les participants.`,
          read: false,
          deleted: false,
        },
      });
    } catch (groupChatError) {
      console.error('Erreur création message chat de groupe:', groupChatError);
      // Ne pas bloquer la création de l'événement si le chat échoue
    }

    // Créer automatiquement un message de bienvenue dans chaque chat privé (DJ)
    for (const eventDj of event.eventDjs) {
      try {
        await prisma.message.create({
          data: {
            type: 'PRIVATE',
            eventDjId: eventDj.id,
            senderId: userId,
            content: `👋 Bonjour ! Vous avez été invité à l'événement "${event.title}". N'hésitez pas à me contacter si vous avez des questions.`,
            read: false,
            deleted: false,
          },
        });
      } catch (privateChatError) {
        console.error(`Erreur création message chat privé pour EventDj ${eventDj.id}:`, privateChatError);
      }
    }

    // Créer message de bienvenue dans le chat privé Organisateur ↔ Lieu
    const eventVenues = event.eventVenues || [];
    for (const ev of eventVenues) {
      try {
        await prisma.message.create({
          data: {
            type: 'PRIVATE',
            eventVenueId: ev.id,
            senderId: userId,
            content: `👋 Bonjour ! Votre lieu a été sélectionné pour l'événement "${event.title}". N'hésitez pas à me contacter pour discuter des modalités.`,
            read: false,
            deleted: false,
          },
        });
      } catch (e) {
        console.error(`Erreur création message chat EventVenue ${ev.id}:`, e);
      }
    }

    // Récupérer les infos des DJs pour la réponse
    const eventDjsInfo = await prisma.userDj.findMany({
      where: {
        userId: { in: djIds },
      },
      select: {
        userId: true,
        artistName: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Événement créé avec succès.',
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        location: event.location,
        price: event.price, // Le prix calculé est déjà dans event.price
        capacity: event.capacity,
        genre: event.genre,
        description: event.description,
        image: event.image,
        status: event.status,
        venue: {
          id: event.venue.id,
          name: event.venue.venueName,
          address: event.venue.address,
        },
        djs: eventDjsInfo.map((dj) => ({
          userId: dj.userId,
          artistName: dj.artistName,
        })),
      },
    });
  } catch (error) {
    console.error('Erreur création événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'événement.',
    });
  }
});

/**
 * Ajouter un DJ à un événement existant (Booker)
 * @route POST /api/booker/events/:eventId/djs
 */
app.post('/api/booker/events/:eventId/djs', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { djId } = req.body;

    if (!djId) {
      return res.status(400).json({
        success: false,
        message: 'Le champ djId est requis.',
      });
    }

    // Vérifier que le booker existe
    const booker = await prisma.userBooker.findFirst({
      where: { userId },
    });

    if (!booker) {
      return res.status(404).json({
        success: false,
        message: 'Profil Booker non trouvé.',
      });
    }

    // Vérifier que l'événement existe et appartient au booker
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé.',
      });
    }

    if (event.bookerId !== booker.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez modifier que vos propres événements.',
      });
    }

    // Vérifier que le DJ existe
    const dj = await prisma.userDj.findFirst({
      where: { userId: djId },
    });

    if (!dj) {
      return res.status(404).json({
        success: false,
        message: 'DJ non trouvé.',
      });
    }

    // Vérifier que ce DJ n'est pas déjà associé à cet événement
    const existingEventDj = await prisma.eventDj.findUnique({
      where: {
        eventId_djId: {
          eventId,
          djId,
        },
      },
    });

    if (existingEventDj) {
      return res.status(400).json({
        success: false,
        message: 'Ce DJ est déjà associé à cet événement.',
      });
    }

    // Créer l'association EventDj avec statut en attente par défaut
    const newEventDj = await prisma.eventDj.create({
      data: {
        eventId,
        djId,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'DJ ajouté à l\'événement avec succès.',
      eventDj: newEventDj,
    });
  } catch (error) {
    console.error('Erreur ajout DJ à un événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Ajouter un lieu à un événement existant (remplacement après annulation)
 * @route POST /api/booker/events/:eventId/venues
 */
app.post('/api/booker/events/:eventId/venues', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { venueId } = req.body;

    if (!venueId) {
      return res.status(400).json({ success: false, message: 'Le champ venueId est requis.' });
    }

    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }
    if (event.bookerId !== booker.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
    }

    const venue = await prisma.userVenue.findUnique({
      where: { id: venueId },
    });
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Lieu non trouvé.' });
    }

    const existingEventVenue = await prisma.eventVenue.findUnique({
      where: { eventId_venueId: { eventId, venueId } },
    });
    let newEventVenue;
    if (existingEventVenue) {
      if (existingEventVenue.status !== 'CANCELLED' && existingEventVenue.status !== 'REJECTED') {
        return res.status(400).json({
          success: false,
          message: 'Ce lieu est déjà associé à cet événement.',
        });
      }
      newEventVenue = await prisma.eventVenue.update({
        where: { id: existingEventVenue.id },
        data: { status: 'PENDING', rejectionReason: null },
      });
    } else {
      newEventVenue = await prisma.eventVenue.create({
        data: { eventId, venueId, status: 'PENDING' },
      });
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { venueId },
    });

    res.status(201).json({
      success: true,
      message: 'Lieu ajouté à l\'événement avec succès.',
      eventVenue: newEventVenue,
    });
  } catch (error) {
    console.error('Erreur ajout lieu à un événement:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Ajouter un prestataire optionnel à un événement (UserPrestataire.id)
 * @route POST /api/booker/events/:eventId/prestataires
 */
app.post('/api/booker/events/:eventId/prestataires', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.params;
    const { prestataireId } = req.body;

    if (!prestataireId) {
      return res.status(400).json({ success: false, message: 'Le champ prestataireId est requis.' });
    }

    const booker = await prisma.userBooker.findFirst({ where: { userId } });
    if (!booker) {
      return res.status(404).json({ success: false, message: 'Profil Booker non trouvé.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé.' });
    }
    if (event.bookerId !== booker.id) {
      return res.status(403).json({ success: false, message: 'Vous ne pouvez modifier que vos propres événements.' });
    }

    const prestataire = await prisma.userPrestataire.findUnique({ where: { id: prestataireId } });
    if (!prestataire) {
      return res.status(404).json({ success: false, message: 'Prestataire non trouvé.' });
    }
    if (!prestataire.availableStatus) {
      return res.status(400).json({
        success: false,
        message: 'Ce prestataire est marqué comme indisponible.',
      });
    }

    const otherActive = await prisma.eventPrestataire.findFirst({
      where: {
        eventId,
        prestataireId: { not: prestataireId },
        status: { in: ['PENDING', 'ACCEPTED'] },
      },
    });
    if (otherActive) {
      return res.status(400).json({
        success: false,
        message: 'Un autre prestataire est déjà invité sur cet événement. Finalisez ou annulez d’abord cette invitation.',
      });
    }

    const existing = await prisma.eventPrestataire.findUnique({
      where: { eventId_prestataireId: { eventId, prestataireId } },
    });
    let row;
    if (existing) {
      if (existing.status !== 'CANCELLED' && existing.status !== 'REJECTED') {
        return res.status(400).json({
          success: false,
          message: 'Ce prestataire est déjà associé à cet événement.',
        });
      }
      row = await prisma.eventPrestataire.update({
        where: { id: existing.id },
        data: { status: 'PENDING', rejectionReason: null },
      });
    } else {
      row = await prisma.eventPrestataire.create({
        data: { eventId, prestataireId, status: 'PENDING' },
      });
    }

    try {
      await prisma.message.create({
        data: {
          type: 'PRIVATE',
          eventPrestataireId: row.id,
          senderId: userId,
          content: `👋 Bonjour ! Vous avez été invité en tant que prestataire pour l'événement "${event.title}".`,
          read: false,
          deleted: false,
        },
      });
    } catch (e) {
      console.error('Erreur message bienvenue EventPrestataire:', e);
    }

    res.status(201).json({
      success: true,
      message: 'Prestataire ajouté à l\'événement.',
      eventPrestataire: row,
    });
  } catch (error) {
    console.error('Erreur ajout prestataire:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Récupère le classement des DJs basé sur leurs notes moyennes
 * @route GET /api/djs/ranking
 */
};
