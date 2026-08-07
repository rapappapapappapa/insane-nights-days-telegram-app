import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/config';

/**
 * Charge les publications affichées sur le mur d'un profil (userId, djId ou bookerId).
 */
export function useProfileWall({ user, wallFilter, dispatchPostState, onAuthError, enabled = true }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [feedAvatarBust, setFeedAvatarBust] = useState(0);
  const mountedRef = useRef(true);

  const hasFilter =
    enabled &&
    !!(wallFilter?.userId || wallFilter?.djId || wallFilter?.bookerId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchWall = useCallback(
    async (isRefresh = false) => {
      if (!hasFilter) {
        setPosts([]);
        setTotal(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.getProfileWallPosts(user?.token || null, wallFilter, 30, 0);
        if (!mountedRef.current) return;

        if (response?.success && Array.isArray(response.feed)) {
          setPosts(response.feed);
          setTotal(response.total ?? response.feed.length);
          const likesCountState = {};
          response.feed.forEach((item) => {
            likesCountState[item.id] = item.likes || 0;
          });
          dispatchPostState?.({ type: 'SET_LIKES_STATE', likedPosts: {}, likesCount: likesCountState });
          if (isRefresh) setFeedAvatarBust((n) => n + 1);
        } else {
          setPosts([]);
          setTotal(0);
        }
      } catch (error) {
        if (!mountedRef.current) return;
        console.error('Erreur mur profil:', error);
        setPosts([]);
        setTotal(0);
        if (!(onAuthError && onAuthError(error))) {
          // silencieux dans le shell profil
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [
      hasFilter,
      user?.token,
      wallFilter?.userId,
      wallFilter?.djId,
      wallFilter?.bookerId,
      dispatchPostState,
      onAuthError,
    ],
  );

  useEffect(() => {
    fetchWall();
  }, [fetchWall]);

  return {
    posts,
    setPosts,
    loading,
    total,
    feedAvatarBust,
    fetchWall,
  };
}
