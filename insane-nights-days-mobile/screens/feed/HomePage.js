import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Image,
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
import { api, normalizeMediaUrl } from '../../api/config';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import NotificationBadge from '../../components/NotificationBadge';
import EmptyState from '../../components/EmptyState';
import Colors from '../../constants/colors';
// Drawer global géré dans App.js

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomePage() {
  const { language, changeLanguage, t } = useLanguage();
  const { user, handleTokenExpired } = useAuth();
  const { navigate } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications();
  const insets = useSafeAreaInsets(); // ✅ AJOUT: Pour obtenir les valeurs exactes des safe areas iOS
  
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  // drawer global: pas de state ici
  
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
  const [feedError, setFeedError] = useState(null);

  const fetchAbortRef = useRef(null);
  const toggledLikeRef = useRef({}); // postId -> { liked, at } - évite que checkLikes écrase un like récent

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
  
  // Animation pour le feed
  const feedTranslateY = useRef(new Animated.Value(0)).current;
  
  // ✅ NOTE: Le formulaire de connexion/inscription est maintenant sur LoginPage (plein écran).

  // ✅ AJOUT: Charger le feed au démarrage (avec annulation au démontage + timeout de sécurité)
  useEffect(() => {
    fetchAbortRef.current = { cancelled: false };
    fetchFeed();
    const safetyTimeout = setTimeout(() => {
      if (fetchAbortRef.current && !fetchAbortRef.current.cancelled) {
        setLoadingFeed(false);
        setRefreshing(false);
        setFeedError(language === 'fr' ? 'Chargement trop long. Vérifie ta connexion.' : 'Loading took too long. Check your connection.');
      }
    }, 20000);
    return () => {
      if (fetchAbortRef.current) fetchAbortRef.current.cancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // ✅ AJOUT: Vérifier les likes au chargement du feed
  useEffect(() => {
    if (user?.token && feed.length > 0) {
      checkLikes();
    }
  }, [feed, user?.token]);

  /**
   * ✅ HELPER: Gérer les erreurs de token expiré
   */
  const handleTokenError = (error) => {
    if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
      handleTokenExpired();
      return true;
    }
    return false;
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
    setFeedError(null);

    try {
      const response = await api.getFeed(50, 0); // ✅ AUGMENTÉ: Récupérer 50 éléments pour voir plus de posts historiques
      if (fetchAbortRef.current?.cancelled) return;
      if (response && response.success && Array.isArray(response.feed)) {
        setFeedError(null);
        setFeed(response.feed);
        const likesCountState = {};
        response.feed.forEach(item => {
          if (item.type === 'post') {
            likesCountState[item.id] = item.likes || 0;
          }
        });
        setPostLikesCount(likesCountState);
      } else {
        setFeed([]);
      }
    } catch (error) {
      if (fetchAbortRef.current?.cancelled) return;
      console.error('Erreur récupération feed:', error);
      if (!handleTokenError(error)) {
        setFeed([]);
        setFeedError(error?.message || (language === 'fr' ? 'Impossible de charger le feed' : 'Unable to load feed'));
      }
    } finally {
      if (!fetchAbortRef.current?.cancelled) {
        setLoadingFeed(false);
        setRefreshing(false);
      }
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
        if (handleTokenError(error)) {
          break; // Arrêter la boucle si le token est expiré
        }
      }
    }

    setLikedPosts(likesState);
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
      handleTokenError(error);
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
      }
    } catch (error) {
      console.error('Erreur suppression post:', error);
      // ✅ CORRECTION: Gérer les erreurs de token expiré
      if (error?.isTokenExpired || error?.status === 401 || error?.status === 403) {
        handleTokenExpired();
      } else {
        showError(language === 'fr' ? 'Erreur lors de la suppression du post' : 'Error deleting post');
      }
    } finally {
      setPostToDelete(null);
    }
  };

  /**
   * ✅ FONCTION: Formater la date pour l'affichage
   */
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === 'fr' ? 'À l\'instant' : 'Just now';
    } else if (diffMins < 60) {
      return language === 'fr' ? `Il y a ${diffMins} min` : `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return language === 'fr' ? `Il y a ${diffHours}h` : `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return language === 'fr' ? `Il y a ${diffDays}j` : `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const openFeedNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;
    try {
      await api.markAllFeedNotificationsRead(user.token);
      await refreshFeedNotifications();
      navigate('notifications');
    } catch (e) {
      console.error('[HomePage] openFeedNotifications error:', e);
      refreshFeedNotifications();
      showError(language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.');
    }
  };

  // ✅ NOTE: Auth UI déplacée vers LoginPage (plein écran). Le feed reste plein écran.


  return (
      <View style={styles.container}>
        {/* Vidéo d'arrière-plan */}
        <BackgroundVideo opacity={0.6} />
        
        {/* Contenu par-dessus la vidéo */}
        <SafeAreaView style={styles.contentOverlay} edges={['top']}>
        <StatusBar style="light" />
        
        {/* Header avec Logo centré, Bouton Menu et Langue */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top + 10, Platform.OS === 'ios' ? 50 : 30) }]}>
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
            <Text style={styles.languageButtonText}>
              {language === 'fr' ? 'FR' : 'EN'} ▼
            </Text>
          </TouchableOpacity>
        </View>

        {/* ✅ Auth UI déplacée vers LoginPage (plein écran) */}

        {/* ✅ FEED: Affiché par-dessus le menu avec animation */}
        <Animated.View
          style={[
            styles.feedContainer,
            {
              transform: [{ translateY: feedTranslateY }],
            },
          ]}
        >
          <SafeAreaView style={styles.feedSafeArea} edges={['top']}>
            {/* Header du feed */}
            <View style={[styles.feedHeader, { paddingTop: Math.max(insets.top + 10, Platform.OS === 'ios' ? 50 : 30) }]}>
            {/* ✅ AJOUT: Logo NOX à gauche */}
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
            
            {/* Titre au centre */}
            <Text style={styles.feedHeaderTitle}>
              {language === 'fr' ? 'Feed' : 'Feed'}
            </Text>
            
            {/* Boutons à droite */}
            <View style={styles.feedHeaderRight}>
              {user?.token && feedNotificationsCount > 0 && (
                <TouchableOpacity
                  style={styles.notificationsButton}
                  onPress={openFeedNotifications}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Notifications du fil' : 'Feed notifications'}
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

          {/* Liste du feed */}
          {loadingFeed ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>
                {language === 'fr' ? 'Chargement du feed...' : 'Loading feed...'}
              </Text>
            </View>
          ) : feedError ? (
            <View style={styles.errorContainer}>
              <Ionicons name="cloud-offline-outline" size={48} color="rgba(255,255,255,0.5)" />
              <Text style={styles.errorText}>{feedError}</Text>
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
                    const isDj = item.profileType === 'DJ';
                    const profileData = isDj ? item.dj : item.booker;
                    // Booker posts can miss embedded `booker` object (old data/partial responses),
                    // so fallback to author username instead of "Utilisateur".
                    const profileName = isDj
                      ? item.dj?.artistName
                      : (item.booker?.name || item.author?.username);
                    const profileImage = isDj ? normalizeMediaUrl(item.dj?.profileImage) : normalizeMediaUrl(item.booker?.profileImage); // DJs et Organisateurs
                    const profileLocation = isDj ? item.dj?.city : null;
                    
                    const isAuthor = user?.id && item.author?.id === user.id;
                    const imageUri = normalizeMediaUrl(item.imageUrl);
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

                          {!isAuthor && (
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
                        onPress={() => {
                          if (!user?.isAuthenticated) {
                            showError(language === 'fr' ? 'Connectez-vous pour voir les détails de l\'événement' : 'Sign in to see event details');
                            navigate('login');
                          } else {
                            navigate('eventDetail', { eventId: item.id });
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={
                          `${item.title || 'Événement'}. ${item.price != null ? `${item.price} €. ` : ''}` +
                          (language === 'fr' ? 'Voir l\'événement' : 'View event')
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

          {/* ✅ Auth UI déplacée vers LoginPage: pas de toggle bas */}
          </SafeAreaView>
        </Animated.View>
      </SafeAreaView>

      {/* Modal de sélection de langue */}
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
              <Text style={[styles.modalOptionText, language === 'fr' && styles.modalOptionTextSelected]}>
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
              <Text style={[styles.modalOptionText, language === 'en' && styles.modalOptionTextSelected]}>
                English
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    minHeight: Platform.OS === 'ios' ? 60 : 50, // ✅ AJOUT: Hauteur minimale pour le header
  },
  menuButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    minHeight: 44, // ✅ AJOUT: Hauteur minimale pour les boutons iOS
    minWidth: 44, // ✅ AJOUT: Largeur minimale pour les boutons iOS
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  tutorialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
    gap: 8,
    minHeight: 44, // ✅ AJOUT: Hauteur minimale pour les boutons iOS
  },
  tutorialButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
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
    minHeight: 44, // ✅ AJOUT: Hauteur minimale pour les boutons iOS
    borderColor: 'rgba(255,23,68,0.5)',
  },
  languageButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // menu bas (legacy) supprimé: auth déplacée vers LoginPage
  // ✅ FEED: Styles pour le feed par-dessus le menu
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
    minHeight: Platform.OS === 'ios' ? 60 : 50, // ✅ AJOUT: Hauteur minimale pour le header
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  feedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  feedMenuButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
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
    minWidth: 44, // ✅ AJOUT: Largeur minimale pour les boutons iOS
    minHeight: 44, // ✅ AJOUT: Hauteur minimale pour les boutons iOS
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
    borderColor: 'rgba(255,23,68,0.3)',
    minHeight: 44, // ✅ AJOUT: Hauteur minimale pour les boutons iOS
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
  // ✅ POST: Styles pour les posts du feed
  postCard: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  deletePostButton: {
    padding: 8,
    marginLeft: 8,
  },
  reportPostButton: {
    padding: 8,
    marginLeft: 8,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDj: {
    backgroundColor: Colors.primary,
  },
  avatarBooker: {
    backgroundColor: '#4CAF50',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  postHeaderInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  postHeaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  postAuthorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  badgeDj: {
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.4)',
  },
  badgeBooker: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  profileBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
    textTransform: 'uppercase',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  postMeta: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  postMetaDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginHorizontal: 4,
  },
  postContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    marginLeft: 52,
  },
  postImageContainer: {
    marginLeft: 52,
    marginBottom: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 16,
  },
  postImageFallback: {
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  postImageFallbackText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 52,
    marginTop: 4,
    justifyContent: 'space-between',
    maxWidth: 300,
  },
  postActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  postActionText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '500',
  },
  postActionTextLiked: {
    color: Colors.primary,
  },
  commentsSection: {
    marginLeft: 52,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  commentsList: {
    marginBottom: 12,
  },
  commentItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  commentAuthor: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentContent: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  commentDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#1a1a1f',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    marginRight: 8,
  },
  commentSendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1a1a1f',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  eventCard: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  eventBadge: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  eventDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventInfo: {
    gap: 8,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  // (legacy) styles de formulaire/login supprimés: auth déplacée vers LoginPage
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
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
  // ✅ AJOUT: Styles pour les modals
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
    borderColor: 'rgba(255,23,68,0.3)',
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
  modalButton: {
    backgroundColor: '#2a2a2f',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 8,
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
