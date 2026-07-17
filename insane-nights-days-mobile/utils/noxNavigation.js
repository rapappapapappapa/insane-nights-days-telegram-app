/**
 * Routage conditionnel NOX vs legacy selon le profil actif.
 * @see docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md
 */

export function getDiscoverScreen(activeProfileType) {
  return activeProfileType === 'COMMUNITY' ? 'communityDiscover' : 'events';
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
