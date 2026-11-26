/**
 * Créneau réel d’un événement : `date` ne porte que le jour (son heure est celle à laquelle
 * l’organisateur a ouvert le sélecteur), l’heure de début est dans `time` (« 19:30 », « 23h »…),
 * à l’heure de Paris.
 */
const TIME_ZONE = 'Europe/Paris';
const DEFAULT_START = '20:00';
const DEFAULT_DURATION_HOURS = 6;
const HOUR_MS = 60 * 60 * 1000;

/** « 19:30 », « 19h30 », « 23h », « 9:05 » → « HH:mm » ; null si illisible. */
function parseEventTime(time) {
  const m = /^(\d{1,2})\s*[:hH]\s*(\d{2})?$/.exec(String(time || '').trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2] || 0);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function eventDay(date) {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Heure murale de Paris (jour YYYY-MM-DD + HH:mm) → Date UTC. */
function parisWallTime(ymd, hhmm) {
  const guess = new Date(`${ymd}T${hhmm}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const parisWall = new Date(`${guess.toLocaleString('sv-SE', { timeZone: TIME_ZONE }).replace(' ', 'T')}Z`);
  return new Date(guess.getTime() - (parisWall.getTime() - guess.getTime()));
}

/** @returns {{ start: Date, end: Date } | null} */
function eventWindow({ date, time, durationHours }) {
  const ymd = eventDay(date);
  if (!ymd) return null;
  const start = parisWallTime(ymd, parseEventTime(time) || DEFAULT_START);
  if (!start) return null;
  const hours = Number(durationHours) > 0 ? Number(durationHours) : DEFAULT_DURATION_HOURS;
  return { start, end: new Date(start.getTime() + hours * HOUR_MS) };
}

/** UPCOMING jusqu’au début, ONGOING pendant la soirée, FINISHED ensuite. */
function eventStatusAt(event, now = new Date()) {
  const window = eventWindow(event);
  if (!window) return null;
  if (now < window.start) return 'UPCOMING';
  if (now < window.end) return 'ONGOING';
  return 'FINISHED';
}

module.exports = {
  parseEventTime,
  eventDay,
  parisWallTime,
  eventWindow,
  eventStatusAt,
};
