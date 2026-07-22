/** Notifications métier Lieu — dérivées des bookings API. */

function formatRelativeDate(dateString, language) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const fr = language === 'fr';
  if (diffMins < 1) return fr ? 'À l’instant' : 'Just now';
  if (diffMins < 60) return fr ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
  if (diffHours < 24) return fr ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
  return date.toLocaleString(fr ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildVenueNotifications(bookings = [], language = 'fr') {
  const fr = language === 'fr';
  const items = [];

  bookings.forEach((b) => {
    const eventVenueId = b.eventVenueId || b.id;
    const createdAt = b.createdAt || b.eventDate;
    const st = String(b.invitationStatus || '').toUpperCase();

    if (st === 'PENDING') {
      items.push({
        id: `venue-pending-${eventVenueId}`,
        type: 'booking_pending',
        read: false,
        createdAt,
        eventVenueId,
        title: fr ? 'Nouvelle demande de collaboration' : 'New collaboration request',
        body: b.eventTitle,
        subtitle: b.booker?.name || b.eventLocation,
        action: 'lieuxRequestDetail',
      });
      return;
    }

    if (st === 'ACCEPTED' || st === 'CONFIRMED') {
      items.push({
        id: `venue-confirmed-${eventVenueId}`,
        type: 'booking_confirmed',
        read: true,
        createdAt,
        eventVenueId,
        title: fr ? 'Événement confirmé' : 'Event confirmed',
        body: b.eventTitle,
        subtitle: b.eventLocation,
        action: 'lieuxEventDetail',
      });
    }
  });

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function groupVenueNotifications(items) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  const groups = { today: [], yesterday: [], week: [], older: [] };
  items.forEach((n) => {
    const d = new Date(n.createdAt);
    if (Number.isNaN(d.getTime())) {
      groups.older.push(n);
      return;
    }
    if (d >= todayStart) groups.today.push(n);
    else if (d >= yesterdayStart) groups.yesterday.push(n);
    else if (d >= weekStart) groups.week.push(n);
    else groups.older.push(n);
  });
  return groups;
}

export function venueNotifIcon(type) {
  switch (type) {
    case 'booking_pending':
      return 'mail-unread-outline';
    case 'booking_confirmed':
      return 'checkmark-circle-outline';
    default:
      return 'notifications-outline';
  }
}

export { formatRelativeDate as formatVenueNotifDate };
