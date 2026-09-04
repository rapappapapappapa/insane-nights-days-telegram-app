/**
 * Deep links notifications feed → écran NOX selon profil actif.
 * DJ : pas de fil sur l'accueil — les notifs feed mènent à l'écran Notifications.
 */

export function getFeedHomeScreen(activeProfileType) {
  if (activeProfileType === 'COMMUNITY') return 'communityHome';
  if (activeProfileType === 'DJ') return 'notifications';
  return 'proHome';
}

export function resolveFeedNotificationNavigation(notif, activeProfileType) {
  const type = (notif?.type || '').toLowerCase();
  const home = getFeedHomeScreen(activeProfileType);
  const postId = notif?.post?.id || null;

  if (activeProfileType === 'DJ') {
    return { screen: 'notifications', params: {} };
  }

  if (!postId) {
    return { screen: home, params: {} };
  }

  const openComments = type === 'comment' || type === 'reply';

  return {
    screen: home,
    params: {
      highlightPostId: postId,
      feedTab: 'posts',
      openComments: openComments || undefined,
    },
  };
}
