const API_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const iso = API_DATE_RE.test(dateStr) ? `${dateStr}T12:00:00` : dateStr;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function formatEventDateLabel(dateStr, language = 'fr', options = {}) {
  if (!dateStr) return '';
  try {
    const iso = API_DATE_RE.test(dateStr) ? `${dateStr}T12:00:00` : dateStr;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: options.shortMonth ? 'short' : 'long',
      year: options.withYear ? 'numeric' : undefined,
    });
  } catch {
    return dateStr;
  }
}

export function formatEventTimeLabel(timeStr) {
  if (!timeStr) return '';
  const normalized = String(timeStr).replace(/[hH]/g, ':');
  const parts = normalized.split(':').map((p) => parseInt(p, 10));
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function filterUpcomingEvents(events, limit = 8) {
  const today = startOfToday();
  return (events || [])
    .filter((event) => {
      const d = parseEventDate(event.date);
      if (!d) return true;
      return d >= today;
    })
    .sort((a, b) => {
      const da = parseEventDate(a.date)?.getTime() ?? 0;
      const db = parseEventDate(b.date)?.getTime() ?? 0;
      return da - db;
    })
    .slice(0, limit);
}

export function getFeaturedEvent(events) {
  const upcoming = filterUpcomingEvents(events, 1);
  return upcoming[0] || events?.[0] || null;
}

export function filterEventsList(events, { genre = 'all', search = '', dateFilter = 'upcoming' } = {}) {
  const today = startOfToday();
  const q = (search || '').toLowerCase();
  return (events || []).filter((event) => {
    const matchesGenre = genre === 'all' || event.genre === genre;
    const matchesSearch =
      !q ||
      event.title?.toLowerCase().includes(q) ||
      event.location?.toLowerCase().includes(q) ||
      event.genre?.toLowerCase().includes(q);
    const eventDate = parseEventDate(event.date);
    let matchesDate = true;
    if (dateFilter !== 'all' && eventDate) {
      if (dateFilter === 'upcoming') matchesDate = eventDate >= today;
      if (dateFilter === 'past') matchesDate = eventDate < today;
    }
    return matchesGenre && matchesSearch && matchesDate;
  });
}

export function filterDjsList(djs, { genre = 'all', search = '' } = {}) {
  const q = (search || '').toLowerCase();
  return (djs || []).filter((dj) => {
    const djGenre = (dj.genre || dj.style || '').toString();
    const matchesGenre = genre === 'all' || djGenre === genre;
    const matchesSearch =
      !q ||
      dj.artistName?.toLowerCase().includes(q) ||
      djGenre.toLowerCase().includes(q) ||
      dj.city?.toLowerCase().includes(q);
    return matchesGenre && matchesSearch;
  });
}

export function collectGenres(items, field = 'genre') {
  const values = (items || []).map((item) => item[field] || item.style).filter(Boolean);
  return ['all', ...new Set(values)];
}

export function getDisplayName(user, profile) {
  const pseudo = profile?.pseudo?.trim();
  if (pseudo) return pseudo;
  const raw = user?.username || '';
  const base = raw.includes('@') ? raw.split('@')[0] : raw;
  if (!base) return 'NOX';
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export function mapBookingStatusLabel(status, language = 'fr') {
  const fr = language === 'fr';
  switch (String(status || '').toUpperCase()) {
    case 'PENDING':
      return fr ? 'En attente' : 'Pending';
    case 'ACCEPTED':
      return fr ? 'Confirmé' : 'Confirmed';
    case 'REJECTED':
      return fr ? 'Refusé' : 'Rejected';
    case 'CANCELLED':
      return fr ? 'Annulé' : 'Cancelled';
    default:
      return status || (fr ? 'Inconnu' : 'Unknown');
  }
}
