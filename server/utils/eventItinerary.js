/**
 * Parcours multi-lieux d'un événement (EventVenue ordonnés par `position`).
 */
const prisma = require('../lib/prisma');
const { parseHmClock, slotOffsetsFromEventStart } = require('./djSlotWindow');

const INACTIVE_VENUE_STATUSES = ['CANCELLED', 'REJECTED'];

/** `include` Prisma pour charger le parcours public d'un événement. */
const itineraryInclude = {
  where: { status: { notIn: INACTIVE_VENUE_STATUSES } },
  orderBy: { position: 'asc' },
  include: {
    venue: {
      select: { id: true, venueName: true, address: true, city: true, postalCode: true },
    },
  },
};

/** Forme envoyée aux apps : [{ venueId, name, address, city, slotStart, slotEnd, status }]. */
function serializeItinerary(eventVenues) {
  return (eventVenues || [])
    .filter((ev) => ev && !INACTIVE_VENUE_STATUSES.includes(ev.status))
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((ev) => ({
      venueId: ev.venueId,
      name: ev.venue?.venueName ?? null,
      address: ev.venue?.address ?? null,
      city: ev.venue?.city ?? null,
      slotStart: ev.slotStart ?? null,
      slotEnd: ev.slotEnd ?? null,
      status: ev.status,
    }));
}

/** Minutes depuis minuit, heure de Paris (les horaires d'événement sont saisis en heure locale). */
function parisClockMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

/**
 * Étape du parcours en cours selon l'heure (sinon la plus proche déjà commencée, sinon la première).
 * `stops` : EventVenue actifs triés par position, avec slotStart / slotEnd.
 */
function currentItineraryStop(stops, eventTimeStr, now = new Date()) {
  if (!Array.isArray(stops) || stops.length === 0) return null;
  const evS = parseHmClock(eventTimeStr);
  if (evS == null) return stops[0];
  let nowOffset = parisClockMinutes(now) - evS;
  if (nowOffset < -6 * 60) nowOffset += 24 * 60;
  let best = stops[0];
  for (const stop of stops) {
    const range = slotOffsetsFromEventStart(stop.slotStart, stop.slotEnd, eventTimeStr);
    if (!range) continue;
    if (nowOffset >= range.start && nowOffset < range.end) return stop;
    if (nowOffset >= range.start) best = stop;
  }
  return best;
}

/**
 * Lieu à mettre dans le contrat d'un DJ : celui où il joue (parcours multi-lieux), sinon le lieu principal.
 * `ed` : EventDj avec `event.venue` chargé.
 */
async function venueForEventDj(ed) {
  const principal = ed?.event?.venue || null;
  if (!ed?.venueId || (principal && principal.id === ed.venueId)) return principal;
  const own = await prisma.userVenue.findUnique({ where: { id: ed.venueId } });
  return own || principal;
}

/** Le lieu fait-il partie de l'événement (lieu principal ou étape active du parcours) ? */
async function isVenueOnEvent(event, venueId) {
  if (!event || !venueId) return false;
  if (event.venueId === venueId) return true;
  const link = await prisma.eventVenue.findFirst({
    where: {
      eventId: event.id,
      venueId,
      status: { notIn: INACTIVE_VENUE_STATUSES },
    },
    select: { id: true },
  });
  return !!link;
}

module.exports = {
  INACTIVE_VENUE_STATUSES,
  itineraryInclude,
  serializeItinerary,
  isVenueOnEvent,
  currentItineraryStop,
  venueForEventDj,
};
