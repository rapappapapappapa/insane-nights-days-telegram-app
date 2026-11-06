import React, { useReducer, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { NoxButton } from '../nox';
import FeedImmersivePost from './FeedImmersivePost';
import FeedCommentsSheet from './FeedCommentsSheet';
import FeedScrollMode from './FeedScrollMode';
import FeedReportModal from '../feed/FeedReportModal';
import EmptyState from '../EmptyState';
import Toast from '../Toast';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';

/**
 * Liste de publications pour l'onglet « Mur » d'un profil.
 * S'affiche à l'intérieur d'un ScrollView parent (pas de scroll imbriqué).
 *
 * @param {{ userId?: string, djId?: string, bookerId?: string, venueId?: string }} wallFilter
 * @param {boolean} isOwnProfile — affiche CTA création si DJ/Booker/Lieu
 * @param {boolean} enabled — false tant que l'onglet Mur n'est pas actif
 * @param {string|null} [highlightPostId] — surbrillance / ouverture commentaires (notifs)
 * @param {boolean} [openCommentsOnHighlight]
 */
export default function ProfileWallStream({
  wallFilter,
  isOwnProfile = false,
  enabled = true,
  onTotalChange,
  highlightPostId = null,
  openCommentsOnHighlight = false,
}) {
  const { user, handleTokenExpired } = useAuth();
  const insets = useSafeAreaInsets();
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
    commentInputs,
    brokenPostImages,
    dispatchPostState: dispatchEngagement,
    handleToggleLike,
    expandComments,
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

  const [commentsPostId, setCommentsPostId] = useState(null);
  const [scrollStartId, setScrollStartId] = useState(null);

  const openComments = (postId) => {
    expandComments(postId);
    setCommentsPostId(postId);
  };

  const highlightHandledRef = React.useRef(null);
  const [activeHighlightId, setActiveHighlightId] = React.useState(null);

  React.useEffect(() => {
    if (!highlightPostId || loading) return;
    if (highlightHandledRef.current === highlightPostId) return;
    const target = String(highlightPostId);
    const item = posts.find(
      (p) => String(p.id) === target || String(p.originalPost?.id || '') === target
    );
    if (!item) return;
    highlightHandledRef.current = highlightPostId;
    setActiveHighlightId(item.id);
    if (openCommentsOnHighlight) {
      openComments(item.id);
    }
    const clearTimer = setTimeout(() => setActiveHighlightId(null), 4000);
    return () => clearTimeout(clearTimer);
  }, [highlightPostId, openCommentsOnHighlight, loading, posts, expandComments]);

  React.useEffect(() => {
    highlightHandledRef.current = null;
  }, [highlightPostId]);

  const { reportModalVisible, reportReasons, reportPost, handleReportReason, closeReportModal } =
    useFeedReport({ user, language, showError, showSuccess });

  const formatDate = (dateString) => formatFeedRelativeDate(dateString, language);

  const canUserRepost =
    !!user?.token &&
    (user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER');

  const canCreatePost =
    isOwnProfile &&
    ['DJ', 'BOOKER', 'VENUE'].includes(user?.activeProfileType);

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
    if (source.profileType === 'DJ' && source.dj) {
      navigate('djProfile', { djId: source.dj.id, djUserId: source.dj.userId });
    } else if (source.profileType === 'VENUE' && (source.venue?.id || source.venueId)) {
      navigate('venueProfile', {
        venueId: source.venue?.id || source.venueId,
        venueName: source.venue?.venueName,
      });
    } else if (source.booker?.id || source.bookerId) {
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

  /** Sort du mode scroll avant une action qui ouvre une autre modale ou change d’écran. */
  const leavingScroll = (action) => () => {
    setScrollStartId(null);
    action();
  };

  const renderPost = (item, page = null) => {
    const profileType = item.profileType || 'BOOKER';
    const isDj = profileType === 'DJ';
    const isVenue = profileType === 'VENUE';
    const profileName = isDj
      ? item.dj?.artistName
      : isVenue
        ? item.venue?.venueName
        : item.booker?.name || item.author?.username;
    const profileLocation = isDj
      ? item.dj?.city
      : isVenue
        ? item.venue?.city || item.venue?.address
        : null;
    const isAuthor = user?.id && item.author?.id === user.id;
    const baseProfileImg = isDj
      ? normalizeMediaUrl(item.dj?.profileImage)
      : isVenue
        ? normalizeMediaUrl(item.venue?.profileImage)
        : normalizeMediaUrl(item.booker?.profileImage);
    const profileImage =
      isAuthor && baseProfileImg
        ? `${String(baseProfileImg).split('?')[0]}?cb=${feedAvatarBust}`
        : baseProfileImg;
    const rootAuthorId = item.isRepost ? item.originalPost?.author?.id : item.author?.id;
    const canRepost =
      canUserRepost && !item.repostedByMe && rootAuthorId && rootAuthorId !== user?.id;
    const displayImageUri =
      item.isRepost && item.originalPost
        ? normalizeMediaUrl(item.originalPost.imageUrl)
        : normalizeMediaUrl(item.imageUrl || item.image);

    return (
      <FeedImmersivePost
        key={`wall-post-${item.id}`}
        variant={page ? 'page' : 'card'}
        height={page?.height}
        topInset={page ? insets.top : 0}
        bottomInset={page ? page.bottomInset : 0}
        rounded={!page}
        item={item}
        fr={fr}
        profileName={profileName}
        profileImage={profileImage}
        profileType={profileType}
        profileLocation={profileLocation}
        imageUri={displayImageUri}
        isBrokenImage={!!brokenPostImages[item.id]}
        dateLabel={formatDate(item.createdAt)}
        originalDateLabel={item.originalPost ? formatDate(item.originalPost.createdAt) : null}
        liked={!!likedPosts[item.id]}
        likesCount={postLikesCount[item.id] !== undefined ? postLikesCount[item.id] : item.likes || 0}
        commentsCount={postComments[item.id] ? postComments[item.id].length : item.commentsCount ?? 0}
        repostsCount={item.repostsCount ?? 0}
        canRepost={canRepost}
        repostedByMe={!!item.repostedByMe}
        highlighted={!page && activeHighlightId === item.id}
        onPress={page ? undefined : () => setScrollStartId(item.id)}
        onPressProfile={leavingScroll(() => navigateToPostProfile(item))}
        onPressOriginalProfile={
          item.isRepost ? leavingScroll(() => navigateToPostProfile(item, { original: true })) : undefined
        }
        onMore={
          user?.token
            ? leavingScroll(() => (isAuthor ? handleDeletePost(item.id) : reportPost(item.id)))
            : undefined
        }
        moreIcon={isAuthor ? 'trash-outline' : 'ellipsis-horizontal'}
        onToggleLike={() => handleToggleLike(item.id)}
        onOpenComments={() => openComments(item.id)}
        onRepost={() => handleRepost(item)}
        onImageError={() => dispatchEngagement({ type: 'SET_BROKEN_IMAGE', postId: item.id })}
      />
    );
  };

  const commentsSheet = (
    <FeedCommentsSheet
      visible={!!commentsPostId}
      onClose={() => setCommentsPostId(null)}
      fr={fr}
      comments={commentsPostId ? postComments[commentsPostId] : null}
      canComment={!!user?.token}
      input={commentsPostId ? commentInputs[commentsPostId] : ''}
      onChangeInput={(text) => dispatchEngagement({ type: 'SET_COMMENT_INPUT', postId: commentsPostId, text })}
      onSend={() => handleCreateComment(commentsPostId)}
      formatDate={formatDate}
    />
  );

  if (!wallFilter?.userId && !wallFilter?.djId && !wallFilter?.bookerId && !wallFilter?.venueId) {
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
                  ? 'Publie depuis ton profil — tes posts apparaîtront ici.'
                  : 'Passe sur ton profil DJ, Organisateur ou Lieu pour publier sur le fil.'
                : 'You have not posted yet. Switch to your artist, organizer or venue profile to publish.'
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
      {posts.map((item) => renderPost(item))}

      <FeedScrollMode
        visible={!!scrollStartId}
        items={posts}
        startId={scrollStartId}
        renderPage={(item, page) => renderPost(item, page)}
        onClose={() => setScrollStartId(null)}
        fr={fr}
      >
        {commentsSheet}
      </FeedScrollMode>
      {!scrollStartId ? commentsSheet : null}

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
