/**
 * Données mockées du bloc COMMUNAUTÉ (UI-first, à remplacer par le backend).
 */

export const GENRES = [
  'Techno',
  'Experimental',
  'Trap',
  'Hard Techno',
  'House',
  'Minimal',
  'Trance',
  'Industrial',
  'Ambient',
  'Drum & Bass',
  'Electro',
  'Downtempo',
];

export const CITIES = ['Lyon', 'Paris', 'Berlin', 'Bruxelles'];

/** @deprecated Onboarding charge les vrais DJ via api.getDjs() */
export const ARTISTS = [];

/** @deprecated Onboarding charge les vrais lieux via api.getVenues() */
export const VENUES = [];

export const EVENT_TYPES = [
  'Raves',
  'Open Air',
  'Warehouse',
  'Club Nights',
  'Festivals',
  'Afters',
  'Day Parties',
  'Boat Parties',
];

export const FEATURED_EVENT = {
  id: 'void',
  name: 'VOID WAREHOUSE',
  date: '24 mai 2024',
  time: '23:00',
  city: 'Lyon',
};

export const UPCOMING = [
  { id: 'u1', name: 'Rave Immersion', date: '08 juin', city: 'Lyon' },
  { id: 'u2', name: 'Night Shift', date: '15 juin', city: 'Paris' },
  { id: 'u3', name: 'Underground', date: '22 juin', city: 'Berlin' },
  { id: 'u4', name: 'Warehouse X', date: '29 juin', city: 'Lyon' },
];

export const SUGGESTED_DJS = [
  { id: 'd1', name: 'Ezekiel', genre: 'Techno' },
  { id: 'd2', name: 'Keev', genre: 'Hard Techno' },
  { id: 'd3', name: 'Madd', genre: 'Industrial' },
  { id: 'd4', name: 'Lina', genre: 'House' },
];

export const DISCOVER_EVENTS = [
  { id: 'de1', name: "Nom de l'événement", date: '08 juin', city: 'Lyon', price: '19€' },
  { id: 'de2', name: "Nom de l'événement", date: '15 juin', city: 'Paris', price: '25€' },
  { id: 'de3', name: "Nom de l'événement", date: '22 juin', city: 'Berlin', price: '19€' },
  { id: 'de4', name: "Nom de l'événement", date: '29 juin', city: 'Lyon', price: '30€' },
];

export const DISCOVER_DJS = [
  { id: 'dj1', name: 'Nom du DJ', city: 'Lyon', genre: 'Techno', rating: 4.8 },
  { id: 'dj2', name: 'Nom du DJ', city: 'Paris', genre: 'Hard Techno', rating: 4.6 },
  { id: 'dj3', name: 'Nom du DJ', city: 'Berlin', genre: 'House', rating: 4.7 },
  { id: 'dj4', name: 'Nom du DJ', city: 'Lyon', genre: 'Industrial', rating: 4.5 },
];

export const EVENT_DETAIL = {
  name: 'VOID WAREHOUSE',
  date: '24 mai 2024',
  subtitle: 'GENERAL ADMISSION',
  infos: {
    nom: 'VOID WAREHOUSE',
    horaires: '23h00 - 04h00',
    participants: '900',
    style: 'Techno & Warehouses',
    lieu: 'Le Sucre - Lyon',
  },
  description:
    'Une nuit immersive dédiée aux sonorités techno les plus profondes, dans un lieu emblématique de la scène lyonnaise.',
  lineup: [
    { name: 'Ezekiel', time: '23h30 → 23h30' },
    { name: 'Keev', time: '23h30 → 01h00' },
    { name: 'Madd', time: '01h00 → 03h00' },
  ],
  organizer: { name: 'VOID Collective', rating: 4.5, events: 12 },
  venue: { name: 'Le Sucre', events: 110 },
};
