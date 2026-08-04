import React, { useState, useEffect, useReducer } from 'react';
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../api/config';
import EmptyState from '../../components/EmptyState';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import NotificationBadge from '../../components/NotificationBadge';
import Logo from '../../components/Logo';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';
import Colors from '../../constants/colors';
import { styles } from './FeedPage.styles';
import { postStateReducer, initialPostState } from '../../utils/feedPageUtils';
import { useFeedList } from '../../hooks/useFeedList';
import { useFeedPostEngagement } from '../../hooks/useFeedPostEngagement';
import { useFeedReport } from '../../hooks/useFeedReport';
import FeedPostCard from '../../components/feed/FeedPostCard';
import FeedEventCard from '../../components/feed/FeedEventCard';
import FeedReportModal from '../../components/feed/FeedReportModal';

export default function FeedPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } =
    useFeedNotifications();

  const [feedTab, setFeedTab] = useState('all');
  const [postState, dispatchPostState] = useReducer(postStateReducer, initialPostState);

  const { feed, loading, refreshing, feedAvatarBust, fetchFeed } = useFeedList({
    user,
    feedTab,
    dispatchPostState,
  });

  const {
    likedPosts,
    postLikesCount,
    postComments,
    expandedComments,
    commentInputs,
    brokenPostImages,
    handleToggleLike,
    toggleComments,
    handleCreateComment,
  } = useFeedPostEngagement({
    user,
    language,
    feed,
    postState,
    dispatchPostState,
    showError,
    refreshFeedNotifications,
  });

  const {
    reportModalVisible,
    reportReasons,
    reportPost,
    handleReportReason,
    closeReportModal,
  } = useFeedReport({ user, language, showError, showSuccess });

  useEffect(() => {
    fetchFeed();
  }, [feedTab]);

  const openFeedNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;
    try {
      await api.markAllFeedNotificationsRead(user.token);
      await refreshFeedNotifications();
      navigate('notifications');
    } catch (e) {
      console.error('[FeedPage] openFeedNotifications error:', e);
      refreshFeedNotifications();
      showError(
        language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.'
      );
    }
  };

  const handleEventPress = (eventId) => navigate('eventDetail', { eventId });

  const handleDjPress = (djId, djUserId) => {
    if (djId && djUserId) navigate('djProfile', { djId, djUserId });
  };

  const handleBookerPress = (bookerId) => {
    if (bookerId) navigate('bookerProfile', { bookerId });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement du feed...' : 'Loading feed...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.feedLogoButton}
            onPress={() => fetchFeed(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Actualiser le fil' : 'Refresh feed'}
          >
            <Logo size={48} />
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>{language === 'fr' ? 'Feed' : 'Feed'}</Text>

        <View style={styles.headerRight}>
          {user?.token && feedNotificationsCount > 0 && (
            <TouchableOpacity
              style={styles.notificationsButton}
              onPress={openFeedNotifications}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Notifications du fil' : 'Feed notifications'}
            >
              <Ionicons name="notifications" size={24} color={Colors.primary} />
              <NotificationBadge count={feedNotificationsCount} />
            </TouchableOpacity>
          )}

          {(user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER') && (
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => navigate('createFeedPost')}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Créer une publication' : 'Create post'}
            >
              <Ionicons name="add-circle" size={24} color={Colors.primary} />
              <Text style={styles.createPostText}>{language === 'fr' ? 'Poster' : 'Post'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.feedTabs}>
        <TouchableOpacity
          style={[styles.feedTab, feedTab === 'all' && styles.feedTabActive]}
          onPress={() => setFeedTab('all')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: feedTab === 'all' }}
          accessibilityLabel={language === 'fr' ? 'Fil pour tous' : 'For you feed'}
        >
          <Text style={[styles.feedTabText, feedTab === 'all' && styles.feedTabTextActive]}>
            {language === 'fr' ? 'Pour tous' : 'For you'}
          </Text>
          {feedTab === 'all' && <View style={styles.feedTabIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTab, feedTab === 'following' && styles.feedTabActive]}
          onPress={() => setFeedTab('following')}
          activeOpacity={0.7}
          accessibilityRole="tab"
          accessibilityState={{ selected: feedTab === 'following' }}
          accessibilityLabel={language === 'fr' ? 'Fil abonnements' : 'Following feed'}
        >
          <Text style={[styles.feedTabText, feedTab === 'following' && styles.feedTabTextActive]}>
            {language === 'fr' ? 'Abonnements' : 'Following'}
          </Text>
          {feedTab === 'following' && <View style={styles.feedTabIndicator} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchFeed(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {feed.length === 0 ? (
          <EmptyState
            icon="newspaper-outline"
            title={
              feedTab === 'following' && !user?.token
                ? language === 'fr'
                  ? 'Connecte-toi'
                  : 'Log in'
                : language === 'fr'
                  ? 'Aucun contenu'
                  : 'No content'
            }
            message={
              feedTab === 'following' && !user?.token
                ? language === 'fr'
                  ? 'Connecte-toi pour voir les posts des profils que tu suis'
                  : 'Log in to see posts from profiles you follow'
                : feedTab === 'following'
                  ? language === 'fr'
                    ? 'Suis des DJs ou des organisateurs pour voir leurs posts ici'
                    : 'Follow DJs or organizers to see their posts here'
                  : language === 'fr'
                    ? 'Le feed est vide pour le moment'
                    : 'The feed is empty for now'
            }
          />
        ) : (
          feed.map((item) => {
            if (item.type === 'post') {
              return (
                <FeedPostCard
                  key={`post-${item.id}`}
                  item={item}
                  language={language}
                  user={user}
                  feedAvatarBust={feedAvatarBust}
                  likedPosts={likedPosts}
                  postLikesCount={postLikesCount}
                  postComments={postComments}
                  expandedComments={expandedComments}
                  commentInputs={commentInputs}
                  brokenPostImages={brokenPostImages}
                  onDjPress={handleDjPress}
                  onBookerPress={handleBookerPress}
                  onReportPost={reportPost}
                  onToggleLike={handleToggleLike}
                  onToggleComments={toggleComments}
                  onCreateComment={handleCreateComment}
                  dispatchPostState={dispatchPostState}
                />
              );
            }
            if (item.type === 'event') {
              return (
                <FeedEventCard
                  key={`event-${item.id}`}
                  item={item}
                  language={language}
                  onEventPress={handleEventPress}
                />
              );
            }
            return null;
          })
        )}
      </ScrollView>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

      <FeedReportModal
        visible={reportModalVisible}
        language={language}
        reportReasons={reportReasons}
        onSelectReason={handleReportReason}
        onClose={closeReportModal}
      />
    </View>
  );
}
