/**
 * Booker : DJs/prestataires disponibles, inventaire location, lieux, liste événements.
 */
const prisma = require('../../lib/prisma');
const {
  presetsForApi,
  normalizeBookerRentalInventory,
} = require('../../utils/rentalEquipment');

module.exports = function registerBookerResourceRoutes(app, deps) {
  const { authenticateToken } = deps;

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
      userId: venue.userId,
      venueName: venue.venueName,
      address: venue.address,
      city: venue.city,
      profileImage: venue.profileImage,
      bannerImage: venue.bannerImage,
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

/** Lieux publics (accueil communauté, discover) */
app.get('/api/venues/public', async (req, res) => {
  try {
    const baseUrl = (() => {
      const publicUrl = process.env.PUBLIC_URL;
      if (publicUrl) return publicUrl.replace(/\/$/, '');
      const host = req.get('host');
      const forwardedProto = req.get('x-forwarded-proto');
      const proto = forwardedProto || (host && host.includes('trycloudflare.com') ? 'https' : req.protocol);
      return `${proto}://${host}`.replace(/\/$/, '');
    })();
    const normalize = (url) => {
      if (!url) return null;
      if (url.startsWith('/uploads/')) return `${baseUrl}${url}`;
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      return url;
    };

    const venues = await prisma.userVenue.findMany({
      orderBy: { averageRatingGlobal: 'desc' },
      take: parseInt(req.query.limit, 10) || 50,
      include: {
        _count: { select: { feedPosts: true, followers: true } },
      },
    });

    res.json({
      success: true,
      venues: venues.map((v) => ({
        id: v.id,
        userId: v.userId,
        venueName: v.venueName,
        address: v.address,
        city: v.city,
        profileImage: normalize(v.profileImage),
        bannerImage: normalize(v.bannerImage),
        averageRatingGlobal: v.averageRatingGlobal,
        maxCapacity: v.maxCapacity ?? null,
        postsCount: v._count.feedPosts,
        followersCount: v._count.followers,
      })),
    });
  } catch (error) {
    console.error('Erreur lieux publics:', error);
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
            if (ed?.contractStatus === 'PENDING_PAYMENT' || ed?.contractStatus === 'PENDING_SIGNATURE') {
              return 'PENDING';
            }
            if (ed?.contractStatus === 'SIGNED') return 'PAID';
            if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
            return 'UPCOMING';
          };
          paymentInfoMap[ed.djId] = {
            paymentStatus: resolvePaymentStatus(),
            contractStatus: ed.contractStatus ?? null,
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
          if (ev?.contractStatus === 'PENDING_PAYMENT' || ev?.contractStatus === 'PENDING_SIGNATURE') {
            return 'PENDING';
          }
          if (ev?.contractStatus === 'SIGNED') return 'PAID';
          if (event.status === 'FINISHED' || event.status === 'ONGOING') return 'PENDING';
          return 'UPCOMING';
        };
        const resolvePrestatairePaymentStatus = (ep) => {
          if (!ep) return 'UPCOMING';
          if (ep?.paymentStatus === 'PAID' || ep?.paidAt) return 'PAID';
          if (ep?.contractStatus === 'PENDING_PAYMENT' || ep?.contractStatus === 'PENDING_SIGNATURE') {
            return 'PENDING';
          }
          if (ep?.contractStatus === 'SIGNED') return 'PAID';
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
};
