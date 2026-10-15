/**
 * Deep links notifications feed → écran NOX selon profil actif.
 * Fil social (timeline) = Communauté uniquement.
 * DJ / Orga / Lieu : réponses via mur perso (`ownWall`) ; PRESTATAIRE → liste notifs.
 */

export function getFeedHomeScreen(activeProfileType) {
  if (activeProfileType === 'COMMUNITY') return 'communityHome';
  return 'notifications';
}

export function resolveFeedNotificationNavigation(notif, activeProfileType) {
  const type = (notif?.type || '').toLowerCase();
  const postId = notif?.post?.id || null;
  const openComments = type === 'comment' || type === 'reply';

  if (activeProfileType === 'COMMUNITY') {
    if (!postId) {
      return { screen: 'communityHome', params: {} };
    }
    return {
      screen: 'communityHome',
      params: {
        highlightPostId: postId,
        feedTab: 'posts',
        openComments: openComments || undefined,
      },
    };
  }

  // Profils pro avec mur (DJ / Orga / Lieu) — PRESTATAIRE n’a pas ownWall
  if (['DJ', 'BOOKER', 'VENUE'].includes(activeProfileType) && postId) {
    return {
      screen: 'ownWall',
      params: {
        highlightPostId: postId,
        openComments: openComments || undefined,
      },
    };
  }

  return { screen: 'notifications', params: {} };
}
