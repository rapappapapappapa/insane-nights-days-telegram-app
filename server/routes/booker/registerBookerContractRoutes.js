/**
 * Contrats booking Organisateur ↔ DJ / Lieu / Prestataire.
 */
const prisma = require('../../lib/prisma');
const {
  hashContract,
  venueContractResponderRole,
  prestataireContractResponderRole,
  eventDjResponderRole,
  loadEventDjWithAccess,
  getVenueContractGateForDjEvent,
  assertVenueContractBeforeDjSign,
  createContractNotificationMessage,
  createContractNotificationMessageVenue,
  createContractNotificationMessagePrestataire,
} = require('../../utils/contractHelpers');

module.exports = function registerBookerContractRoutes(app, deps) {
  const { authenticateToken } = deps;

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
        paymentStatus: ed.paymentStatus,
        paymentAmount: ed.paymentAmount,
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
    const { buildDjContractPreviewPdf } = require('../../utils/contractPreview');
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

    let next = updated;
    let pendingPayment = false;
    if (shouldSign) {
      const { afterBothPartiesAccepted } = require('../../utils/contractSignature');
      try {
        const result = await afterBothPartiesAccepted('dj', eventDjId);
        next = result.row;
        pendingPayment = result.pendingPayment;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Impossible de finaliser l\'acceptation du contrat.',
        });
      }
    }

    const eventTitle = ed.event?.title ? ` (${ed.event.title})` : '';
    const notifContent = pendingPayment
      ? `💳 Contrat accepté — en attente du paiement de l'organisateur${eventTitle}`
      : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessage(eventDjId, userId, notifContent);

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
        paymentStatus: ev.paymentStatus,
        paymentAmount: ev.paymentAmount,
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
    const { buildVenueContractPreviewPdf } = require('../../utils/contractPreview');
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
    let pendingPayment = false;
    if (shouldSign) {
      const { afterBothPartiesAccepted } = require('../../utils/contractSignature');
      try {
        await afterBothPartiesAccepted('venue', eventVenueId);
        pendingPayment = true;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Impossible de finaliser l\'acceptation du contrat.',
        });
      }
    }
    const eventTitle = ev.event?.title ? ` (${ev.event.title})` : '';
    const notifContent = pendingPayment
      ? `💳 Contrat accepté — en attente du paiement de l'organisateur${eventTitle}`
      : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessageVenue(eventVenueId, req.user.id, notifContent);

    return res.json({
      success: true,
      contract: { status: pendingPayment ? 'PENDING_PAYMENT' : 'SENT' },
    });
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
        paymentStatus: ep.paymentStatus,
        paymentAmount: ep.paymentAmount,
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
    const { buildPrestataireContractPreviewPdf } = require('../../utils/contractPreview');
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
    let pendingPayment = false;
    if (shouldSign) {
      const { afterBothPartiesAccepted } = require('../../utils/contractSignature');
      try {
        await afterBothPartiesAccepted('prestataire', eventPrestataireId);
        pendingPayment = true;
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Impossible de finaliser l\'acceptation du contrat.',
        });
      }
    }
    const eventTitle = ep.event?.title ? ` (${ep.event.title})` : '';
    const notifContent = pendingPayment
      ? `💳 Contrat accepté — en attente du paiement de l'organisateur${eventTitle}`
      : `📋 Contrat accepté${eventTitle}`;
    await createContractNotificationMessagePrestataire(eventPrestataireId, req.user.id, notifContent);

    return res.json({
      success: true,
      contract: { status: pendingPayment ? 'PENDING_PAYMENT' : 'SENT' },
    });
  } catch (e) {
    console.error('Erreur accept contract prestataire:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

const retrySignatureHandler = (kind, loadAccess) => async (req, res) => {
  try {
    const userId = req.user.id;
    const bookingId = req.params.eventDjId || req.params.eventVenueId || req.params.eventPrestataireId;
    const access = await loadAccess(bookingId, userId);
    if (access.error) return res.status(access.error.code).json({ success: false, message: access.error.message });
    if (!access.isBooker) return res.status(403).json({ success: false, message: 'Accès refusé.' });
    const { retryContractSignatureAfterPayment } = require('../../utils/contractSignature');
    const result = await retryContractSignatureAfterPayment(kind, bookingId, userId);
    if (!result.ok) {
      return res.status(400).json({ success: false, message: 'Impossible de relancer la signature.', ...result });
    }
    return res.json({ success: true, contract: { status: result.status } });
  } catch (e) {
    console.error('[contract] retry signature:', e);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

app.post(
  '/api/contracts/event-djs/:eventDjId/retry-signature',
  authenticateToken,
  retrySignatureHandler('dj', async (id, userId) => {
    const r = await loadEventDjWithAccess(id, userId);
    return { error: r.error, isBooker: r.isBooker };
  })
);
app.post(
  '/api/contracts/event-venues/:eventVenueId/retry-signature',
  authenticateToken,
  retrySignatureHandler('venue', async (id, userId) => {
    const r = await loadEventVenueWithAccess(id, userId);
    return { error: r.error, isBooker: r.isBooker };
  })
);
app.post(
  '/api/contracts/event-prestataires/:eventPrestataireId/retry-signature',
  authenticateToken,
  retrySignatureHandler('prestataire', async (id, userId) => {
    const r = await loadEventPrestataireWithAccess(id, userId);
    return { error: r.error, isBooker: r.isBooker };
  })
);
};
