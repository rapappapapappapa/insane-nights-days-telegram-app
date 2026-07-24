import {
  categorizeVenueBookings,
  isAcceptedBooking,
  isPendingBooking,
} from './lieuxEventUtils';

/** Lignes dashboard : pending d’abord, puis confirmés à venir. */
export function getDashboardEventRows(bookings = [], limit = 5) {
  const { upcoming } = categorizeVenueBookings(bookings);
  const pending = bookings.filter(isPendingBooking);
  const confirmed = upcoming.filter(isAcceptedBooking);

  const rows = [
    ...pending.map((booking) => ({ booking, status: booking.invitationStatus })),
    ...confirmed.map((booking) => ({ booking, status: booking.invitationStatus })),
  ];

  return rows.slice(0, limit);
}

/** Dernier event passé (confirmé de préférence) pour stats dashboard. */
export function getLastPastEvent(bookings = []) {
  const { past } = categorizeVenueBookings(bookings);
  return past.find(isAcceptedBooking) || past[0] || null;
}

export function formatFillRate(sold, capacity) {
  if (!capacity || capacity <= 0) return null;
  const s = Number(sold) || 0;
  return Math.min(100, Math.round((s / capacity) * 100));
}
