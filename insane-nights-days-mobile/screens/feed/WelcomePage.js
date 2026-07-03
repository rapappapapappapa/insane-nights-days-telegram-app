import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { NoxSearchBar, NoxTabs, NoxFeedPostCard } from '../../components/nox';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBadge from '../../components/NotificationBadge';
import EmptyState from '../../components/EmptyState';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { formatFeedRelativeDate } from '../../utils/feedPageUtils';
import { styles } from './WelcomePage.styles';

export default function WelcomePage() {
  const { language } = useLanguage();
  const { user, updateUser, refreshCurrentUser } = useAuth();
  const { navigate } = useNavigation();
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications();
  const { unreadCount: chatUnreadCount, latest: chatLatest } = useNotifications();
  const { toast, showError, showSuccess, showInfo, hideToast } = useToast();
  
  const [loadingUserData, setLoadingUserData] = useState(false);

  // ✅ AJOUT: États pour le feed complet
  const [feed, setFeed] = useState([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [postLikesCount, setPostLikesCount] = useState({});
  const [postComments, setPostComments] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [brokenPostImages, setBrokenPostImages] = useState({});
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [feedTab, setFeedTab] = useState('all'); // 'all' | 'following' - style X
  const [feedError, setFeedError] = useState(null);

  const fetchAbortRef = useRef(null);
  const toggledLikeRef = useRef({}); // postId -> { liked, at } - évite que checkLikes écrase un like récent
  const [feedAvatarBust, setFeedAvatarBust] = useState(0);

  const reportPost = (postId) => {
    if (!user?.token) {
      showError(language === 'fr' ? 'Connecte-toi pour signaler.' : 'Log in to report.');
      return;
    }
    setPostToReport(postId);
    setReportModalVisible(true);
  };

  const handleReportReason = async (reason) => {
    if (!user?.token || !postToReport) return;
    setReportModalVisible(false);
    
    try {
      const res = await api.createReport(user.token, {
        targetType: 'FEED_POST',
        targetId: postToReport,
        reason: reason.id,
      });
      if (res?.success) {
        showSuccess(language === 'fr' ? 'Signalement envoyé.' : 'Report sent.');
      } else {
        showError(res?.message || (language === 'fr' ? 'Impossible d\'envoyer.' : 'Unable to send.'));
      }
    } catch (e) {
      console.error('Erreur signalement:', e);
      showError(language === 'fr' ? 'Signalement impossible.' : 'Reporting failed.');
    } finally {
      setPostToReport(null);
    }
  };

  const reportReasons = [
    { id: 'SPAM', label: language === 'fr' ? 'Spam / pub' : 'Spam / ads' },
    { id: 'SCAM', label: language === 'fr' ? 'Arnaque' : 'Scam' },
    { id: 'HARASSMENT', label: language === 'fr' ? 'Harcèlement' : 'Harassment' },
    { id: 'ILLEGAL', label: language === 'fr' ? 'Illégal' : 'Illegal' },
    { id: 'OTHER', label: language === 'fr' ? 'Autre' : 'Other' },
  ];
  
  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      loadUserData();
    }
  }, [user?.isAuthenticated, user?.token]);

  useEffect(() => {
    fetchFeed();
  }, [feedTab]);

  // ✅ AJOUT: Vérifier les likes au chargement du feed
  useEffect(() => {
    if (user?.token && feed.length > 0) {
      checkLikes();
    }
  }, [feed, user?.token]);

  const loadUserData = async () => {
    if (!user?.token) return;
    setLoadingUserData(true);
    try {
      const response = await api.getCurrentUser(user.token);
      if (response && response.success && response.user) {
        updateUser({
          activeProfileType: response.user.activeProfileType,
          score: response.user.score,
          level: response.user.level,
        });
      }
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    } finally {
      setLoadingUserData(false);
    }
  };

  const openChatNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;

    // ✅ Si on a un "latest", aller directement là où il y a à lire
    if (chatLatest?.profileType === 'DJ' || chatLatest?.profileType === 'BOOKER') {
      const targetProfile = chatLatest.profileType;

      if (user?.activeProfileType && user.activeProfileType !== targetProfile) {
        try {
          const res = await api.switchProfile(user.token, targetProfile);
          if (res?.success) {
            await refreshCurrentUser();
          }
        } catch (e) {
          // best-effort
          console.warn('[WelcomePage] Auto switch profile failed:', e?.message ?? e);
        }
      }

      const params = {
        openBookings: true,
        openChatType: chatLatest.messageType ?? null,
        openChatEventDjId: chatLatest.eventDjId ?? null,
        openChatEventId: chatLatest.eventId ?? null,
        openChatPreview: chatLatest.preview ?? null,
        openChatEventTitle: chatLatest.eventTitle ?? null,
      };

      if (targetProfile === 'DJ') {
        navigate('djDashboard', params);
      } else {
        navigate('bookerDashboard', params);
      }
      return;
    }

    // Fallback: pas de détail, on ouvre le dashboard de ton profil actif
    if (user.activeProfileType === 'DJ') {
      navigate('djDashboard', { openBookings: true });
    } else if (user.activeProfileType === 'BOOKER') {
      navigate('bookerDashboard', { openBookings: true });
    } else {
      showInfo(language === 'fr' ? 'Aucun message non lu.' : 'No unread messages.');
    }
  };

  const openFeedNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;
    try {
      // ✅ Marquer comme lues (remet le compteur à 0) puis ouvrir l'écran dédié
      await api.markAllFeedNotificationsRead(user.token);
      await refreshFeedNotifications();
      navigate('notifications');
    } catch (e) {
      console.error('[WelcomePage] openFeedNotifications error:', e);
      // Même si l'UI échoue, tenter de remettre à jour le compteur
      refreshFeedNotifications();
      showError(language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.');
    }
  };

  /**
   * ✅ FONCTION: Récupérer le feed d'actualité depuis l'API
   */
  const fetchFeed = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoadingFeed(true);
    }

    const isFollowing = feedTab === 'following';

    try {
      let response;
      if (isFollowing && user?.token) {
        response = await api.getFeedFollowing(user.token, 50, 0);
      } else if (isFollowing && !user?.token) {
        setFeed([]);
        setLoadingFeed(false);
        setRefreshing(false);
        return;
      } else {
        response = await api.getFeed(50, 0, user?.token || null);
      }
      if (response && response.success && Array.isArray(response.feed)) {
        setFeed(response.feed);
        const likesCountState = {};
        const likedState = {};
        response.feed.forEach(item => {
          if (item.type === 'post') {
            likesCountState[item.id] = item.likes || 0;
            if (item.liked === true) likedState[item.id] = true;
          }
        });
        setPostLikesCount(likesCountState);
        setLikedPosts(prev => ({ ...prev, ...likedState }));
        if (isRefresh) setFeedAvatarBust((n) => n + 1);
      } else {
        setFeed([]);
      }
    } catch (error) {
      console.error('Erreur récupération feed:', error);
      setFeed([]);
    } finally {
      setLoadingFeed(false);
      setRefreshing(false);
    }
  };

  /**
   * ✅ FONCTION: Vérifier quels posts sont likés par l'utilisateur
   */
  const checkLikes = async () => {
    if (!user?.token) return;
    
    const postIds = feed.filter(item => item.type === 'post').map(item => item.id);
    const likesState = {};
    
    for (const postId of postIds) {
      try {
        const response = await api.checkPostLiked(user.token, postId);
        if (response && response.success) {
          likesState[postId] = response.liked;
        }
      } catch (error) {
        console.error(`Erreur vérification like pour post ${postId}:`, error);
      }
    }

    setLikedPosts(prev => {
      const next = { ...likesState };
      const now = Date.now();
      for (const [id, { liked, at }] of Object.entries(toggledLikeRef.current)) {
        if (now - at < 5000) next[id] = liked; // Garder le like récent
      }
      return next;
    });
  };

  /**
   * ✅ FONCTION: Liker ou unliker un post
   */
  const handleToggleLike = async (postId) => {
    if (!user?.token) {
      showError(language === 'fr' 
        ? 'Vous devez être connecté pour liker un post'
        : 'You must be logged in to like a post'
      );
      return;
    }

    try {
      const response = await api.toggleLikePost(user.token, postId);
      if (response && response.success) {
        toggledLikeRef.current[postId] = { liked: response.liked, at: Date.now() };
        setLikedPosts(prev => ({
          ...prev,
          [postId]: response.liked,
        }));
        setPostLikesCount(prev => ({
          ...prev,
          [postId]: response.likesCount,
        }));
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur like/unlike:', error);
    }
  };

  /**
   * ✅ FONCTION: Charger les commentaires d'un post
   */
  const loadComments = async (postId) => {
    try {
      const response = await api.getPostComments(postId, 50, 0);
      if (response && response.success) {
        setPostComments(prev => ({
          ...prev,
          [postId]: response.comments || [],
        }));
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    }
  };

  /**
   * ✅ FONCTION: Toggle l'affichage des commentaires
   */
  const toggleComments = (postId) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !isExpanded,
    }));

    if (!isExpanded && !postComments[postId]) {
      loadComments(postId);
    }
  };

  /**
   * ✅ FONCTION: Créer un commentaire
   */
  const handleCreateComment = async (postId) => {
    if (!user?.token) {
      showError(language === 'fr' 
        ? 'Vous devez être connecté pour commenter'
        : 'You must be logged in to comment'
      );
      return;
    }

    const content = commentInputs[postId];
    if (!content || !content.trim()) {
      return;
    }

    try {
      const response = await api.createComment(user.token, postId, content);
      if (response && response.success) {
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), response.comment],
        }));
        setCommentInputs(prev => ({
          ...prev,
          [postId]: '',
        }));
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur création commentaire:', error);
    }
  };

  /**
   * ✅ AJOUT: Supprimer un post
   */
  const handleDeletePost = async (postId) => {
    if (!user?.token) {
      showError(language === 'fr' 
        ? 'Vous devez être connecté pour supprimer un post'
        : 'You must be logged in to delete a post');
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
        setFeed(prev => prev.filter(item => item.id !== postToDelete));
        showSuccess(language === 'fr' ? 'Post supprimé avec succès' : 'Post deleted successfully');
      } else {
        showError(response?.message || (language === 'fr' ? 'Erreur lors de la suppression du post' : 'Error deleting post'));
      }
    } catch (error) {
      console.error('Erreur suppression post:', error);
      showError(language === 'fr' ? 'Erreur réseau ou serveur.' : 'Network or server error.');
    } finally {
      setPostToDelete(null);
    }
  };

  /**
   * ✅ FONCTION: Formater la date pour l'affichage
   */
  const formatDate = (dateString) => formatFeedRelativeDate(dateString, language);

  const displayName = (() => {
    const raw = user?.username || '';
    const base = raw.includes('@') ? raw.split('@')[0] : raw;
    if (!base) return language === 'fr' ? 'toi' : 'there';
    return base.charAt(0).toUpperCase() + base.slice(1);
  })();

  return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.feedContainer}>
          <View style={styles.screenHeader}>
            <View style={styles.headerRow}>
              <Text style={styles.helloTitle}>
                {language === 'fr' ? `Hello ${displayName} !` : `Hello ${displayName}!`}
              </Text>
              <View style={styles.headerActions}>
                {user?.isAuthenticated && chatUnreadCount > 0 ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={openChatNotifications}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Messages' : 'Messages'}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={Colors.text} />
                    <NotificationBadge count={chatUnreadCount} />
                  </TouchableOpacity>
                ) : null}
                {feedNotificationsCount > 0 ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={openFeedNotifications}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Notifications' : 'Notifications'}
                  >
                    <Ionicons name="notifications-outline" size={22} color={Colors.text} />
                    <NotificationBadge count={feedNotificationsCount} />
                  </TouchableOpacity>
                ) : null}
                {(user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER') ? (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => navigate('createFeedPost')}
                    accessibilityRole="button"
                    accessibilityLabel={language === 'fr' ? 'Créer une publication' : 'Create post'}
                  >
                    <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <NoxSearchBar
              placeholder={language === 'fr' ? 'Rechercher artistes, lieux, events…' : 'Search artists, venues, events…'}
              onPress={() => navigate('events')}
              style={styles.searchBar}
            />
          </View>

          <NoxTabs
            tabs={[
              {
                id: 'all',
                label: 'Events feed',
                accessibilityLabel: language === 'fr' ? 'Fil événements' : 'Events feed',
              },
              {
                id: 'following',
                label: 'Following feed',
                accessibilityLabel: language === 'fr' ? 'Fil abonnements' : 'Following feed',
              },
            ]}
            activeId={feedTab}
            onChange={setFeedTab}
          />

          {/* Liste du feed */}
          {loadingFeed ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                {language === 'fr' ? 'Chargement du feed...' : 'Loading feed...'}
              </Text>
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
                  title={
                    feedTab === 'following' && !user?.token
                      ? (language === 'fr' ? 'Connecte-toi' : 'Log in')
                      : (language === 'fr' ? 'Aucun contenu' : 'No content')
                  }
                  message={
                    feedTab === 'following' && !user?.token
                      ? (language === 'fr'
                          ? 'Connecte-toi pour voir les posts des profils que tu suis'
                          : 'Log in to see posts from profiles you follow')
                      : feedTab === 'following'
                      ? (language === 'fr'
                          ? 'Suis des DJs ou des organisateurs pour voir leurs posts ici'
                          : 'Follow DJs or organizers to see their posts here')
                      : (language === 'fr'
                          ? 'Le feed est vide pour le moment'
                          : 'The feed is empty for now')
                  }
                />
              ) : (
                feed.map((item) => {
                  if (item.type === 'post') {
                    const isDj = item.profileType === 'DJ';
                    const profileData = isDj ? item.dj : item.booker;
                    const profileName = isDj
                      ? item.dj?.artistName
                      : (item.booker?.name || item.author?.username);
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
                    
                    return (
                      <NoxFeedPostCard
                        key={`post-${item.id}`}
                        item={item}
                        language={language}
                        profileName={profileName}
                        profileLocation={profileLocation}
                        profileImage={profileImage}
                        imageUri={imageUri}
                        isBrokenImage={isBrokenImage}
                        isDj={isDj}
                        isAuthor={isAuthor}
                        liked={!!likedPosts[item.id]}
                        likesCount={
                          postLikesCount[item.id] !== undefined
                            ? postLikesCount[item.id]
                            : (item.likes || 0)
                        }
                        commentsExpanded={!!expandedComments[item.id]}
                        comments={postComments[item.id]}
                        commentsCount={
                          postComments[item.id]
                            ? postComments[item.id].length
                            : (item.commentsCount ?? 0)
                        }
                        commentInput={commentInputs[item.id]}
                        canComment={!!user?.token}
                        formatDate={formatDate}
                        onPressProfile={() => {
                          if (isDj && item.dj) {
                            navigate('djProfile', {
                              djId: item.dj.id,
                              djUserId: item.dj.userId,
                            });
                          } else if (!isDj && (item.booker?.id || item.bookerId)) {
                            navigate('bookerProfile', { bookerId: item.booker?.id || item.bookerId });
                          }
                        }}
                        onToggleLike={() => handleToggleLike(item.id)}
                        onToggleComments={() => toggleComments(item.id)}
                        onReport={() => reportPost(item.id)}
                        onDelete={() => handleDeletePost(item.id)}
                        onImageError={() => {
                          setBrokenPostImages((prev) => ({ ...prev, [item.id]: true }));
                        }}
                        onCommentInputChange={(text) =>
                          setCommentInputs((prev) => ({ ...prev, [item.id]: text }))
                        }
                        onSendComment={() => handleCreateComment(item.id)}
                      />
                    );
                  } else if (item.type === 'event') {
                    return (
                      <TouchableOpacity
                        key={`event-${item.id}`}
                        style={styles.eventCard}
                        onPress={() => navigate('eventDetail', { eventId: item.id })}
                        accessibilityRole="button"
                        accessibilityLabel={
                          `${item.title || 'Événement'}. ${item.price != null ? `${item.price} €. ` : ''}` +
                          (language === 'fr' ? 'Ouvrir le détail' : 'Open details')
                        }
                      >
                        <View style={styles.eventHeader}>
                          <Ionicons name="musical-notes" size={24} color={Colors.primary} />
                          <Text style={styles.eventBadge}>
                            {language === 'fr' ? 'Événement' : 'Event'}
                          </Text>
                        </View>

                        {item.image && (
                          <Image
                            source={{ uri: item.image }}
                            style={styles.eventImage}
                            resizeMode="cover"
                          />
                        )}

                        <Text style={styles.eventTitle}>{item.title}</Text>
                        {item.description && (
                          <Text style={styles.eventDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        )}

                        <View style={styles.eventInfo}>
                          <View style={styles.eventInfoRow}>
                            <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.eventInfoText}>
                              {new Date(item.date).toLocaleDateString(
                                language === 'fr' ? 'fr-FR' : 'en-US',
                                { day: 'numeric', month: 'short', year: 'numeric' }
                              )}
                            </Text>
                          </View>
                          <View style={styles.eventInfoRow}>
                            <Ionicons name="location" size={16} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.eventInfoText} numberOfLines={1}>
                              {item.location}
                            </Text>
                          </View>
                          <View style={styles.eventInfoRow}>
                            <Ionicons name="cash" size={16} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.eventInfoText}>
                              {item.price}€
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }
                  return null;
                })
              )}
            </ScrollView>
          )}
        </View>
      
      {/* ✅ AJOUT: Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* ✅ AJOUT: Modal pour signaler un post */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {language === 'fr' ? 'Signaler ce post' : 'Report this post'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {language === 'fr' ? 'Choisis une raison.' : 'Choose a reason.'}
            </Text>
            
            {reportReasons.map((reason) => (
              <TouchableOpacity
                key={reason.id}
                style={styles.modalButton}
                onPress={() => handleReportReason(reason)}
                accessibilityRole="button"
                accessibilityLabel={reason.label}
              >
                <Text style={styles.modalButtonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => {
                setReportModalVisible(false);
                setPostToReport(null);
              }}
              accessibilityRole="button"
              accessibilityLabel={language === 'fr' ? 'Annuler le signalement' : 'Cancel report'}
            >
              <Text style={styles.modalCancelButtonText}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ✅ AJOUT: Modal de confirmation pour supprimer un post */}
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
                accessibilityLabel={language === 'fr' ? 'Supprimer définitivement ce post' : 'Permanently delete this post'}
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

