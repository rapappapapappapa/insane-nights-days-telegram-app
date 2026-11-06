/**
 * Notifications applicatives (onglets « Événements » et « Système » côté app).
 * Chaque envoi peut porter une `dedupeKey` : une même clé n’est enregistrée (et poussée) qu’une fois par utilisateur.
 */
const prisma = require('../lib/prisma');
const { sendExpoPushToTokens } = require('./expoPush');

const TIME_ZONE = 'Europe/Paris';

/** Date du jour à Paris, décalée de `offsetDays`, au format YYYY-MM-DD. */
function parisDay(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString('sv-SE', { timeZone: TIME_ZONE });
}

function parisHour() {
  return Number(new Date().toLocaleString('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', hour12: false }));
}

function dayRange(ymd) {
  const start = new Date(`${ymd}T00:00:00.000Z`);
  return { gte: start, lt: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/**
 * Crée la notification pour chaque utilisateur (une seule fois par `dedupeKey`) puis envoie le push
 * aux seuls utilisateurs nouvellement notifiés.
 */
async function notifyUsers(userIds, { category, type, title, body = null, eventId = null, imageUrl = null, dedupeKey = null, push = true }) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return 0;
  try {
    let targets = ids;
    if (dedupeKey) {
      const existing = await prisma.appNotification.findMany({
        where: { userId: { in: ids }, dedupeKey },
        select: { userId: true },
      });
      const already = new Set(existing.map((n) => n.userId));
      targets = ids.filter((id) => !already.has(id));
    }
    if (!targets.length) return 0;

    if (dedupeKey) {
      // Création une par une : la contrainte unique tranche si deux instances notifient en même temps.
      const created = [];
      for (const userId of targets) {
        try {
          await prisma.appNotification.create({ data: { userId, category, type, title, body, eventId, imageUrl, dedupeKey } });
          created.push(userId);
        } catch (error) {
          if (error?.code !== 'P2002') throw error;
        }
      }
      targets = created;
    } else {
      await prisma.appNotification.createMany({
        data: targets.map((userId) => ({ userId, category, type, title, body, eventId, imageUrl })),
      });
    }
    if (!targets.length) return 0;

    if (push) {
      const devices = await prisma.pushDevice.findMany({
        where: { userId: { in: targets } },
        select: { expoPushToken: true },
      });
      await sendExpoPushToTokens(
        devices.map((d) => d.expoPushToken),
        { title, body: body || '', data: { type: 'app_notification', category, notificationType: type, eventId } },
      );
    }
    return targets.length;
  } catch (error) {
    console.error('[appNotifications] notifyUsers', type, error?.message || error);
    return 0;
  }
}

async function eventSummary(eventId) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, date: true, time: true, image: true, location: true },
  });
}

/** Billet(s) obtenu(s) : un seul message par paiement (ou par lot gratuit). */
async function notifyTicketsIssued({ userId, eventId, quantity = 1, dedupeKey }) {
  const event = await eventSummary(eventId);
  if (!event) return;
  await notifyUsers([userId], {
    category: 'events',
    type: 'ticket_purchased',
    title: quantity > 1 ? `${quantity} billets confirmés` : 'Billet confirmé',
    body: `${event.title} — retrouve ton QR code dans Billets.`,
    eventId,
    imageUrl: event.image,
    dedupeKey,
  });
}

async function ticketHolderIds(eventId, statuses = ['valid', 'used']) {
  const rows = await prisma.ticket.findMany({
    where: { eventId, status: { in: statuses } },
    select: { userId: true },
    distinct: ['userId'],
  });
  return rows.map((r) => r.userId);
}

async function interestedUserIds(eventId) {
  const rows = await prisma.eventInterest.findMany({ where: { eventId }, select: { userId: true } });
  return rows.map((r) => r.userId);
}

