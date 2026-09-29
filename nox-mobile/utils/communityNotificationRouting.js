/**
 * Deep links notifications feed → écran NOX selon profil actif.
 * Fil social (timeline) = Communauté uniquement.
 * DJ / Orga / Lieu : réponses via mur perso (`ownWall`) ; liste notifs sinon.
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

  // Profils pro : ouvrir le post (+ commentaires si réponse) sur leur mur
  if (['DJ', 'BOOKER', 'VENUE', 'PRESTATAIRE'].includes(activeProfileType) && postId) {
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
