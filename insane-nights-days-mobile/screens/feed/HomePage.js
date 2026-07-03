import React, { useState, useEffect, useReducer } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import BackgroundVideo from '../../components/BackgroundVideo';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import Logo from '../../components/Logo';
import { api } from '../../api/config';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import NotificationBadge from '../../components/NotificationBadge';
import EmptyState from '../../components/EmptyState';
import Colors from '../../constants/colors';
import { postStateReducer, initialPostState } from '../../utils/feedPageUtils';
import { useFeedList } from '../../hooks/useFeedList';
import { useFeedPostEngagement } from '../../hooks/useFeedPostEngagement';
import { useFeedReport } from '../../hooks/useFeedReport';
import FeedPostCard from '../../components/feed/FeedPostCard';
import FeedEventCard from '../../components/feed/FeedEventCard';
import FeedReportModal from '../../components/feed/FeedReportModal';

export default function HomePage() {
  const { language, changeLanguage, t } = useLanguage();
  const { user, handleTokenExpired } = useAuth();
  const { navigate } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } =
    useFeedNotifications();
  const insets = useSafeAreaInsets();

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [loadTimedOut, setLoadTimedOut] = useState(false);

  const [postState, dispatchPostState] = useReducer(postStateReducer, initialPostState);

  /** true si l'erreur est un token expiré géré globalement (déconnexion). */
  const handleTokenError = (error) => {
    if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
      handleTokenExpired();
      return true;
    }
    return false;
  };

  const {
    feed,
    setFeed,
    loading: loadingFeed,
    refreshing,
    feedError,
    feedAvatarBust,
    fetchFeed,
  } = useFeedList({ user, feedTab: 'all', dispatchPostState, onAuthError: handleTokenError });

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
    onAuthError: handleTokenError,
  });

  const { reportModalVisible, reportReasons, reportPost, handleReportReason, closeReportModal } =
    useFeedReport({ user, language, showError, showSuccess });

  useEffect(() => {
    fetchFeed();
  }, []);

  // Garde-fou : si le chargement traîne (> 20 s), proposer un retry au lieu d'un loader infini.
  useEffect(() => {
    if (!loadingFeed) {
      setLoadTimedOut(false);
      return undefined;
    }
    const timeout = setTimeout(() => setLoadTimedOut(true), 20000);
    return () => clearTimeout(timeout);
  }, [loadingFeed]);

  const openFeedNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;
    try {
      await api.markAllFeedNotificationsRead(user.token);
      await refreshFeedNotifications();
      navigate('notifications');
    } catch (e) {
      console.error('[HomePage] openFeedNotifications error:', e);
      refreshFeedNotifications();
      showError(
        language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.'
      );
    }
  };

  const handleDjPress = (djId, djUserId) => {
    if (djId && djUserId) navigate('djProfile', { djId, djUserId });
  };

  const handleBookerPress = (bookerId) => {
    if (bookerId) navigate('bookerProfile', { bookerId });
  };

  const handleEventPress = (eventId) => {
    if (!user?.isAuthenticated) {
      showError(
        language === 'fr'
          ? "Connectez-vous pour voir les détails de l'événement"
          : 'Sign in to see event details'
      );
      navigate('login');
    } else {
      navigate('eventDetail', { eventId });
    }
  };

  const handleDeletePost = (postId) => {
    if (!user?.token) {
      showError(
        language === 'fr'
          ? 'Vous devez être connecté pour supprimer un post'
          : 'You must be logged in to delete a post'
      );
      return;
    }
    setPostToDelete(postId);
    setDeleteModalVisible(true);
  };

  const confirmDeletePost = async () => {
    if (!user?.token || !postToDelete) return;
    setDeleteModalVisible(false);

    try {
      const response = await api.deleteFeedPost(user.token, postToDelete);
      if (response && response.success) {
        setFeed((prev) => prev.filter((item) => item.id !== postToDelete));
        showSuccess(language === 'fr' ? 'Post supprimé avec succès' : 'Post deleted successfully');
      }
    } catch (error) {
      console.error('Erreur suppression post:', error);
      if (!handleTokenError(error)) {
        showError(language === 'fr' ? 'Erreur lors de la suppression du post' : 'Error deleting post');
      }
    } finally {
      setPostToDelete(null);
    }
  };

  const showErrorState = !loadingFeed ? !!feedError : loadTimedOut;

  return (
    <View style={styles.container}>
      <BackgroundVideo opacity={0.6} />

      <SafeAreaView style={styles.contentOverlay} edges={['top']}>
        <StatusBar style="light" />

        <View
          style={[
            styles.header,
            { paddingTop: Math.max(insets.top + 10, Platform.OS === 'ios' ? 50 : 30) },
          ]}
        >
          <View style={styles.headerLeftSpacer} />

          <TouchableOpacity
            style={styles.logoContainer}
            onPress={() => fetchFeed(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Actualiser le fil' : 'Refresh feed'}
          >
            <Logo size={110} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.languageButton}
            onPress={() => setShowLanguageModal(true)}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Choisir la langue' : 'Choose language'}
          >
            <Text style={styles.languageButtonText}>{language === 'fr' ? 'FR' : 'EN'} ▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedContainer}>
          <SafeAreaView style={styles.feedSafeArea} edges={['top']}>
            <View
              style={[
                styles.feedHeader,
                { paddingTop: Math.max(insets.top + 10, Platform.OS === 'ios' ? 50 : 30) },
              ]}
            >
              <View style={styles.feedHeaderLeft}>
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

              <Text style={styles.feedHeaderTitle}>{language === 'fr' ? 'Feed' : 'Feed'}</Text>

              <View style={styles.feedHeaderRight}>
                {user?.token && feedNotificationsCount > 0 && (
                  <TouchableOpacity
                    style={styles.notificationsButton}
                    onPress={openFeedNotifications}
                    accessibilityRole="button"
                    accessibilityLabel={
                      language === 'fr' ? 'Notifications du fil' : 'Feed notifications'
                    }
                  >
                    <Ionicons name="notifications" size={28} color={Colors.primary} />
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
                    <Ionicons name="add-circle" size={28} color={Colors.primary} />
                    <Text style={styles.createPostText}>
                      {language === 'fr' ? 'Poster' : 'Post'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {loadingFeed && !loadTimedOut ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>
                  {language === 'fr' ? 'Chargement du feed...' : 'Loading feed...'}
                </Text>
              </View>
            ) : showErrorState ? (
              <View style={styles.errorContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color="rgba(255,255,255,0.5)" />
                <Text style={styles.errorText}>
                  {feedError ||
                    (language === 'fr'
                      ? 'Chargement trop long. Vérifie ta connexion.'
                      : 'Loading took too long. Check your connection.')}
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => fetchFeed()}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Réessayer le chargement' : 'Retry loading'}
                >
                  <Ionicons name="refresh" size={20} color={Colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.retryButtonText}>
                    {language === 'fr' ? 'Réessayer' : 'Retry'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.feedScroll}
                contentContainerStyle={styles.feedContent}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}
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
                    title={language === 'fr' ? 'Aucun contenu' : 'No content'}
                    message={
                      language === 'fr'
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
                          onDeletePost={handleDeletePost}
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
            )}
          </SafeAreaView>
        </View>
      </SafeAreaView>

      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLanguageModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('language')}</Text>
            <TouchableOpacity
              style={[styles.modalOption, language === 'fr' && styles.modalOptionSelected]}
              onPress={() => {
                changeLanguage('fr');
                setShowLanguageModal(false);
              }}
            >
              <Text
                style={[styles.modalOptionText, language === 'fr' && styles.modalOptionTextSelected]}
              >
                Français
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, language === 'en' && styles.modalOptionSelected]}
              onPress={() => {
                changeLanguage('en');
                setShowLanguageModal(false);
              }}
            >
              <Text
                style={[styles.modalOptionText, language === 'en' && styles.modalOptionTextSelected]}
              >
                English
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />

      <FeedReportModal
        visible={reportModalVisible}
        language={language}
        reportReasons={reportReasons}
        onSelectReason={handleReportReason}
        onClose={closeReportModal}
      />

      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'fr' ? 'Supprimer le post' : 'Delete post'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {language === 'fr'
                ? 'Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.'
                : 'Are you sure you want to delete this post? This action cannot be undone.'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setPostToDelete(null);
                }}
                accessibilityRole="button"
                accessibilityLabel={language === 'fr' ? 'Annuler la suppression' : 'Cancel deletion'}
              >
                <Text style={styles.modalCancelButtonText}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton]}
                onPress={confirmDeletePost}
                accessibilityRole="button"
                accessibilityLabel={
                  language === 'fr' ? 'Supprimer définitivement ce post' : 'Permanently delete this post'
                }
                accessibilityHint={language === 'fr' ? 'Action irréversible' : 'Cannot be undone'}
              >
                <Text style={styles.modalDeleteButtonText}>
                  {language === 'fr' ? 'Supprimer' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerLeftSpacer: {
    width: 44,
    minHeight: 44,
  },
  contentOverlay: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    minHeight: Platform.OS === 'ios' ? 60 : 50,
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    borderColor: 'rgba(77,163,255,0.5)',
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  feedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    zIndex: 3,
  },
  feedSafeArea: {
    flex: 1,
    paddingTop: 0,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    minHeight: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(77,163,255,0.2)',
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  feedLogoButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  feedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  },
  notificationsButton: {
    position: 'relative',
    padding: 10,
    marginRight: 12,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
    minHeight: 44,
  },
  createPostText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  feedScroll: {
    flex: 1,
  },
  feedContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.4)',
  },
  retryButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.3)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: Colors.background,
  },
  modalOptionSelected: {
    backgroundColor: Colors.primary,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: Colors.background,
    fontWeight: '700',
  },
  modalButton: {
    backgroundColor: '#2a2a2f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(77,163,255,0.2)',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
    flex: 1,
  },
  modalCancelButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalDeleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    flex: 1,
  },
  modalDeleteButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