/** Infos pratiques modifiées par l’organisateur (horaire, lieu…). */
async function notifyEventUpdated(event, changes) {
  if (!changes.length) return;
  const holders = await ticketHolderIds(event.id, ['valid']);
  await notifyUsers(holders, {
    category: 'events',
    type: 'event_updated',
    title: `Changement : ${event.title}`,
    body: `${changes.join(' et ')} ${changes.length > 1 ? 'ont' : 'a'} été modifié${changes.length > 1 ? 's' : ''}. Vérifie avant de partir.`,
    eventId: event.id,
    imageUrl: event.image,
  });
}

/** Destinataires d’une annulation : à calculer avant la suppression (billets et intérêts partent en cascade). */
async function eventAudienceIds(eventId) {
  const [holders, interested] = await Promise.all([ticketHolderIds(eventId), interestedUserIds(eventId)]);
  return [...new Set([...holders, ...interested])];
}

async function notifyEventCancelled(event, userIds) {
  await notifyUsers(userIds, {
    category: 'events',
    type: 'event_cancelled',
    title: `Annulé : ${event.title}`,
    body: 'L’organisateur a supprimé cet événement.',
    imageUrl: event.image,
    dedupeKey: `cancelled:${event.id}`,
  });
}

/**
 * Rappels périodiques (appelés par le cron des statuts) :
 * - la veille (à partir de 10 h, heure de Paris) pour les billets et les « Intéressé » ;
 * - le lendemain (à partir de 12 h) pour noter la soirée quand le billet a été scanné.
 */
async function runEventReminders() {
  try {
    const hour = parisHour();
    if (hour >= 10) {
      const tomorrow = await prisma.event.findMany({
        where: { date: dayRange(parisDay(1)), status: 'UPCOMING' },
        select: { id: true, title: true, time: true, image: true, location: true },
      });
      for (const event of tomorrow) {
        const holders = await ticketHolderIds(event.id, ['valid']);
        await notifyUsers(holders, {
          category: 'events',
          type: 'event_reminder',
          title: `C’est demain : ${event.title}`,
          body: [event.time ? `Rendez-vous à ${event.time}` : null, event.location].filter(Boolean).join(' — ') || 'Ton billet est prêt dans Billets.',
          eventId: event.id,
          imageUrl: event.image,
          dedupeKey: `reminder:${event.id}`,
        });
        const holderSet = new Set(holders);
        const interested = (await interestedUserIds(event.id)).filter((id) => !holderSet.has(id));
        await notifyUsers(interested, {
          category: 'events',
          type: 'event_reminder_interested',
          title: `${event.title}, c’est demain`,
          body: 'Tu l’as marqué « Intéressé ». Prends ta place avant qu’il ne soit trop tard.',
          eventId: event.id,
          imageUrl: event.image,
          dedupeKey: `reminder:${event.id}`,
        });
      }
    }

    if (hour >= 12) {
      const yesterday = await prisma.event.findMany({
        where: { date: dayRange(parisDay(-1)) },
        select: { id: true, title: true, image: true },
      });
      for (const event of yesterday) {
        const attendees = await ticketHolderIds(event.id, ['used']);
        await notifyUsers(attendees, {
          category: 'events',
          type: 'rate_reminder',
          title: `Alors, ${event.title} ?`,
          body: 'Note la soirée, le line-up et le lieu depuis ton billet.',
          eventId: event.id,
          imageUrl: event.image,
          dedupeKey: `rate:${event.id}`,
        });
      }
    }
  } catch (error) {
    console.error('[appNotifications] runEventReminders', error?.message || error);
  }
}

/** Message de bienvenue (Système) pour les comptes récents, créé à la première consultation. */
async function ensureWelcomeNotification(user) {
  if (!user?.createdAt) return;
  const ageDays = (Date.now() - new Date(user.createdAt).getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays > 30) return;
  await notifyUsers([user.id], {
    category: 'system',
    type: 'welcome',
    title: 'Bienvenue sur NOX',
    body: 'Marque des soirées « Intéressé » avec le cœur pour les retrouver dans ton agenda.',
    dedupeKey: 'welcome',
    push: false,
  });
}

module.exports = {
  notifyUsers,
  notifyTicketsIssued,
  notifyEventUpdated,
  notifyEventCancelled,
  eventAudienceIds,
  runEventReminders,
  ensureWelcomeNotification,
};
