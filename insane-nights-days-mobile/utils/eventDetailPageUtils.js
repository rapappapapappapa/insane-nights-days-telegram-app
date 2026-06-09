export const API_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isTicketTierSelectable(t) {
  if (!t) return false;
  if (t.maxSold == null || t.maxSold === '') return true;
  if (t.remaining == null || t.remaining === undefined) return true;
  return Number(t.remaining) > 0;
}

/** Données de repli hors-ligne (dev / maquette). */
export const EVENT_DETAIL_MOCK_EVENTS = [
  {
    id: '1',
    title: 'Insane Night - Soirée Electro',
    date: '15 Janvier 2024',
    time: '22:00',
    location: 'Club Insane, Paris',
    price: 25,
    capacity: 200,
    sold: 45,
    genre: 'Electro',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    djs: ['DJ Neon', 'Mixmaster Nova'],
    description: 'Une soirée électro explosive avec les meilleurs DJs de la scène underground',
  },
  {
    id: '2',
    title: 'Bass Revolution - Drum & Bass',
    date: '20 Janvier 2024',
    time: '21:00',
    location: 'Warehouse Underground, Lyon',
    price: 30,
    capacity: 150,
    sold: 78,
    genre: 'Drum & Bass',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['Bass Storm', 'DJ Cyber'],
    description: 'Une révolution sonore avec les meilleurs artistes drum & bass',
  },
  {
    id: '3',
    title: 'Techno Underground Session',
    date: '25 Janvier 2024',
    time: '23:00',
    location: 'Le Bunker, Marseille',
    price: 20,
    capacity: 300,
    sold: 120,
    genre: 'Techno',
    image: 'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=400&h=300&fit=crop',
    djs: ['Techno Master', 'DJ Neon'],
    description: 'Session techno underground dans un lieu unique',
  },
];
