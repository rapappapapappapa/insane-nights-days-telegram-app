/** Reducer états likes / commentaires des posts feed. */
export const postStateReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LIKED_POST':
      return {
        ...state,
        likedPosts: { ...state.likedPosts, [action.postId]: action.liked },
      };
    case 'SET_LIKES_COUNT':
      return {
        ...state,
        postLikesCount: { ...state.postLikesCount, [action.postId]: action.count },
      };
    case 'SET_LIKES_STATE':
      return {
        ...state,
        likedPosts: action.likedPosts,
        postLikesCount: action.likesCount,
      };
    case 'SET_COMMENTS':
      return {
        ...state,
        postComments: { ...state.postComments, [action.postId]: action.comments },
      };
    case 'TOGGLE_COMMENTS':
      return {
        ...state,
        expandedComments: {
          ...state.expandedComments,
          [action.postId]: !state.expandedComments[action.postId],
        },
      };
    case 'EXPAND_COMMENTS':
      return {
        ...state,
        expandedComments: {
          ...state.expandedComments,
          [action.postId]: true,
        },
      };
    case 'SET_COMMENT_INPUT':
      return {
        ...state,
        commentInputs: { ...state.commentInputs, [action.postId]: action.text },
      };
    case 'CLEAR_COMMENT_INPUT':
      return {
        ...state,
        commentInputs: { ...state.commentInputs, [action.postId]: '' },
      };
    case 'SET_BROKEN_IMAGE':
      return {
        ...state,
        brokenPostImages: { ...state.brokenPostImages, [action.postId]: true },
      };
    default:
      return state;
  }
};

export const initialPostState = {
  likedPosts: {},
  postLikesCount: {},
  postComments: {},
  expandedComments: {},
  commentInputs: {},
  brokenPostImages: {},
};

export function formatFeedRelativeDate(dateString, language) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return language === 'fr' ? "À l'instant" : 'Just now';
  }
  if (diffMins < 60) {
    return language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return language === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return language === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
  }
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}
