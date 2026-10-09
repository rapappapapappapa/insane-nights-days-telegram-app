/** Filtres écran Demandes Lieu (Figma 08_DEMANDES). */

export const DEMAND_FILTERS = ['pending', 'confirmed', 'negotiate', 'rejected'];

export function getDemandFilterForBooking(booking) {
  const st = String(booking?.invitationStatus || '').toUpperCase();
  if (st === 'ACCEPTED' || st === 'CONFIRMED') return 'confirmed';
  if (st === 'REJECTED' || st === 'CANCELLED' || st === 'DECLINED') return 'rejected';
  if (st === 'PENDING') {
    if (booking.paymentAmount != null || booking.paymentStatus === 'PENDING') {
      return 'negotiate';
    }
    return 'pending';
  }
  return 'pending';
}

export function filterBookingsByDemandFilter(bookings = [], filter) {
  if (!filter || filter === 'all') return bookings;
  return bookings.filter((b) => getDemandFilterForBooking(b) === filter);
}

export function countBookingsByDemandFilter(bookings = []) {
  const counts = { pending: 0, confirmed: 0, negotiate: 0, rejected: 0 };
  bookings.forEach((b) => {
    const key = getDemandFilterForBooking(b);
    if (counts[key] != null) counts[key] += 1;
  });
  return counts;
}

export function getDemandFilterLabel(filter, language = 'fr') {
  const fr = language === 'fr';
  switch (filter) {
    case 'pending':
      return fr ? 'En attente' : 'Pending';
    case 'confirmed':
      return fr ? 'Confirmé' : 'Confirmed';
    case 'negotiate':
      return fr ? 'À négocier' : 'To negotiate';
    case 'rejected':
      return fr ? 'Refusé' : 'Refused';
    default:
      return filter;
  }
}

export function getDemandFilterPillStyle(filter) {
  switch (filter) {
    case 'pending':
      return { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.45)', text: '#fbbf24' };
    case 'confirmed':
      return { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#4ade80' };
    case 'negotiate':
      return { bg: 'rgba(77,163,255,0.15)', border: 'rgba(77,163,255,0.4)', text: '#4DA3FF' };
    case 'rejected':
      return { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', text: '#f87171' };
    default:
      return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: '#fff' };
  }
}

/** Cible navigation push notif / chat pour profil VENUE. */
export function resolveVenuePushNavigation(params = {}) {
  const eventVenueId = params.openChatEventVenueId;
  if (eventVenueId) {
    return { screen: 'lieuxBookingChat', routeParams: { eventVenueId } };
  }
  if (params.openBookings) {
    return { screen: 'lieuxDemandes', routeParams: { filter: 'pending' } };
  }
  return { screen: 'lieuxDashboard', routeParams: params };
}
