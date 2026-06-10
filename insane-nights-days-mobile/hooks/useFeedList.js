import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/config';

/**
 * Chargement du fil (pour tous / abonnements).
 * @param onAuthError optionnel — retourne true si l'erreur (token expiré) est gérée par l'appelant.
 */
export function useFeedList({ user, feedTab = 'all', dispatchPostState, onAuthError }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedError, setFeedError] = useState(null);
  const [feedAvatarBust, setFeedAvatarBust] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchFeed = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setFeedError(null);

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

        if (!mountedRef.current) return;
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
        if (!mountedRef.current) return;
        console.error('Erreur récupération feed:', error);
        setFeed([]);
        if (!(onAuthError && onAuthError(error))) {
          setFeedError(error?.message || null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [feedTab, user?.token, dispatchPostState, onAuthError]
  );

  return {
    feed,
    setFeed,
    loading,
    refreshing,
    feedError,
    feedAvatarBust,
    fetchFeed,
  };
}
