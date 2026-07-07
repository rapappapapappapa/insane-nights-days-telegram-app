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
      return 'welcome';
  }
}

export function getProfileScreenForProfile(activeProfileType) {
  switch (activeProfileType) {
    case 'VENUE':
      return 'lieuxProfil';
    default:
      return 'profile';
  }
}

/** Écrans avec barre basse NOX (masque la nav NX radiale). */
export const NOX_THEMED_SCREENS = new Set([
  'communityHome',
  'communityDiscover',
  'communityEventDetail',
  'communityOnboarding',
  'lieuxDashboard',
  'lieuxProfil',
  'lieuxAvailability',
  'lieuxMedia',
  'lieuxRequestDetail',
]);

export function isHomeScreenForProfile(activeProfileType, currentPage) {
  return currentPage === getHomeScreenForProfile(activeProfileType);
}

export function isProfileScreenForProfile(activeProfileType, currentPage) {
  return currentPage === getProfileScreenForProfile(activeProfileType);
}
