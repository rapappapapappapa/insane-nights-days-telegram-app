/**
 * Parcours inscription : choix de rôle → compte (étape 1) → profil métier (étape 2).
 */

export const REGISTER_NEXT_SCREENS = {
  registerCommunity: 'community',
  registerDj: 'dj',
  registerBooker: 'booker',
  registerVenue: 'venue',
  registerPrestataire: 'prestataire',
};

const ROLE_COPY = {
  community: {
    fr: { label: 'Communauté', accountTitle: 'Compte Communauté', profileTitle: 'Profil Communauté' },
    en: { label: 'Community', accountTitle: 'Community account', profileTitle: 'Community profile' },
  },
  dj: {
    fr: { label: 'Artiste', accountTitle: 'Compte Artiste', profileTitle: 'Profil artiste' },
    en: { label: 'Artist', accountTitle: 'Artist account', profileTitle: 'Artist profile' },
  },
  booker: {
    fr: { label: 'Organisateur', accountTitle: 'Compte Organisateur', profileTitle: 'Profil organisateur' },
    en: { label: 'Organizer', accountTitle: 'Organizer account', profileTitle: 'Organizer profile' },
  },
  venue: {
    fr: { label: 'Lieu', accountTitle: 'Compte Lieu', profileTitle: 'Profil lieu' },
    en: { label: 'Venue', accountTitle: 'Venue account', profileTitle: 'Venue profile' },
  },
  prestataire: {
    fr: { label: 'Prestataire', accountTitle: 'Compte Prestataire', profileTitle: 'Profil prestataire' },
    en: { label: 'Provider', accountTitle: 'Provider account', profileTitle: 'Provider profile' },
  },
};

export function roleKeyFromNextScreen(nextScreen) {
  if (!nextScreen) return null;
  return REGISTER_NEXT_SCREENS[nextScreen] || null;
}

export function getRegisterRoleCopy(nextScreen, language = 'fr') {
  const key = roleKeyFromNextScreen(nextScreen);
  if (!key) return null;
  const lang = language === 'fr' ? 'fr' : 'en';
  return ROLE_COPY[key]?.[lang] || null;
}

/** ISO / Date → jj/mm/aaaa pour les APIs profil. */
export function formatBirthDateFr(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
