/**
 * Deep links notifications feed → écran NOX selon profil actif.
 */

export function getFeedHomeScreen(activeProfileType) {
  return activeProfileType === 'COMMUNITY' ? 'communityHome' : 'proHome';
}

export function resolveFeedNotificationNavigation(notif, activeProfileType) {
  const type = (notif?.type || '').toLowerCase();
  const home = getFeedHomeScreen(activeProfileType);
  const postId = notif?.post?.id || null;

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
