/**
 * Helpers contrats booking (hash, rôles, notifications chat, garde-fous lieu).
 */
const prisma = require('../lib/prisma');

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

module.exports = {
  stableStringify,
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
};
