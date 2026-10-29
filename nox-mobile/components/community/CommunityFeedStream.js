import React, { useEffect, useReducer, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { useToast } from '../../hooks/useToast';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import { useFeedList } from '../../hooks/useFeedList';
import { useFeedPostEngagement } from '../../hooks/useFeedPostEngagement';
import { useFeedReport } from '../../hooks/useFeedReport';
import { postStateReducer, initialPostState, formatFeedRelativeDate } from '../../utils/feedPageUtils';
import { formatEventPriceBadge } from '../../utils/eventPriceUtils';
import { openEventPreview } from '../../utils/noxNavigation';
import { NoxText, NoxFeedPostCard } from '../nox';
import FeedPostViewer from './FeedPostViewer';
import FeedReportModal from '../feed/FeedReportModal';
import EmptyState from '../EmptyState';
import Toast from '../Toast';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { FontFamily } from '../../constants/typography';

function matchesHighlightPost(item, highlightPostId) {
  if (!highlightPostId || item.type !== 'post') return false;
  const target = String(highlightPostId);
  if (String(item.id) === target) return true;
  if (item.isRepost && String(item.originalPost?.id) === target) return true;
  return false;
}

/**
 * Fil NOX (publications + événements publiés) avec likes / commentaires.
 * @param {'all'|'following'} feedTab
 * @param {string|null} [highlightPostId] — scroll + surbrillance depuis une notif feed
 * @param {boolean} [openCommentsOnHighlight]
 */
export default function CommunityFeedStream({
  feedTab = 'all',
  highlightPostId = null,
  openCommentsOnHighlight = false,
}) {
  const { user, handleTokenExpired } = useAuth();
  const { language } = useLanguage();
  const { navigate } = useNavigation();
  const { showConfirm } = useConfirm();
  const { showError, showSuccess, toast, hideToast } = useToast();
  const { refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications();
  const fr = language === 'fr';

  const scrollRef = useRef(null);
  const postLayoutsRef = useRef({});
  const highlightHandledRef = useRef(null);
  const [activeHighlightId, setActiveHighlightId] = useState(null);
  const [viewerPostId, setViewerPostId] = useState(null);

  const [postState, dispatchPostState] = useReducer(postStateReducer, initialPostState);

  const handleTokenError = (error) => {
    if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
      handleTokenExpired?.();
      return true;
    }
    return false;
  };

  const {
    feed,
    setFeed,
    loading,
    refreshing,
    feedError,
    feedAvatarBust,
    fetchFeed,
  } = useFeedList({
    user,
    feedTab,
    language,
    dispatchPostState,
    onAuthError: handleTokenError,
  });

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
    expandComments,
    handleCreateComment,
  } = useFeedPostEngagement({
    user,
    language,
    feed,
    postState,
    dispatchPostState,
    showError,
    refreshFeedNotifications,
    onAuthError: handleTokenError,
  });

  const { reportModalVisible, reportReasons, reportPost, handleReportReason, closeReportModal } =
    useFeedReport({ user, language, showError, showSuccess });

  useEffect(() => {
    fetchFeed();
  }, [feedTab]);

  useEffect(() => {
    if (!highlightPostId || loading) return;
    if (highlightHandledRef.current === highlightPostId) return;

    const item = feed.find((entry) => matchesHighlightPost(entry, highlightPostId));
    if (!item) return;

    highlightHandledRef.current = highlightPostId;
    setActiveHighlightId(item.id);

    if (openCommentsOnHighlight) {
      expandComments(item.id);
    }

    const scrollTimer = setTimeout(() => {
      const y = postLayoutsRef.current[item.id];
      if (y != null && scrollRef.current?.scrollTo) {
        scrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
      }
    }, 150);

    const clearTimer = setTimeout(() => setActiveHighlightId(null), 4000);

    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightPostId, openCommentsOnHighlight, loading, feed, expandComments]);

  useEffect(() => {
    highlightHandledRef.current = null;
    postLayoutsRef.current = {};
  }, [highlightPostId]);

  const formatDate = (dateString) => formatFeedRelativeDate(dateString, language);

  const canUserRepost =
    !!user?.token &&
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
        setFeed((prev) => {
          const marked = prev.map((entry) => {
            if (entry.type !== 'post') return entry;
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
        setFeed((prev) =>
          prev.map((entry) => {
            if (entry.type !== 'post') return entry;
            const entryRootId = entry.isRepost ? entry.originalPost?.id : entry.id;
            if (entry.id === targetId || entryRootId === targetId) {
              return { ...entry, repostedByMe: true };
            }
            return entry;
          }),
        );
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
    if (!user?.token) {
      showError(fr ? 'Connecte-toi pour supprimer.' : 'Log in to delete.');
      return;
    }
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
                setFeed((prev) => prev.filter((item) => item.id !== postId));
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

  const toggleEventInterest = async (item) => {
    if (!user?.token) {
      showError(fr ? 'Connecte-toi pour garder cet événement.' : 'Log in to save this event.');
      return;
    }
    const next = !item.interested;
    const setFlag = (value) =>
      setFeed((prev) =>
        prev.map((entry) =>
          entry.type === 'event' && entry.id === item.id ? { ...entry, interested: value } : entry,
        ),
      );
    setFlag(next);
    try {
      await api.setEventInterest(user.token, item.id, next);
    } catch (e) {
      setFlag(!next);
      if (handleTokenError(e)) return;
      showError(fr ? 'Action impossible pour le moment.' : 'Could not update.');
    }
  };

  const shareEvent = async (item, dateLabel, placeLabel) => {
    try {
      await Share.share({
        message: [item.title, [dateLabel, placeLabel].filter(Boolean).join(' • '), fr ? 'Sur NOX' : 'On NOX']
          .filter(Boolean)
          .join('\n'),
      });
    } catch {
      // annulé
    }
  };

  const renderEventCard = (item) => {
    const dateLabel = item.date
      ? new Date(item.date).toLocaleDateString(fr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })
      : '';
    const placeLabel =
      item.venues?.length > 1
        ? item.venues.map((s) => s.name).filter(Boolean).join(' → ')
        : item.venue?.address || item.location || item.venue?.name || '';
    const price = formatEventPriceBadge(item, language);
    const image = item.image ? normalizeMediaUrl(item.image) : null;
    return (
      <TouchableOpacity
        key={`event-${item.id}`}
        style={styles.eventCard}
        activeOpacity={0.9}
        onPress={() => openEventPreview(navigate, user?.activeProfileType, item.id)}
      >
        {image ? (
          <Image source={{ uri: image }} style={StyleSheet.absoluteFillObject} />
        ) : (
          <View style={styles.eventImageFallback}>
            <Ionicons name="musical-notes" size={44} color={primaryAlpha(0.6)} />
          </View>
        )}
        <View style={styles.eventShade} pointerEvents="none" />
        <View style={styles.eventInfo}>
          <View style={styles.eventInfoMain}>
            <View style={styles.eventHeader}>
              <Ionicons name="calendar-outline" size={14} color={Colors.primaryLight} />
              <NoxText style={styles.eventBadge}>{fr ? 'ÉVÉNEMENT' : 'EVENT'}</NoxText>
            </View>
            <NoxText style={styles.eventTitle} numberOfLines={2}>
              {item.title}
            </NoxText>
            <NoxText style={styles.eventMetaText} numberOfLines={1}>
              {[dateLabel, placeLabel].filter(Boolean).join(' • ')}
            </NoxText>
            {price ? <NoxText style={styles.eventPrice}>{price}</NoxText> : null}
          </View>
          <View style={styles.eventActions}>
            <TouchableOpacity
              onPress={() => toggleEventInterest(item)}
              hitSlop={10}
              accessibilityLabel={fr ? 'Intéressé' : 'Interested'}
            >
              <Ionicons
                name={item.interested ? 'heart' : 'heart-outline'}
                size={22}
                color={item.interested ? Colors.primaryLight : Colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => shareEvent(item, dateLabel, placeLabel)}
              hitSlop={10}
              accessibilityLabel={fr ? 'Partager' : 'Share'}
            >
              <Ionicons name="arrow-redo-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const describePost = (item) => {
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
    const imageUri = normalizeMediaUrl(item.imageUrl || item.image);
    const isBrokenImage = !!brokenPostImages[item.id];
    const rootAuthorId = item.isRepost ? item.originalPost?.author?.id : item.author?.id;
    const canRepost =
      canUserRepost && !item.repostedByMe && rootAuthorId && rootAuthorId !== user?.id;
    const displayImageUri = item.isRepost && item.originalPost
      ? normalizeMediaUrl(item.originalPost.imageUrl)
      : imageUri;

    return {
      profileType,
      isDj,
      profileName,
      profileLocation,
      isAuthor,
      profileImage,
      isBrokenImage,
      canRepost,
      displayImageUri,
    };
  };

  const renderPostCard = (item) => {
    const {
      profileType,
      isDj,
      profileName,
      profileLocation,
      isAuthor,
      profileImage,
      isBrokenImage,
      canRepost,
      displayImageUri,
    } = describePost(item);

    return (
      <View
        key={`post-wrap-${item.id}`}
        onLayout={(e) => {
          postLayoutsRef.current[item.id] = e.nativeEvent.layout.y;
        }}
      >
        <NoxFeedPostCard
          item={item}
          language={language}
          profileName={profileName}
          profileLocation={profileLocation}
          profileImage={profileImage}
          imageUri={displayImageUri}
          isBrokenImage={isBrokenImage}
          isDj={isDj}
          profileType={profileType}
          isAuthor={isAuthor}
          highlighted={activeHighlightId === item.id}
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
          onPressImage={() => setViewerPostId(item.id)}
        />
      </View>
    );
  };

  const renderPostViewer = () => {
    const item = viewerPostId ? feed.find((entry) => entry.id === viewerPostId) : null;
    if (!item) return null;
    const { profileType, profileName, profileLocation, profileImage, canRepost, displayImageUri, isAuthor } =
      describePost(item);
    const source = item.isRepost && item.originalPost ? item.originalPost : item;
    return (
      <FeedPostViewer
        visible
        onClose={() => setViewerPostId(null)}
        imageUri={displayImageUri}
        content={source.content}
        profileName={profileName}
        profileImage={profileImage}
        profileType={profileType}
        metaLine={[profileLocation, formatDate(item.createdAt)].filter(Boolean).join(' • ')}
        liked={!!likedPosts[item.id]}
        likesCount={postLikesCount[item.id] !== undefined ? postLikesCount[item.id] : item.likes || 0}
        commentsCount={postComments[item.id] ? postComments[item.id].length : item.commentsCount ?? 0}
        repostsCount={item.repostsCount ?? 0}
        repostedByMe={!!item.repostedByMe}
        canRepost={canRepost}
        onToggleLike={() => handleToggleLike(item.id)}
        onComment={() => {
          setViewerPostId(null);
          expandComments(item.id);
          const y = postLayoutsRef.current[item.id];
          if (y != null && scrollRef.current?.scrollTo) {
            scrollRef.current.scrollTo({ y: Math.max(0, y - 16), animated: true });
          }
        }}
        onRepost={() => handleRepost(item)}
        onPressProfile={() => {
          setViewerPostId(null);
          navigateToPostProfile(item);
        }}
        onMore={
          isAuthor
            ? undefined
            : () => {
                setViewerPostId(null);
                reportPost(item.id);
              }
        }
      />
    );
  };

  if (loading && feed.length === 0 && !feedError) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (feedTab === 'following' && !user?.token) {
    return (
      <EmptyState
        icon="people-outline"
        title={fr ? 'Connecte-toi' : 'Log in'}
        message={
          fr
            ? 'Connecte-toi pour voir les publications des profils que tu suis.'
            : 'Log in to see posts from profiles you follow.'
        }
      />
    );
  }

  if (feedError && feed.length === 0) {
    return (
      <View style={styles.errorWrap}>
        <Ionicons name="cloud-offline-outline" size={40} color={Colors.textTertiary} />
        <NoxText variant="secondary" style={styles.errorText}>
          {feedError}
        </NoxText>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchFeed()}>
          <NoxText variant="form" style={styles.retryText}>
            {fr ? 'Réessayer' : 'Retry'}
          </NoxText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFeed(true)}
            tintColor={Colors.primary}
          />
        }
      >
        {feed.length === 0 ? (
          <EmptyState
            icon="newspaper-outline"
            title={fr ? 'Aucun contenu' : 'No content'}
            message={
              feedTab === 'following'
                ? fr
                  ? 'Suis des DJs ou organisateurs pour voir leurs publications ici.'
                  : 'Follow DJs or organizers to see their posts here.'
                : fr
                  ? 'Le fil est vide pour le moment.'
                  : 'The feed is empty for now.'
            }
          />
        ) : (
          feed.map((item) =>
            item.type === 'post' ? renderPostCard(item) : item.type === 'event' ? renderEventCard(item) : null,
          )
        )}
      </ScrollView>

      {renderPostViewer()}
      <FeedReportModal
        visible={reportModalVisible}
        language={language}
        reportReasons={reportReasons}
        onSelectReason={handleReportReason}
        onClose={closeReportModal}
      />
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 160, paddingTop: Spacing.sm },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: { textAlign: 'center', lineHeight: 22 },
  retryButton: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  retryText: { color: Colors.background, fontWeight: '700' },
  eventCard: {
    height: 380,
    marginTop: Spacing.md,
    justifyContent: 'flex-end',
    backgroundColor: Colors.backgroundElevated,
    overflow: 'hidden',
  },
  eventImageFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    backgroundColor: 'rgba(10,10,9,0.45)',
  },
  eventInfo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: primaryAlpha(0.8),
    backgroundColor: 'rgba(10,10,9,0.35)',
  },
  eventInfoMain: { flex: 1, gap: 2 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventBadge: { color: Colors.primaryLight, fontSize: 10, letterSpacing: 2 },
  eventTitle: { fontFamily: FontFamily.bold, fontSize: 24, lineHeight: 30, color: Colors.text },
  eventMetaText: { fontSize: 12, color: Colors.textSecondary },
  eventPrice: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.primaryLight, marginTop: 2 },
  eventActions: { flexDirection: 'row', gap: Spacing.lg, paddingBottom: 2 },
});
