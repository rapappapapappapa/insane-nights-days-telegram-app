/**
 * Résolution des clés d'écran legacy → NOX (Phase D).
 * @see docs/mobile/PLAN_MIGRATION_NOX_LEGACY.md
 */

import { getHomeScreenForProfile } from './noxRoleNavigation';
import { getDiscoverScreen } from './noxNavigation';

/** Alias permanents : toute navigation vers ces clés est réécrite. */
export const LEGACY_SCREEN_ALIASES = {
  welcome: 'proHome',
  venueDashboard: 'lieuxDashboard',
};

export function resolveLegacyScreen(page, { activeProfileType, isAuthenticated } = {}) {
  if (!page) return page;

  if (LEGACY_SCREEN_ALIASES[page]) {
    return LEGACY_SCREEN_ALIASES[page];
  }

  if (page === 'home') {
    return isAuthenticated ? getHomeScreenForProfile(activeProfileType) : 'splash';
  }

  if (page === 'feed') {
    if (activeProfileType === 'COMMUNITY') return 'communityHome';
    if (isAuthenticated) return getHomeScreenForProfile(activeProfileType);
    return 'splash';
  }

  if (page === 'events') {
    if (activeProfileType === 'COMMUNITY') return 'communityDiscover';
    if (activeProfileType === 'VENUE') return 'lieuxEvents';
  }

  return page;
}

export function resolveLegacyRouteParams(page, params, { activeProfileType } = {}) {
  const base = params && typeof params === 'object' ? { ...params } : undefined;

  if (page === 'feed' && activeProfileType === 'COMMUNITY') {
    return { ...base, feedTab: base?.feedTab || 'posts' };
  }

  if (page === 'events' && activeProfileType === 'COMMUNITY' && base?.tab) {
    return { tab: base.tab };
  }

  return base;
}

/** Applique alias + résolution contextuelle (profil, auth). */
export function resolveNavigationTarget(page, params, context = {}) {
  const resolvedPage = resolveLegacyScreen(page, context);
  const resolvedParams =
    page === resolvedPage
      ? resolveLegacyRouteParams(page, params, context)
      : resolveLegacyRouteParams(resolvedPage, params, context) ??
        resolveLegacyRouteParams(page, params, context);
  return { page: resolvedPage, params: resolvedParams };
}
