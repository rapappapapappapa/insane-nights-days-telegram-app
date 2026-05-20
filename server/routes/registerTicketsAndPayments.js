/**
 * Billets (achat classique), Stripe (webhook, intents, confirmation), liste paiements / tickets.
 */
const prisma = require('../lib/prisma');
const {
  parseTicketTiersFromDb,
  resolvePurchaseTier,
} = require('../utils/ticketTiers');

module.exports = function registerTicketsAndPaymentsRoutes(app, deps) {
  const {
    authenticateToken,
    parseTicketQuantity,
    uuidv4,
    stripe,
    stripeSecretKey,
    stripePublishableKey,
    stripeWebhookSecret,
    eurosToCents,
  } = deps;

app.post('/api/tickets/buy', authenticateToken, async (req, res) => {
  try {
    const { eventId, quantity: quantityRaw = 1, tierId: tierIdBody } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'eventId est requis.',
      });
    }
    const qtyCheck = parseTicketQuantity(quantityRaw);
    if (!qtyCheck.valid) {
      return res.status(400).json({ success: false, message: qtyCheck.message });
    }
    const quantity = qtyCheck.quantity;

    // Vérifier que l'utilisateur a un profil Community actif
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { communities: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    if (user.activeProfileType !== 'COMMUNITY') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les profils Community peuvent acheter des tickets. Veuillez basculer sur votre profil Community.',
      });
    }

    // Vérifier qu'il a au moins un profil Community
    if (!user.communities || user.communities.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez avoir un profil Community pour acheter des tickets. Créez-en un depuis votre profil.',
      });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    }

    // Vérifier que l'événement est à venir (on ne peut acheter que pour les événements à venir)
    if (event.status !== 'UPCOMING') {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez acheter un ticket que pour un événement à venir.',
      });
    }

    if (event.sold + quantity > event.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Pas assez de places disponibles',
      });
    }

    const tierRes = resolvePurchaseTier(event, tierIdBody);
    if (tierRes.error === 'TIER_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Choisis un tarif (tierId) pour cet événement.',
        code: 'TIER_REQUIRED',
      });
    }
    if (tierRes.error === 'INVALID_TIER') {
      return res.status(400).json({
        success: false,
        message: 'Tarif inconnu ou invalide.',
        code: 'INVALID_TIER',
      });
    }
    if (tierRes.error === 'PRICE_INVALID' || tierRes.error === 'TIER_PRICE_INVALID') {
      return res.status(400).json({
        success: false,
        message: 'Prix billet invalide pour cet événement.',
      });
    }

    const tiers = parseTicketTiersFromDb(event.ticketTiers);
    if (tierRes.tierId && tiers) {
      const def = tiers.find((t) => t.id === tierRes.tierId);
      if (def?.maxSold != null) {
        const soldTier = await prisma.ticket.count({
          where: { eventId, tierId: tierRes.tierId, status: 'valid' },
        });
        if (soldTier + quantity > def.maxSold) {
          return res.status(400).json({
            success: false,
            message: 'Quota atteint pour ce tarif.',
            code: 'TIER_QUOTA',
          });
        }
      }
    }

    const newTickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticket = await prisma.ticket.create({
        data: {
          userId,
          eventId,
          tierId: tierRes.tierId,
          price: tierRes.unitEuros,
          status: 'valid',
          qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
        },
      });
      newTickets.push({
        id: ticket.id,
        userId: ticket.userId,
        eventId: ticket.eventId,
        price: ticket.price,
        status: ticket.status,
        qrCode: ticket.qrCode,
        purchaseDate: ticket.purchaseDate.toISOString(),
      });
    }

    // Mettre à jour le nombre de tickets vendus
    await prisma.event.update({
      where: { id: eventId },
      data: { sold: event.sold + quantity },
    });

    // Mettre à jour le score de l'utilisateur
    const newScore = (user.score || 0) + 50 * quantity;
    const newLevel = Math.floor(newScore / 200) + 1;

    await prisma.user.update({
      where: { id: userId },
      data: {
        score: newScore,
        level: newLevel,
      },
    });

    res.json({
      success: true,
      message: `🎟️ ${quantity} ticket(s) acheté(s) avec succès`,
      tickets: newTickets,
      updatedUser: {
        score: newScore,
        level: newLevel,
      },
    });
  } catch (error) {
    console.error('Erreur achat ticket:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// STRIPE PAIEMENT -> TICKETS
// ============================================================================

/**
 * Stripe Webhook (source de vérité en prod)
 * - Vérifie la signature
 * - Met à jour Payment.status
 * - Peut délivrer les tickets même si l'app se ferme après le paiement
 */
app.post('/api/webhooks/stripe', async (req, res) => {
  try {
    if (!stripe || !stripeSecretKey) {
      return res.status(500).send('Stripe n’est pas configuré côté serveur.');
    }
    if (!stripeWebhookSecret) {
      return res.status(500).send('STRIPE_WEBHOOK_SECRET manquante côté serveur.');
    }

    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).send('Header stripe-signature manquant.');
    }
    if (!req.rawBody) {
      return res.status(400).send('rawBody manquant (configuration Express).');
    }

    const stripeEvent = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret);

    // On gère un sous-ensemble des events utiles à notre flow
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const intent = stripeEvent.data.object;
      const paymentIntentId = intent.id;

      const payment = await prisma.payment.findUnique({ where: { paymentIntentId } });
      if (!payment) {
        console.warn('[STRIPE WEBHOOK] Payment introuvable pour intent:', paymentIntentId);
        return res.json({ received: true });
      }
      if (payment.status === 'fulfilled') {
        return res.json({ received: true });
      }

      // Revalidation de base
      if (typeof intent.amount === 'number' && intent.amount !== payment.amount) {
        console.warn('[STRIPE WEBHOOK] amount mismatch', { paymentIntentId, intentAmount: intent.amount, paymentAmount: payment.amount });
        await prisma.payment.update({ where: { paymentIntentId }, data: { status: 'failed' } });
        return res.json({ received: true });
      }
      if (intent.currency && intent.currency.toLowerCase() !== payment.currency.toLowerCase()) {
        console.warn('[STRIPE WEBHOOK] currency mismatch', { paymentIntentId, intentCurrency: intent.currency, paymentCurrency: payment.currency });
        await prisma.payment.update({ where: { paymentIntentId }, data: { status: 'failed' } });
        return res.json({ received: true });
      }

      // Délivrance idempotente côté serveur
      await prisma.$transaction(async (tx) => {
        const freshPayment = await tx.payment.findUnique({
          where: { paymentIntentId },
          include: { tickets: true },
        });
        if (!freshPayment) return;
        if (freshPayment.status === 'fulfilled') return;

        const event = await tx.event.findUnique({ where: { id: freshPayment.eventId } });
        if (!event) throw new Error('Événement non trouvé');
        if (event.status !== 'UPCOMING') throw new Error('Événement non éligible (pas UPCOMING)');
        if (event.sold + freshPayment.quantity > event.capacity) throw new Error('Pas assez de places disponibles');

        const tierResolved = resolvePurchaseTier(event, freshPayment.tierId);
        if (tierResolved.error) throw new Error(`Tarif invalide (${tierResolved.error})`);
        const unitCents = eurosToCents(tierResolved.unitEuros);
        if (unitCents === null) throw new Error('Prix unitaire invalide');
        const expectedTotal = unitCents * freshPayment.quantity;
        if (expectedTotal !== freshPayment.amount) {
          console.warn('[STRIPE WEBHOOK] amount vs tier mismatch', {
            paymentIntentId,
            expectedTotal,
            paymentAmount: freshPayment.amount,
            unitEuros: tierResolved.unitEuros,
          });
          throw new Error('Montant incompatible avec le tarif sélectionné');
        }

        const tiers = parseTicketTiersFromDb(event.ticketTiers);
        if (tierResolved.tierId && tiers) {
          const def = tiers.find((t) => t.id === tierResolved.tierId);
          if (def?.maxSold != null) {
            const soldTier = await tx.ticket.count({
              where: {
                eventId: freshPayment.eventId,
                tierId: tierResolved.tierId,
                status: 'valid',
              },
            });
            if (soldTier + freshPayment.quantity > def.maxSold) {
              throw new Error('Quota atteint pour ce tarif');
            }
          }
        }

        // Status trace (optionnel)
        await tx.payment.update({ where: { paymentIntentId }, data: { status: 'succeeded' } });

        for (let i = 0; i < freshPayment.quantity; i++) {
          await tx.ticket.create({
            data: {
              userId: freshPayment.userId,
              eventId: freshPayment.eventId,
              paymentIntentId,
              tierId: tierResolved.tierId,
              price: tierResolved.unitEuros,
              status: 'valid',
              qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
            },
          });
        }

        await tx.event.update({
          where: { id: freshPayment.eventId },
          data: { sold: { increment: freshPayment.quantity } },
        });

        const user = await tx.user.findUnique({ where: { id: freshPayment.userId } });
        const newScore = (user?.score || 0) + 50 * freshPayment.quantity;
        const newLevel = Math.floor(newScore / 200) + 1;
        await tx.user.update({
          where: { id: freshPayment.userId },
          data: { score: newScore, level: newLevel },
        });

        await tx.payment.update({ where: { paymentIntentId }, data: { status: 'fulfilled' } });
      });
    } else if (stripeEvent.type === 'payment_intent.payment_failed' || stripeEvent.type === 'payment_intent.canceled') {
      const intent = stripeEvent.data.object;
      const paymentIntentId = intent.id;
      const payment = await prisma.payment.findUnique({ where: { paymentIntentId } });
      if (payment && payment.status !== 'fulfilled') {
        await prisma.payment.update({ where: { paymentIntentId }, data: { status: 'failed' } });
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('[STRIPE WEBHOOK] Error:', err?.message || err);
    // Stripe attend un 2xx pour considérer l'event comme traité. Ici, on renvoie 400/500 pour déclencher un retry.
    return res.status(400).send(`Webhook Error: ${err?.message || 'unknown'}`);
  }
});

