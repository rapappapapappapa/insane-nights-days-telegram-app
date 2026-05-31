/**
 * Booker : CRUD événements, invitations DJ/lieu/prestataire.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');
const { normalizeEquipmentRentalForStorage } = require('../../utils/rentalEquipment');
const { normalizeTicketTiersInput, minTierPriceEUR } = require('../../utils/ticketTiers');

module.exports = function registerBookerEventCrudRoutes(app, deps) {
  const {
    authenticateToken,
    djSlotFitsEventWindow,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

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
};
