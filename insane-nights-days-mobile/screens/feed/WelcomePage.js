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
  TextInput,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api, normalizeMediaUrl } from '../../api/config';
import BackgroundVideo from '../../components/BackgroundVideo';
import Logo from '../../components/Logo';
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

  return (
      <View style={styles.container}>
        {/* Vidéo d'arrière-plan */}
        <BackgroundVideo opacity={0.6} />
        
        {/* Contenu par-dessus la vidéo */}
        <View style={styles.contentOverlay}>
        <StatusBar style="light" />
        
        {/* Header avec Logo et nom d'utilisateur */}
        <View style={styles.header}>
          <View style={styles.headerRight} />
          <Logo size={80} style={styles.logoContainer} />
          <View style={styles.headerRight} />
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.welcomeText}>
            {language === 'fr' ? 'Bienvenue' : 'Welcome'}
          </Text>
          <Text style={styles.usernameText}>{user?.username || 'Utilisateur'}</Text>
        </View>

        {/* Feed (navigation principale via le drawer latéral — App.js) */}
        <View style={styles.feedContainer}>
          {/* Header du feed */}
          <View style={styles.feedHeader}>
            {/* ✅ AJOUT: Logo NOX à gauche */}
            <View style={styles.feedHeaderLeft}>
              <Logo size={40} />
            </View>
            
            {/* Titre au centre */}
            <Text style={styles.feedHeaderTitle}>
              {language === 'fr' ? 'Feed' : 'Feed'}
            </Text>
            
            {/* Boutons à droite */}
            <View style={styles.feedHeaderRight}>
              {/* ✅ Cloche "MESSAGES" (chat DJ/Organisateur) */}
              {user?.isAuthenticated && chatUnreadCount > 0 && (
                <TouchableOpacity
                  style={styles.notificationsButton}
                  onPress={openChatNotifications}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Messages et chats' : 'Messages and chats'}
                >
                  <Ionicons name="notifications" size={24} color={Colors.primary} />
                  <NotificationBadge count={chatUnreadCount} />
                </TouchableOpacity>
              )}

              {feedNotificationsCount > 0 && (
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
                  <Text style={styles.createPostText}>
                    {language === 'fr' ? 'Poster' : 'Post'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Onglets style X : Pour tous | Abonnements */}
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
                      <View key={`post-${item.id}`} style={styles.postCard}>
                        <View style={styles.postHeader}>
                          <TouchableOpacity
                            style={styles.postHeaderLeft}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="link"
                            accessibilityLabel={
                              language === 'fr'
                                ? `Profil ${profileName || 'utilisateur'}, ${isDj ? 'DJ' : 'organisateur'}`
                                : `Profile ${profileName || 'user'}, ${isDj ? 'DJ' : 'organizer'}`
                            }
                            onPress={() => {
                              if (isDj && item.dj) {
                                navigate('djProfile', {
                                  djId: item.dj.id,
                                  djUserId: item.dj.userId,
                                });
                              } else if (!isDj && (item.booker?.id || item.bookerId)) {
                                navigate('bookerProfile', { bookerId: item.booker?.id || item.bookerId });
                              }
                            }}
                          >
                            <View style={styles.postAvatar}>
                              {profileImage ? (
                                <Image
                                  source={{ uri: profileImage }}
                                  style={styles.avatarImage}
                                />
                              ) : (
                                <View style={[styles.avatarPlaceholder, isDj ? styles.avatarDj : styles.avatarBooker]}>
                                  <Text style={styles.avatarText}>
                                    {profileName?.charAt(0)?.toUpperCase() || (isDj ? 'DJ' : 'O')}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <View style={styles.postHeaderInfo}>
                              <View style={styles.postHeaderNameRow}>
                                <Text style={styles.postAuthorName} numberOfLines={1}>
                                  {profileName || 'Utilisateur'}
                                </Text>
                                <View style={[styles.profileBadge, isDj ? styles.badgeDj : styles.badgeBooker]}>
                                  <Ionicons 
                                    name={isDj ? "musical-notes" : "calendar"} 
                                    size={10} 
                                    color="#fff" 
                                  />
                                  <Text style={styles.profileBadgeText}>
                                    {isDj ? 'DJ' : 'Organisateur'}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.postMetaRow}>
                                {profileLocation && (
                                  <Text style={styles.postMeta}>
                                    {profileLocation}
                                  </Text>
                                )}
                                <Text style={styles.postMetaDot}>•</Text>
                                <Text style={styles.postMeta}>
                                  {formatDate(item.createdAt)}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                          {/* ✅ AJOUT: Bouton de suppression (visible uniquement pour l'auteur) */}
                          {isAuthor && (
                            <TouchableOpacity
                              style={styles.deletePostButton}
                              onPress={() => handleDeletePost(item.id)}
                              accessibilityRole="button"
                              accessibilityLabel={language === 'fr' ? 'Supprimer ce post' : 'Delete this post'}
                            >
                              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                          )}
                        </View>

                        <Text style={styles.postContent}>{item.content}</Text>

                        {!!imageUri && !isBrokenImage && (
                          <View style={styles.postImageContainer}>
                            <Image
                              source={{ uri: imageUri }}
                              style={styles.postImage}
                              resizeMode="cover"
                              onError={(error) => {
                                setBrokenPostImages((prev) => ({ ...prev, [item.id]: true }));
                              }}
                            />
                          </View>
                        )}

                        {!!imageUri && isBrokenImage && (
                          <View style={[styles.postImageContainer, styles.postImageFallback]}>
                            <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.6)" />
                            <Text style={styles.postImageFallbackText}>
                              {language === 'fr' ? 'Image indisponible' : 'Image unavailable'}
                            </Text>
                          </View>
                        )}

                        <View style={styles.postActions}>
                          <TouchableOpacity 
                            style={styles.postActionButton}
                            onPress={() => handleToggleLike(item.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected: !!likedPosts[item.id] }}
                            accessibilityLabel={
                              likedPosts[item.id]
                                ? (language === 'fr' ? 'Retirer le j\'aime' : 'Unlike')
                                : (language === 'fr' ? 'J\'aime' : 'Like')
                            }
                          >
                            <Ionicons 
                              name={likedPosts[item.id] ? "heart" : "heart-outline"} 
                              size={18} 
                              color={likedPosts[item.id] ? Colors.primary : "rgba(255,255,255,0.6)"}
                              style={likedPosts[item.id] ? { color: Colors.primary } : undefined}
                            />
                            {(postLikesCount[item.id] || item.likes || 0) > 0 && (
                              <Text style={[
                                styles.postActionText,
                                likedPosts[item.id] && styles.postActionTextLiked
                              ]}>
                                {postLikesCount[item.id] !== undefined ? postLikesCount[item.id] : item.likes}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.postActionButton}
                            onPress={() => toggleComments(item.id)}
                            accessibilityRole="button"
                            accessibilityLabel={
                              expandedComments[item.id]
                                ? (language === 'fr' ? 'Masquer les commentaires' : 'Hide comments')
                                : (language === 'fr' ? 'Afficher les commentaires' : 'Show comments')
                            }
                          >
                            <Ionicons 
                              name={expandedComments[item.id] ? "chatbubble" : "chatbubble-outline"} 
                              size={18} 
                              color={expandedComments[item.id] ? Colors.primary : "rgba(255,255,255,0.6)"} 
                            />
                            {(postComments[item.id] ? postComments[item.id].length : (item.commentsCount ?? 0)) > 0 && (
                              <Text style={[
                                styles.postActionText,
                                expandedComments[item.id] && styles.postActionTextLiked
                              ]}>
                                {postComments[item.id] ? postComments[item.id].length : (item.commentsCount ?? 0)}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.postActionButton}
                            accessibilityRole="button"
                            accessibilityState={{ disabled: true }}
                            accessibilityLabel={
                              language === 'fr' ? 'Partager, non disponible pour le moment' : 'Share not available yet'
                            }
                          >
                            <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.6)" />
                          </TouchableOpacity>
                          {isAuthor ? (
                            <TouchableOpacity
                              style={styles.deletePostButton}
                              onPress={() => handleDeletePost(item.id)}
                              accessibilityRole="button"
                              accessibilityLabel={language === 'fr' ? 'Supprimer ce post' : 'Delete this post'}
                            >
                              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.reportPostButton}
                              onPress={() => reportPost(item.id)}
                              activeOpacity={0.75}
                              accessibilityRole="button"
                              accessibilityLabel={language === 'fr' ? 'Signaler ce post' : 'Report this post'}
                            >
                              <Ionicons name="flag-outline" size={18} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                          )}
                        </View>

                        {expandedComments[item.id] && (
                          <View style={styles.commentsSection}>
                            {postComments[item.id] && postComments[item.id].length > 0 && (
                              <View style={styles.commentsList}>
                                {postComments[item.id].map((comment) => (
                                  <View key={comment.id} style={styles.commentItem}>
                                    <Text style={styles.commentAuthor}>
                                      {comment.user.username}
                                    </Text>
                                    <Text style={styles.commentContent}>
                                      {comment.content}
                                    </Text>
                                    <Text style={styles.commentDate}>
                                      {formatDate(comment.createdAt)}
                                    </Text>
                                  </View>
                                ))}
                              </View>
                            )}

                            {user?.token && (
                              <View style={styles.commentInputContainer}>
                                <TextInput
                                  style={styles.commentInput}
                                  placeholder={language === 'fr' ? 'Ajouter un commentaire...' : 'Add a comment...'}
                                  placeholderTextColor="rgba(255,255,255,0.5)"
                                  value={commentInputs[item.id] || ''}
                                  onChangeText={(text) => setCommentInputs(prev => ({
                                    ...prev,
                                    [item.id]: text,
                                  }))}
                                  multiline
                                  accessibilityLabel={language === 'fr' ? 'Votre commentaire' : 'Your comment'}
                                />
                                <TouchableOpacity
                                  style={styles.commentSendButton}
                                  onPress={() => handleCreateComment(item.id)}
                                  accessibilityRole="button"
                                  accessibilityLabel={language === 'fr' ? 'Envoyer le commentaire' : 'Send comment'}
                                >
                                  <Ionicons name="send" size={18} color={Colors.primary} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
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