/**
 * Crée un PaymentIntent Stripe pour l'achat de tickets.
 * ✅ Requiert un profil COMMUNITY actif (même règle que /api/tickets/buy)
 */
app.post('/api/payments/create-ticket-intent', authenticateToken, async (req, res) => {
  try {
    if (!stripe || !stripeSecretKey) {
      return res.status(500).json({ success: false, message: 'Stripe n’est pas configuré côté serveur.' });
    }
    if (!stripePublishableKey) {
      return res.status(500).json({ success: false, message: 'STRIPE_PUBLISHABLE_KEY manquante côté serveur.' });
    }

    const { eventId, quantity: quantityRaw = 1, tierId: tierIdBody } = req.body ?? {};
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId est requis.' });
    }
    const qtyCheck = parseTicketQuantity(quantityRaw);
    if (!qtyCheck.valid) {
      return res.status(400).json({ success: false, message: qtyCheck.message });
    }
    const quantity = qtyCheck.quantity;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { communities: true },
    });
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.activeProfileType !== 'COMMUNITY') {
      return res.status(403).json({
        success: false,
        message: 'Seuls les profils Community peuvent acheter des tickets. Veuillez basculer sur votre profil Community.',
      });
    }
    if (!user.communities || user.communities.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez avoir un profil Community pour acheter des tickets. Créez-en un depuis votre profil.',
      });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ success: false, message: 'Événement non trouvé' });
    if (event.status !== 'UPCOMING') {
      return res.status(400).json({ success: false, message: 'Vous ne pouvez acheter un ticket que pour un événement à venir.' });
    }
    if (event.sold + quantity > event.capacity) {
      return res.status(400).json({ success: false, message: 'Pas assez de places disponibles' });
    }

    const tierRes = resolvePurchaseTier(event, tierIdBody);
    if (tierRes.error === 'TIER_REQUIRED') {
      return res.status(400).json({
        success: false,
        message: 'Choisis un tarif (tierId) pour cet événement.',
        code: 'TIER_REQUIRED',
      });
    }
    if (tierRes.error === 'INVALID_TIER') {
      return res.status(400).json({
        success: false,
        message: 'Tarif inconnu ou invalide.',
        code: 'INVALID_TIER',
      });
    }
    if (tierRes.error === 'PRICE_INVALID' || tierRes.error === 'TIER_PRICE_INVALID') {
      return res.status(400).json({ success: false, message: 'Prix billet invalide pour cet événement.' });
    }

    const tiers = parseTicketTiersFromDb(event.ticketTiers);
    if (tierRes.tierId && tiers) {
      const def = tiers.find((t) => t.id === tierRes.tierId);
      if (def?.maxSold != null) {
        const soldTier = await prisma.ticket.count({
          where: { eventId, tierId: tierRes.tierId, status: 'valid' },
        });
        if (soldTier + quantity > def.maxSold) {
          return res.status(400).json({
            success: false,
            message: 'Quota atteint pour ce tarif.',
            code: 'TIER_QUOTA',
          });
        }
      }
    }

    const unitAmount = eurosToCents(tierRes.unitEuros);
    if (unitAmount === null) return res.status(500).json({ success: false, message: 'Prix événement invalide.' });
    const amount = unitAmount * quantity;
    if (amount < 50) return res.status(400).json({ success: false, message: 'Montant trop faible pour Stripe.' });

    const intent = await stripe.paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId,
        eventId,
        quantity: String(quantity),
        ...(tierRes.tierId ? { tierId: tierRes.tierId } : {}),
      },
    });

    await prisma.payment.create({
      data: {
        userId,
        eventId,
        paymentIntentId: intent.id,
        amount,
        currency: 'eur',
        quantity,
        tierId: tierRes.tierId,
        status: 'created',
      },
    });

    res.json({
      success: true,
      publishableKey: stripePublishableKey,
      paymentIntentClientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount,
      currency: 'eur',
    });
  } catch (error) {
    console.error('Erreur création PaymentIntent:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * Confirme côté serveur et délivre les tickets après paiement Stripe.
 * Idempotent via Payment(paymentIntentId unique) + status fulfilled.
 */
app.post('/api/payments/confirm-ticket-purchase', authenticateToken, async (req, res) => {
  try {
    if (!stripe || !stripeSecretKey) {
      return res.status(500).json({ success: false, message: 'Stripe n’est pas configuré côté serveur.' });
    }

    const { paymentIntentId } = req.body ?? {};
    const userId = req.user.id;
    if (!paymentIntentId) {
      return res.status(400).json({ success: false, message: 'paymentIntentId est requis.' });
    }

    const httpError = (statusCode, message) => {
      const err = new Error(message);
      err.statusCode = statusCode;
      return err;
    };

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { paymentIntentId },
        include: { tickets: true },
      });

      if (!payment) throw httpError(404, 'Paiement introuvable.');
      if (payment.userId !== userId) throw httpError(403, 'Paiement non autorisé.');

      // ✅ Idempotence: si déjà délivré, renvoyer les tickets associés à ce paiement
      if (payment.status === 'fulfilled') {
        const existingTickets = (payment.tickets || []).map((t) => ({
          id: t.id,
          userId: t.userId,
          eventId: t.eventId,
          price: t.price,
          status: t.status,
          qrCode: t.qrCode,
          purchaseDate: t.purchaseDate.toISOString(),
        }));
        return { alreadyFulfilled: true, payment, tickets: existingTickets };
      }

      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

      // Si le paiement n'est pas "succeeded", on n'émet aucun ticket.
      if (intent.status !== 'succeeded') {
        await tx.payment.update({
          where: { paymentIntentId },
          data: { status: intent.status === 'canceled' ? 'failed' : 'created' },
        });
        throw httpError(400, `Paiement non validé (status: ${intent.status}).`);
      }

      // 🔒 Revalidation: correspondance metadata / montant / devise
      if (intent.metadata?.userId && intent.metadata.userId !== userId) {
        throw httpError(403, 'Paiement invalide (user mismatch).');
      }
      if (intent.metadata?.eventId && intent.metadata.eventId !== payment.eventId) {
        throw httpError(400, 'Paiement invalide (event mismatch).');
      }
      if (intent.metadata?.quantity && Number(intent.metadata.quantity) !== payment.quantity) {
        throw httpError(400, 'Paiement invalide (quantity mismatch).');
      }
      if (typeof intent.amount === 'number' && intent.amount !== payment.amount) {
        throw httpError(400, 'Paiement invalide (amount mismatch).');
      }
      if (intent.currency && intent.currency.toLowerCase() !== payment.currency.toLowerCase()) {
        throw httpError(400, 'Paiement invalide (currency mismatch).');
      }

      const event = await tx.event.findUnique({ where: { id: payment.eventId } });
      if (!event) throw httpError(404, 'Événement non trouvé');
      if (event.status !== 'UPCOMING') {
        throw httpError(400, 'Vous ne pouvez acheter un ticket que pour un événement à venir.');
      }
      if (event.sold + payment.quantity > event.capacity) {
        throw httpError(400, 'Pas assez de places disponibles');
      }

      if (intent.metadata?.tierId != null && payment.tierId != null && intent.metadata.tierId !== payment.tierId) {
        throw httpError(400, 'Paiement invalide (tarif incompatible).');
      }

      const tierResolved = resolvePurchaseTier(event, payment.tierId);
      if (tierResolved.error) {
        throw httpError(400, `Tarif invalide (${tierResolved.error}).`);
      }
      const unitCentsExpected = eurosToCents(tierResolved.unitEuros);
      if (unitCentsExpected === null) {
        throw httpError(400, 'Prix unitaire invalide.');
      }
      if (unitCentsExpected * payment.quantity !== payment.amount) {
        throw httpError(400, 'Montant incompatible avec le tarif.');
      }

      const tiers = parseTicketTiersFromDb(event.ticketTiers);
      if (tierResolved.tierId && tiers) {
        const def = tiers.find((t) => t.id === tierResolved.tierId);
        if (def?.maxSold != null) {
          const soldTier = await tx.ticket.count({
            where: {
              eventId: payment.eventId,
              tierId: tierResolved.tierId,
              status: 'valid',
            },
          });
          if (soldTier + payment.quantity > def.maxSold) {
            throw httpError(400, 'Quota atteint pour ce tarif.');
          }
        }
      }

      // Marquer "succeeded" côté DB (trace) avant délivrance
      await tx.payment.update({ where: { paymentIntentId }, data: { status: 'succeeded' } });

      const newTickets = [];
      for (let i = 0; i < payment.quantity; i++) {
        const ticket = await tx.ticket.create({
          data: {
            userId,
            eventId: payment.eventId,
            paymentIntentId,
            tierId: tierResolved.tierId,
            price: tierResolved.unitEuros,
            status: 'valid',
            qrCode: `TICKET_${uuidv4().slice(0, 8).toUpperCase()}`,
          },
        });
        newTickets.push({
          id: ticket.id,
          userId: ticket.userId,
          eventId: ticket.eventId,
          price: ticket.price,
          status: ticket.status,
          qrCode: ticket.qrCode,
          purchaseDate: ticket.purchaseDate.toISOString(),
        });
      }

      // ✅ Incrément atomique (évite les écritures "stale")
      await tx.event.update({
        where: { id: payment.eventId },
        data: { sold: { increment: payment.quantity } },
      });

      const user = await tx.user.findUnique({ where: { id: userId } });
      const newScore = (user?.score || 0) + 50 * payment.quantity;
      const newLevel = Math.floor(newScore / 200) + 1;
      await tx.user.update({
        where: { id: userId },
        data: { score: newScore, level: newLevel },
      });

      await tx.payment.update({ where: { paymentIntentId }, data: { status: 'fulfilled' } });

      return { alreadyFulfilled: false, payment, tickets: newTickets, updatedUser: { score: newScore, level: newLevel } };
    });

    return res.json({
      success: true,
      message: result.alreadyFulfilled ? 'Déjà traité.' : `🎟️ ${result.payment.quantity} ticket(s) acheté(s) avec succès`,
      tickets: result.tickets,
      updatedUser: result.updatedUser,
      paymentIntentId,
    });
  } catch (error) {
    console.error('Erreur confirmation paiement:', error);
    const statusCode = error?.statusCode || 500;
    res.status(statusCode).json({ success: false, message: error?.message || 'Erreur serveur' });
  }
});

