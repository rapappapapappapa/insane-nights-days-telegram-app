import React, { useReducer } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { useToast } from '../../hooks/useToast';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import { useProfileWall } from '../../hooks/useProfileWall';
import { useFeedPostEngagement } from '../../hooks/useFeedPostEngagement';
import { useFeedReport } from '../../hooks/useFeedReport';
import { postStateReducer, initialPostState, formatFeedRelativeDate } from '../../utils/feedPageUtils';
import { NoxFeedPostCard, NoxButton } from '../nox';
import FeedReportModal from '../feed/FeedReportModal';
import EmptyState from '../EmptyState';
import Toast from '../Toast';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';

/**
 * Liste de publications pour l'onglet « Mur » d'un profil.
 * S'affiche à l'intérieur d'un ScrollView parent (pas de scroll imbriqué).
 *
 * @param {{ userId?: string, djId?: string, bookerId?: string }} wallFilter
 * @param {boolean} isOwnProfile — affiche CTA création si DJ/Booker
 * @param {boolean} enabled — false tant que l'onglet Mur n'est pas actif
 */
export default function ProfileWallStream({
  wallFilter,
  isOwnProfile = false,
  enabled = true,
  onTotalChange,
}) {
  const { user, handleTokenExpired } = useAuth();
  const { language } = useLanguage();
  const { navigate } = useNavigation();
  const { showConfirm } = useConfirm();
  const { showError, showSuccess, toast, hideToast } = useToast();
  const { refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications();
  const fr = language === 'fr';

  const [postState, dispatchPostState] = useReducer(postStateReducer, initialPostState);

  const handleTokenError = (error) => {
    if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
      handleTokenExpired?.();
      return true;
    }
    return false;
  };

  const { posts, setPosts, loading, total, feedAvatarBust } = useProfileWall({
    user,
    wallFilter,
    dispatchPostState,
    onAuthError: handleTokenError,
    enabled,
  });

  React.useEffect(() => {
    onTotalChange?.(total);
  }, [total, onTotalChange]);

  const feedAsList = posts.map((p) => ({ ...p, type: 'post' }));

  const {
    likedPosts,
    postLikesCount,
    postComments,
    expandedComments,
    commentInputs,
    brokenPostImages,
    dispatchPostState: dispatchEngagement,
    handleToggleLike,
    toggleComments,
    handleCreateComment,
  } = useFeedPostEngagement({
    user,
    language,
    feed: feedAsList,
    postState,
    dispatchPostState,
    showError,
    refreshFeedNotifications,
    onAuthError: handleTokenError,
  });

  const { reportModalVisible, reportReasons, reportPost, handleReportReason, closeReportModal } =
    useFeedReport({ user, language, showError, showSuccess });

  const formatDate = (dateString) => formatFeedRelativeDate(dateString, language);

  const canUserRepost =
    !!user?.token &&
    (user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER');

  const canCreatePost =
    isOwnProfile &&
    (user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER');

  const handleRepost = async (item) => {
    if (!canUserRepost) {
      showError(fr ? 'Réservé aux artistes et organisateurs.' : 'Artists and organizers only.');
      return;
    }
    const targetId = item.isRepost ? item.originalPost?.id : item.id;
    if (!targetId) return;

    try {
      const response = await api.repostFeedPost(user.token, targetId);
      if (response?.success && response.post) {
        setPosts((prev) => {
          const marked = prev.map((entry) => {
            const entryRootId = entry.isRepost ? entry.originalPost?.id : entry.id;
            if (entry.id === targetId || entryRootId === targetId) {
              return { ...entry, repostedByMe: true };
            }
            return entry;
          });
          return [response.post, ...marked.filter((entry) => entry.id !== response.post.id)];
        });
        showSuccess(fr ? 'Publication repostée sur ton fil.' : 'Post reposted to your feed.');
      } else {
        showError(response?.message || (fr ? 'Repost impossible.' : 'Could not repost.'));
      }
    } catch (e) {
      if (e?.status === 409) {
        showError(fr ? 'Tu as déjà reposté cette publication.' : 'You already reposted this post.');
        return;
      }
      if (handleTokenError(e)) return;
      showError(e?.message || (fr ? 'Erreur réseau.' : 'Network error.'));
    }
  };

  const navigateToPostProfile = (postItem, { original = false } = {}) => {
    const source = original && postItem.originalPost ? postItem.originalPost : postItem;
    const isDjPost = source.profileType === 'DJ';
    if (isDjPost && source.dj) {
      navigate('djProfile', { djId: source.dj.id, djUserId: source.dj.userId });
    } else if (!isDjPost && (source.booker?.id || source.bookerId)) {
      navigate('bookerProfile', { bookerId: source.booker?.id || source.bookerId });
    }
  };

  const handleDeletePost = (postId) => {
    if (!user?.token) return;
    showConfirm(
      fr ? 'Supprimer la publication ?' : 'Delete post?',
      fr ? 'Cette action est définitive.' : 'This cannot be undone.',
      [
        { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
        {
          text: fr ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteFeedPost(user.token, postId);
              if (response?.success) {
                setPosts((prev) => prev.filter((item) => item.id !== postId));
                showSuccess(fr ? 'Publication supprimée.' : 'Post deleted.');
              } else {
                showError(response?.message || (fr ? 'Erreur suppression.' : 'Delete failed.'));
              }
            } catch (e) {
              showError(e?.message || (fr ? 'Erreur réseau.' : 'Network error.'));
            }
          },
        },
      ],
    );
  };

  const renderPostCard = (item) => {
    const isDj = item.profileType === 'DJ';
    const profileName = isDj
      ? item.dj?.artistName
      : item.booker?.name || item.author?.username;
    const profileLocation = isDj ? item.dj?.city : null;
    const isAuthor = user?.id && item.author?.id === user.id;
    const baseProfileImg = isDj
      ? normalizeMediaUrl(item.dj?.profileImage)
      : normalizeMediaUrl(item.booker?.profileImage);
    const profileImage =
      isAuthor && baseProfileImg
        ? `${String(baseProfileImg).split('?')[0]}?cb=${feedAvatarBust}`
        : baseProfileImg;
    const imageUri = normalizeMediaUrl(item.imageUrl || item.image);
    const isBrokenImage = !!brokenPostImages[item.id];
    const rootAuthorId = item.isRepost ? item.originalPost?.author?.id : item.author?.id;
    const canRepost =
      canUserRepost && !item.repostedByMe && rootAuthorId && rootAuthorId !== user?.id;
    const displayImageUri =
      item.isRepost && item.originalPost
        ? normalizeMediaUrl(item.originalPost.imageUrl)
        : imageUri;

    return (
      <NoxFeedPostCard
        key={`wall-post-${item.id}`}
        item={item}
        language={language}
        profileName={profileName}
        profileLocation={profileLocation}
        profileImage={profileImage}
        imageUri={displayImageUri}
        isBrokenImage={isBrokenImage}
        isDj={isDj}
        isAuthor={isAuthor}
        liked={!!likedPosts[item.id]}
        likesCount={
          postLikesCount[item.id] !== undefined ? postLikesCount[item.id] : item.likes || 0
        }
        commentsExpanded={!!expandedComments[item.id]}
        comments={postComments[item.id]}
        commentsCount={
          postComments[item.id] ? postComments[item.id].length : item.commentsCount ?? 0
        }
        commentInput={commentInputs[item.id]}
        canComment={!!user?.token}
        canRepost={canRepost}
        repostedByMe={!!item.repostedByMe}
        formatDate={formatDate}
        onPressProfile={() => navigateToPostProfile(item)}
        onPressOriginalProfile={
          item.isRepost ? () => navigateToPostProfile(item, { original: true }) : undefined
        }
        onToggleLike={() => handleToggleLike(item.id)}
        onToggleComments={() => toggleComments(item.id)}
        onRepost={() => handleRepost(item)}
        onReport={() => reportPost(item.id)}
        onDelete={() => handleDeletePost(item.id)}
        onImageError={() => {
          dispatchEngagement({ type: 'SET_BROKEN_IMAGE', postId: item.id });
        }}
        onCommentInputChange={(text) => {
          dispatchEngagement({ type: 'SET_COMMENT_INPUT', postId: item.id, text });
        }}
        onSendComment={() => handleCreateComment(item.id)}
      />
    );
  };

  if (!wallFilter?.userId && !wallFilter?.djId && !wallFilter?.bookerId) {
    return (
      <View style={styles.block}>
        <EmptyState
          icon="lock-closed-outline"
          title={fr ? 'Mur privé' : 'Private wall'}
          message={
            fr
              ? 'Les publications ne sont pas affichées sur le profil communauté des autres membres.'
              : 'Posts are not shown on other members’ community profiles.'
          }
        />
      </View>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.block}>
        <EmptyState
          icon="newspaper-outline"
          title={fr ? 'Aucune publication' : 'No posts yet'}
          message={
            isOwnProfile
              ? fr
                ? canCreatePost
                  ? 'Publie depuis ton profil artiste ou organisateur — tes posts apparaîtront ici.'
                  : 'Passe sur ton profil DJ ou Organisateur pour publier sur le fil.'
                : 'You have not posted yet. Switch to your artist or organizer profile to publish.'
              : fr
                ? 'Ce profil n’a pas encore de publication.'
                : 'This profile has no posts yet.'
          }
        />
        {canCreatePost ? (
          <NoxButton
            label={fr ? 'Nouvelle publication' : 'New post'}
            onPress={() => navigate('createFeedPost')}
            style={styles.createBtn}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      {canCreatePost ? (
        <NoxButton
          label={fr ? 'Nouvelle publication' : 'New post'}
          variant="secondary"
          onPress={() => navigate('createFeedPost')}
          style={styles.createBtnTop}
        />
      ) : null}
      {posts.map((item) => renderPostCard(item))}

      <FeedReportModal
        visible={reportModalVisible}
        language={language}
        reportReasons={reportReasons}
        onSelectReason={handleReportReason}
        onClose={closeReportModal}
      />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingBottom: Spacing.lg },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', minHeight: 120, paddingVertical: Spacing.xxl },
  createBtn: { marginTop: Spacing.lg },
  createBtnTop: { marginBottom: Spacing.lg },
});
