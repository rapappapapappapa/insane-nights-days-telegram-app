import { parseEventDate, startOfToday } from './noxDiscoverUtils';
import { AVAILABILITY_STATUS } from '../screens/lieux/mockData';

const ACCEPTED = new Set(['ACCEPTED', 'CONFIRMED']);

export function isAcceptedBooking(booking) {
  return ACCEPTED.has(String(booking?.invitationStatus || '').toUpperCase());
}

export function isPendingBooking(booking) {
  return String(booking?.invitationStatus || '').toUpperCase() === 'PENDING';
}

export function isDraftBooking(booking) {
  return String(booking?.eventStatus || '').toUpperCase() === 'DRAFT';
}

export function isPastBooking(booking) {
  const status = String(booking?.eventStatus || '').toUpperCase();
  if (status === 'FINISHED') return true;
  const d = parseEventDate(booking?.eventDate);
  if (!d) return false;
  return d < startOfToday();
}

export function categorizeVenueBookings(bookings = []) {
  const upcoming = [];
  const past = [];
  const drafts = [];

  bookings.forEach((b) => {
    if (isDraftBooking(b)) {
      drafts.push(b);
      return;
    }
    if (isPastBooking(b)) {
      past.push(b);
      return;
    }
    if (isAcceptedBooking(b) || isPendingBooking(b)) {
      upcoming.push(b);
    }
  });

  const byDateAsc = (a, b) => {
    const da = parseEventDate(a.eventDate)?.getTime() ?? 0;
    const db = parseEventDate(b.eventDate)?.getTime() ?? 0;
    return da - db;
  };
  const byDateDesc = (a, b) => -byDateAsc(a, b);

  upcoming.sort(byDateAsc);
  past.sort(byDateDesc);
  drafts.sort(byDateDesc);

  return { upcoming, past, drafts };
}

/** Statut calendrier dispos à partir d'une réservation. */
export function bookingCalendarStatus(booking) {
  if (isPendingBooking(booking)) return 'pending';
  if (isAcceptedBooking(booking)) return 'booked';
  return null;
}

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Grille mensuelle avec statuts issus des bookings API.
 * @param {Date} viewDate — mois affiché
 * @param {Array} bookings
 */
export function buildCalendarRowsFromBookings(viewDate = new Date(), bookings = [], blockedDates = []) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const blockedSet = new Set(blockedDates || []);
  const statusByDay = {};
  bookings.forEach((b) => {
    const d = parseEventDate(b.eventDate);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    const st = bookingCalendarStatus(b);
    if (!st) return;
    if (statusByDay[day] === 'booked') return;
    statusByDay[day] = st;
  });

  blockedSet.forEach((dateKey) => {
    const d = parseEventDate(dateKey);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
    const day = d.getDate();
    if (statusByDay[day] !== 'booked') statusByDay[day] = 'off';
  });

  const rows = [];
  let day = 1 - startOffset;
  for (let r = 0; r < 6; r += 1) {
    const row = [];
    for (let c = 0; c < 7; c += 1) {
      const muted = day < 1 || day > daysInMonth;
      const displayDay = muted ? ((day - 1 + daysInMonth) % daysInMonth) + 1 : day;
      const dateKey =
        !muted
          ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          : null;
      row.push({
        d: displayDay,
        muted,
        day: muted ? null : day,
        dateKey,
        status: !muted ? statusByDay[day] || null : null,
      });
      day += 1;
    }
    rows.push(row);
  }
  return { rows, weekDays: WEEK_DAYS };
}

export function calendarStatusColor(status) {
  if (!status) return null;
  return AVAILABILITY_STATUS[status] || null;
}

export function findBookingByEventVenueId(bookings, eventVenueId) {
  if (!eventVenueId) return null;
  return (
    bookings.find((b) => String(b.eventVenueId || b.id) === String(eventVenueId)) || null
  );
}
