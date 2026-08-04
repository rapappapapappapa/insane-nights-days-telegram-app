/**
 * Données mockées du bloc LIEUX (UI-first, à remplacer par le backend).
 */

export const VENUE = {
  name: 'MacBar',
  type: 'Club',
  city: 'Lyon, France',
  greetingName: 'Le Sucre',
  capacity: 1000,
  surface: 1500,
  soundSystem: 'Void Acoustics',
  genres: ['Techno', 'Hard Techno', 'Industrial', 'House'],
  description:
    'Club emblématique de Lyon, open-minded, dédié aux musiques électroniques.',
  pendingRequests: 2,
};

export const UPCOMING_EVENTS = [
  { id: 'e1', name: "Nom de l'évènement", date: '08 juin 2026', city: 'Lyon', genre: 'Techno' },
  { id: 'e2', name: "Nom de l'évènement", date: '15 juin 2026', city: 'Paris', genre: 'House' },
  { id: 'e3', name: "Nom de l'évènement", date: '14 juillet 2026', city: 'Lyon', genre: 'Hard Techno' },
];

export const VENUE_NEXT_EVENTS = [
  { id: 'n1', name: 'Night Shift', date: '26 juin 2026', city: 'Lyon' },
  { id: 'n2', name: 'Wehrehouse', date: '12 juin 2026', city: 'Lyon' },
];

export const AVAILABILITY_EVENTS = [
  {
    id: 'a1',
    name: 'Rave Immersion',
    date: '13 juin 2026',
    city: 'Lyon',
    genre: 'Techno',
    budget: '800€',
  },
  {
    id: 'a2',
    name: 'Rave Immersion',
    date: '13 juin 2026',
    city: 'Lyon',
    genre: 'Techno',
    budget: '800€',
  },
];

export const COLLAB_REQUEST = {
  organizer: 'VICO COLLECTIVE',
  eventDate: '08 juin 2026',
  sentDate: '22/06',
  status: 'En attente',
  requestedDate: '22 juin 2026',
  format: 'Night Club',
  capacity: '800 personnes',
  budget: '1800€',
  ticketing: '70% orga - 30% lieu',
  setup: '12:00 - 18:00',
  teardown: '06:00 - 12:00',
  message: 'Nous aimerions créer une soirée immersive et qualitative.',
};

/** Jours du calendrier Disponibilités (Juin 2026) avec statut. */
export const AVAILABILITY_STATUS = {
  available: '#10b981',
  booked: '#4DA3FF',
  pending: '#f59e0b',
  off: 'rgba(255,255,255,0.35)',
};