/**
 * Liste des paiements de l'utilisateur connecté (Mes achats)
 * @route GET /api/payments/me
 * @access Private (auth)
 */
app.get('/api/payments/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            location: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = payments.map((p) => ({
      id: p.id,
      paymentIntentId: p.paymentIntentId,
      status: p.status,
      amount: p.amount, // centimes
      currency: p.currency,
      quantity: p.quantity,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      event: p.event
        ? {
            id: p.event.id,
            title: p.event.title,
            date: p.event.date instanceof Date ? p.event.date.toISOString() : p.event.date,
            time: p.event.time,
            location: p.event.location,
            status: p.event.status,
          }
        : null,
    }));

    res.json({ success: true, payments: formatted });
  } catch (error) {
    console.error('Erreur récupération paiements (me):', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ✅ Version sécurisée: récupérer les tickets de l'utilisateur connecté
app.get('/api/user/me/tickets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userTickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            eventDjs: true,
            venue: {
              select: {
                id: true,
                venueName: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    const formattedTickets = userTickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      eventId: ticket.eventId,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.date.toISOString().split('T')[0],
      eventTime: ticket.event.time,
      eventDurationHours: ticket.event.durationHours ?? null,
      eventLocation: ticket.event.location,
      eventGenre: ticket.event.genre,
      eventStatus: ticket.event.status || 'UPCOMING',
      djIds: ticket.event.eventDjs.map((ed) => ed.djId),
      venueId: ticket.event.venueId,
      venueName: ticket.event.venue?.venueName,
      price: ticket.price,
      status: ticket.status,
      qrCode: ticket.qrCode,
      purchaseDate: ticket.purchaseDate.toISOString(),
    }));

    res.json({ success: true, tickets: formattedTickets });
  } catch (error) {
    console.error('Erreur récupération tickets (me):', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// 🔒 Sécurisé: récupérer les tickets d'un userId (uniquement si c'est l'utilisateur connecté)
// (Conserver cette route pour compat, mais ne plus l'exposer publiquement.)
app.get('/api/user/:userId/tickets', authenticateToken, async (req, res) => {
  try {
    if (!req.user?.id || req.user.id !== req.params.userId) {
      return res.status(403).json({ success: false, message: 'Accès refusé.' });
    }
    const userTickets = await prisma.ticket.findMany({
      where: { userId: req.params.userId },
      include: {
        event: {
          include: {
            eventDjs: true,
            venue: {
              select: {
                id: true,
                venueName: true,
              },
            },
          },
        },
      },
      orderBy: {
        purchaseDate: 'desc',
      },
    });

    const formattedTickets = userTickets.map((ticket) => ({
      id: ticket.id,
      userId: ticket.userId,
      eventId: ticket.eventId,
      eventTitle: ticket.event.title,
      eventDate: ticket.event.date.toISOString().split('T')[0],
      eventTime: ticket.event.time,
      eventDurationHours: ticket.event.durationHours ?? null,
      eventLocation: ticket.event.location,
      eventGenre: ticket.event.genre,
      eventStatus: ticket.event.status || 'UPCOMING', // Statut de l'événement
      djIds: ticket.event.eventDjs.map((ed) => ed.djId), // IDs des DJs (User.id) pour la notation
      venueId: ticket.event.venueId,
      venueName: ticket.event.venue?.venueName,
      price: ticket.price,
      status: ticket.status,
      qrCode: ticket.qrCode,
      purchaseDate: ticket.purchaseDate.toISOString(),
    }));

    res.json({ success: true, tickets: formattedTickets });
  } catch (error) {
    console.error('Erreur récupération tickets:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
};
