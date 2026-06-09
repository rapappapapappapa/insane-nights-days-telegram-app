import { useState, useCallback } from 'react';
import { api } from '../api/config';

/**
 * Chargement du fil (pour tous / abonnements).
 */
export function useFeedList({ user, feedTab, dispatchPostState }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedAvatarBust, setFeedAvatarBust] = useState(0);

  const fetchFeed = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const isFollowing = feedTab === 'following';

      try {
        let response;
        if (isFollowing && user?.token) {
          response = await api.getFeedFollowing(user.token, 50, 0);
        } else if (isFollowing && !user?.token) {
          setFeed([]);
          setLoading(false);
          setRefreshing(false);
          return;
        } else {
          response = await api.getFeed(50, 0);
        }

        if (response && response.success && Array.isArray(response.feed)) {
          setFeed(response.feed);
          const likesCountState = {};
          response.feed.forEach((item) => {
            if (item.type === 'post') {
              likesCountState[item.id] = item.likes || 0;
            }
          });
          dispatchPostState({ type: 'SET_LIKES_STATE', likedPosts: {}, likesCount: likesCountState });
          if (isRefresh) setFeedAvatarBust((n) => n + 1);
        } else {
          setFeed([]);
        }
      } catch (error) {
        console.error('Erreur récupération feed:', error);
        setFeed([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [feedTab, user?.token, dispatchPostState]
  );

  return {
    feed,
    loading,
    refreshing,
    feedAvatarBust,
    fetchFeed,
  };
}
