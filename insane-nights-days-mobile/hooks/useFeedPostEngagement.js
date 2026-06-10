import { useEffect, useRef } from 'react';
import { api } from '../api/config';

/**
 * Likes et commentaires sur les posts du feed.
 * @param onAuthError optionnel — retourne true si l'erreur (token expiré) est gérée par l'appelant.
 */
export function useFeedPostEngagement({
  user,
  language,
  feed,
  postState,
  dispatchPostState,
  showError,
  refreshFeedNotifications,
  onAuthError,
}) {
  const toggledLikeRef = useRef({});
  const { likedPosts, postLikesCount, postComments, expandedComments, commentInputs, brokenPostImages } =
    postState;

  useEffect(() => {
    if (!user?.token || feed.length === 0) return;

    const checkLikes = async () => {
      const postIds = feed.filter((item) => item.type === 'post').map((item) => item.id);
      const likesState = {};
      const likesCountState = {};

      feed.forEach((item) => {
        if (item.type === 'post') {
          likesCountState[item.id] = item.likes || 0;
        }
      });

      for (const postId of postIds) {
        try {
          const response = await api.checkPostLiked(user.token, postId);
          if (response?.success) {
            likesState[postId] = response.liked;
          }
        } catch (error) {
          console.error(`Erreur vérification like pour post ${postId}:`, error);
          if (onAuthError && onAuthError(error)) break;
        }
      }

      const merged = { ...likesState };
      const now = Date.now();
      for (const [id, { liked, at }] of Object.entries(toggledLikeRef.current)) {
        if (now - at < 5000) merged[id] = liked;
      }
      dispatchPostState({ type: 'SET_LIKES_STATE', likedPosts: merged, likesCount: likesCountState });
    };

    checkLikes();
  }, [feed, user?.token, dispatchPostState]);

  const handleToggleLike = async (postId) => {
    if (!user?.token) {
      showError(
        language === 'fr' ? 'Vous devez être connecté pour liker un post' : 'You must be logged in to like a post'
      );
      return;
    }

    try {
      const response = await api.toggleLikePost(user.token, postId);
      if (response?.success) {
        toggledLikeRef.current[postId] = { liked: response.liked, at: Date.now() };
        dispatchPostState({ type: 'SET_LIKED_POST', postId, liked: response.liked });
        dispatchPostState({ type: 'SET_LIKES_COUNT', postId, count: response.likesCount });
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur like/unlike:', error);
      if (onAuthError && onAuthError(error)) return;
      showError(error.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred'));
    }
  };

  const loadComments = async (postId) => {
    try {
      const response = await api.getPostComments(postId, 50, 0);
      if (response?.success) {
        dispatchPostState({ type: 'SET_COMMENTS', postId, comments: response.comments || [] });
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    }
  };

  const toggleComments = (postId) => {
    const isExpanded = expandedComments[postId];
    dispatchPostState({ type: 'TOGGLE_COMMENTS', postId });
    if (!isExpanded && !postComments[postId]) {
      loadComments(postId);
    }
  };

  const handleCreateComment = async (postId) => {
    if (!user?.token) {
      showError(
        language === 'fr' ? 'Vous devez être connecté pour commenter' : 'You must be logged in to comment'
      );
      return;
    }

    const content = commentInputs[postId];
    if (!content?.trim()) return;

    try {
      const response = await api.createComment(user.token, postId, content);
      if (response?.success) {
        dispatchPostState({
          type: 'SET_COMMENTS',
          postId,
          comments: [...(postComments[postId] || []), response.comment],
        });
        dispatchPostState({ type: 'CLEAR_COMMENT_INPUT', postId });
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur création commentaire:', error);
      if (onAuthError && onAuthError(error)) return;
      showError(error.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred'));
    }
  };

  return {
    likedPosts,
    postLikesCount,
    postComments,
    expandedComments,
    commentInputs,
    brokenPostImages,
    dispatchPostState,
    handleToggleLike,
    toggleComments,
    handleCreateComment,
  };
}
