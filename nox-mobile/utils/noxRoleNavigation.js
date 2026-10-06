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
      return 'bookerDashboard';
    case 'PRESTATAIRE':
      return 'prestataireDashboard';
    default:
      return 'splash';
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

/**
 * Rôle choisi à l’inscription. Survit aux navigate() qui oublient `nextScreen`
 * (garde email dans App.js, timeout login).
 */
let pendingPostAuthScreen = null;

export function rememberPostAuthScreen(nextScreen) {
  if (typeof nextScreen === 'string' && nextScreen.startsWith('register')) {
    pendingPostAuthScreen = nextScreen;
  }
}

export function peekPostAuthScreen() {
  return pendingPostAuthScreen;
}

export function clearPostAuthScreen() {
  pendingPostAuthScreen = null;
}

function resolveChosenRoleScreen(nextScreen) {
  if (typeof nextScreen === 'string' && nextScreen.startsWith('register')) return nextScreen;
  if (typeof pendingPostAuthScreen === 'string' && pendingPostAuthScreen.startsWith('register')) {
    return pendingPostAuthScreen;
  }
  return null;
}

/**
 * Écran après login/register si pas de `nextScreen` explicite.
 * Sans profil actif : le formulaire du rôle déjà choisi, sinon le choix de rôle.
 * Pas le splash (sinon « Continuer » boucle).
 */
export function getPostAuthScreen(activeProfileType, nextScreen) {
  if (activeProfileType) {
    clearPostAuthScreen();
    return getHomeScreenForProfile(activeProfileType);
  }
  return resolveChosenRoleScreen(nextScreen) || 'accountType';
}

/** Home réelle d’un compte déjà connecté (profil manquant → choix de rôle). */
export function getAuthenticatedLandingScreen(activeProfileType) {
  if (!activeProfileType) return 'accountType';
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

/** Après login/register : OTP si email non vérifié, sinon home ou formulaire du rôle. */
export function resolvePostAuthNavigation(user, nextScreen) {
  const chosen = resolveChosenRoleScreen(nextScreen);
  if (needsEmailVerification(user)) {
    return { screen: 'authVerifyEmail', params: chosen ? { nextScreen: chosen } : undefined };
  }
  return { screen: getPostAuthScreen(user?.activeProfileType, chosen), params: undefined };
}
