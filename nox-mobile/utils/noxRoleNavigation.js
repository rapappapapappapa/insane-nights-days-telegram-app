/**
 * Routage NOX selon le profil actif — home, profil, écrans à thème dédié.
 */

export function getHomeScreenForProfile(activeProfileType) {
  switch (activeProfileType) {
    case 'COMMUNITY':
      return 'communityHome';
    case 'VENUE':
      return 'lieuxDashboard';
    case 'DJ':
      return 'djDashboard';
    case 'BOOKER':
    case 'PRESTATAIRE':
      return 'proHome';
    default:
      return 'proHome';
  }
}

export function getProfileScreenForProfile(activeProfileType) {
  switch (activeProfileType) {
    case 'VENUE':
      return 'lieuxProfil';
    case 'COMMUNITY':
      return 'communityMyProfile';
    default:
      return 'profile';
  }
}

/** Écrans Lieux NOX (barre basse Accueil / + / Profil). */
export const LIEUX_SCREENS = new Set([
  'lieuxDashboard',
  'lieuxProfil',
  'lieuxAvailability',
  'lieuxMedia',
  'lieuxRequestDetail',
  'lieuxEvents',
  'lieuxEventDetail',
  'lieuxSettings',
  'lieuxScanner',
  'lieuxNotifications',
  'lieuxFeed',
  'lieuxStaff',
  'lieuxDemandes',
]);

/** Auth / onboarding — pas de NX ni bouton menu drawer. */
export const AUTH_FLOW_PAGES = new Set([
  'splash',
  'onboarding',
  'login',
  'authVerifyEmail',
  'accountType',
  'registerCommunity',
  'registerDj',
  'registerBooker',
  'registerVenue',
  'registerPrestataire',
  'communityOnboarding',
]);

/** Modales / one-shot — bouton menu drawer en secours. */
export const TRANSIENT_PAGES = new Set([
  'communityPushOptIn',
  'purchaseSuccess',
  'rateEvent',
  'tutorial',
]);

/** Wizards — retour écran + bouton menu, pas de NX (arc gênant). */
export const WIZARD_PAGES = new Set(['bookerEventDashboard', 'createFeedPost']);

/** Plein écran — retour header + bouton menu, pas de NX. */
export const IMMERSIVE_PAGES = new Set(['lieuxBookingChat', 'scanTicket']);

/**
 * Pages sans bouton NX flottant (auth, wizards, plein écran).
 * @deprecated Préférer shouldShowRadialNav — export conservé pour compat.
 */
export const HIDE_RADIAL_NAV_PAGES = new Set([
  ...AUTH_FLOW_PAGES,
  ...TRANSIENT_PAGES,
  ...WIZARD_PAGES,
  ...IMMERSIVE_PAGES,
]);

/** Alias explicite pour la nav radiale. */
export const RADIAL_NAV_HIDDEN_PAGES = HIDE_RADIAL_NAV_PAGES;

export function shouldShowRadialNav(currentPage, isAuthenticated) {
  if (!isAuthenticated) return false;
  return !RADIAL_NAV_HIDDEN_PAGES.has(currentPage);
}

/** Bouton MENU drawer (coin bas-droit) quand NX est masqué — utilisateurs « fainéants ». */
export function shouldShowDrawerMenuButton(currentPage, isAuthenticated) {
  if (!isAuthenticated) return true;
  if (AUTH_FLOW_PAGES.has(currentPage)) return false;
  return RADIAL_NAV_HIDDEN_PAGES.has(currentPage);
}

/** Écrans avec barre basse NOX thématique (Communauté + Lieux). */
export const NOX_THEMED_SCREENS = new Set([
  'communityHome',
  'communityDiscover',
  'communityEventDetail',
  'communityOnboarding',
  'communityMyProfile',
  'communityPushOptIn',
  'proHome',
  'djDashboard',
  'bookerDashboard',
  'prestataireDashboard',
  ...LIEUX_SCREENS,
]);

export function isHomeScreenForProfile(activeProfileType, currentPage) {
  return currentPage === getHomeScreenForProfile(activeProfileType);
}

export function isProfileScreenForProfile(activeProfileType, currentPage) {
  return currentPage === getProfileScreenForProfile(activeProfileType);
}

/** Dashboard pro (secondaire) — accessible via drawer / NX, pas page d’accueil par défaut. */
export function getProDashboardScreen(activeProfileType) {
  switch (activeProfileType) {
    case 'DJ':
      return 'djDashboard';
    case 'BOOKER':
      return 'bookerDashboard';
    case 'PRESTATAIRE':
      return 'prestataireDashboard';
    case 'VENUE':
      return 'lieuxDashboard';
    default:
      return null;
  }
}

/** Écran après login/register si pas de `nextScreen` explicite. */
export function getPostAuthScreen(activeProfileType, nextScreen) {
  if (nextScreen) return nextScreen;
  return getHomeScreenForProfile(activeProfileType);
}

/**
 * Skip volontaire de la vérification email (session en cours uniquement).
 * Le compte reste « non vérifié » ; l'OTP sera reproposé à la prochaine session
 * et reste accessible depuis le profil.
 */
let emailVerificationSkipped = false;

export function skipEmailVerificationForSession() {
  emailVerificationSkipped = true;
}

export function resetEmailVerificationSkip() {
  emailVerificationSkipped = false;
}

export function needsEmailVerification(user) {
  if (emailVerificationSkipped) return false;
  return !!user?.isAuthenticated && user?.emailVerified === false;
}

/** Après login/register : OTP si email non vérifié, sinon home ou nextScreen. */
export function resolvePostAuthNavigation(user, nextScreen) {
  if (needsEmailVerification(user)) {
    return { screen: 'authVerifyEmail', params: { nextScreen: nextScreen || null } };
  }
  return { screen: getPostAuthScreen(user?.activeProfileType, nextScreen), params: undefined };
}
