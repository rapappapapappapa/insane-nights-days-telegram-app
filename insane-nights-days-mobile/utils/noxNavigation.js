/**
 * Routage conditionnel NOX vs legacy selon le profil actif.
 * @see docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md
 */

import { getHomeScreenForProfile } from './noxRoleNavigation';

export function getDiscoverScreen(activeProfileType) {
  if (activeProfileType === 'COMMUNITY') return 'communityDiscover';
  if (activeProfileType === 'VENUE') return 'lieuxEvents';
  return 'events';
}

/** Écran de présentation événement (vue sociale / browse). */
export function getEventPreviewScreen(activeProfileType) {
  return activeProfileType === 'COMMUNITY' ? 'communityEventDetail' : 'eventDetail';
}

/** Flux achat billet — legacy jusqu'à EventCheckout NOX (Phase D). */
export function getEventPurchaseScreen() {
  return 'eventDetail';
}

export function openEventPreview(navigate, activeProfileType, eventId, extraParams = {}) {
  if (!eventId) return;
  navigate(getEventPreviewScreen(activeProfileType), { eventId, ...extraParams });
}

export function openDiscover(navigate, activeProfileType, params = {}) {
  navigate(getDiscoverScreen(activeProfileType), params);
}

/** Home du profil actif (remplace les `navigate('welcome')` legacy). */
export function navigateToHome(navigate, activeProfileType) {
  navigate(getHomeScreenForProfile(activeProfileType));
}
