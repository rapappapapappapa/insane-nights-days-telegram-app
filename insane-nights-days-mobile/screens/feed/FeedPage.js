import React, { useState, useEffect, useReducer } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput, // ✅ AJOUT: Pour les commentaires
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api, normalizeMediaUrl } from '../../api/config';
import EmptyState from '../../components/EmptyState';
import { useFeedNotifications } from '../../hooks/useFeedNotifications'; // ✅ AJOUT: Hook pour les notifications du feed
import NotificationBadge from '../../components/NotificationBadge'; // ✅ AJOUT: Badge de notification
import Logo from '../../components/Logo'; // ✅ AJOUT: Logo NOX
import { useToast } from '../../hooks/useToast'; // ✅ AJOUT: Hook Toast pour remplacer Alert.alert
import Toast from '../../components/Toast'; // ✅ AJOUT: Composant Toast
import ImageWithRetry from '../../components/ImageWithRetry'; // ✅ AJOUT: Image avec retry automatique
import FeedPostSkeleton from '../../components/FeedPostSkeleton'; // ✅ AJOUT: Skeleton pour les posts

/**
 * ✅ AJOUT: Reducer pour gérer les états des posts (optimisation performance)
 */
const postStateReducer = (state, action) => {
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

const initialPostState = {
  likedPosts: {},
  postLikesCount: {},
  postComments: {},
  expandedComments: {},
  commentInputs: {},
  brokenPostImages: {},
};

/**
 * ✅ AJOUT: Page Feed d'actualité
 * Affiche les posts des DJs et les annonces d'événements dans un feed scrollable
 */
export default function FeedPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { navigate } = useNavigation();
  const { toast, showError, showSuccess, hideToast } = useToast(); // ✅ AJOUT: Toast pour remplacer Alert.alert
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications(); // ✅ AJOUT: Notifications du feed
  
  const openFeedNotifications = async () => {
    if (!user?.isAuthenticated || !user?.token) return;
    try {
      await api.markAllFeedNotificationsRead(user.token);
      await refreshFeedNotifications();
      navigate('notifications');
    } catch (e) {
      console.error('[FeedPage] openFeedNotifications error:', e);
      refreshFeedNotifications();
      showError(language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.');
    }
  };

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedTab, setFeedTab] = useState('all'); // 'all' | 'following' - style X
  // ✅ OPTIMISATION: Utiliser useReducer pour grouper les états liés aux posts
  const [postState, dispatchPostState] = useReducer(postStateReducer, initialPostState);
  
  // Destructuration pour faciliter l'utilisation
  const { likedPosts, postLikesCount, postComments, expandedComments, commentInputs, brokenPostImages } = postState;

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [postToReport, setPostToReport] = useState(null);

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
    fetchFeed();
  }, [feedTab]);

  // ✅ AJOUT: Vérifier les likes au chargement du feed
  useEffect(() => {
    if (user?.token && feed.length > 0) {
      checkLikes();
    }
  }, [feed, user?.token]);

  /**
   * ✅ FONCTION: Récupérer le feed d'actualité depuis l'API
   * @param {boolean} isRefresh - Si true, utilise le state 'refreshing' au lieu de 'loading'
   *                              Cela permet d'afficher un indicateur différent lors du pull-to-refresh
   */
  const fetchFeed = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const isFollowing = feedTab === 'following';

    try {
      let response;
      if (isFollowing && user?.token) {
        response = await api.getFeedFollowing(user.token, 50, 0);
      } else if (isFollowing && !user?.token) {
        setFeed([]);
        setLoading(false);
        setRefreshing(false);
        return;
      } else {
        response = await api.getFeed(50, 0);
      }

      const timestamp = Date.now();
      if (response && response.success && Array.isArray(response.feed)) {
        // ✅ DEBUG: Logger les informations du feed pour diagnostiquer
        console.log('[FeedPage] Feed récupéré:', {
          timestamp: new Date(timestamp).toISOString(),
          total: response.feed.length,
          posts: response.feed.filter(item => item.type === 'post').length,
          events: response.feed.filter(item => item.type === 'event').length,
          oldestPost: response.feed.length > 0 ? response.feed[response.feed.length - 1]?.createdAt : null,
          newestPost: response.feed.length > 0 ? response.feed[0]?.createdAt : null,
          allPostDates: response.feed.filter(item => item.type === 'post').map(p => p.createdAt),
        });
        
        // ✅ VÉRIFICATION: S'assurer qu'on a bien tous les posts (pas de filtre)
        if (response.feed.length === 0) {
          console.warn('[FeedPage] ⚠️ ATTENTION: Le feed est vide !');
        } else if (response.feed.filter(item => item.type === 'post').length < 5) {
          console.warn('[FeedPage] ⚠️ ATTENTION: Moins de 5 posts récupérés alors qu\'il devrait y en avoir 5 !');
        }
        
        setFeed(response.feed);
        // ✅ AJOUT: Initialiser les compteurs de likes avec les valeurs du feed
        const likesCountState = {};
        response.feed.forEach(item => {
          if (item.type === 'post') {
            likesCountState[item.id] = item.likes || 0;
          }
        });
        dispatchPostState({ type: 'SET_LIKES_STATE', likedPosts: {}, likesCount: likesCountState });
      } else {
        console.warn('[FeedPage] Réponse invalide du serveur:', response);
        setFeed([]);
      }
    } catch (error) {
      console.error('Erreur récupération feed:', error);
      setFeed([]);
    } finally {
      // ✅ MODIFICATION: Réinitialiser le bon state selon le type de chargement
      setLoading(false);
      setRefreshing(false);
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

  /**
   * ✅ FONCTION: Naviguer vers les détails d'un événement
   */
  const handleEventPress = (eventId) => {
    navigate('eventDetail', { eventId });
  };

  /**
   * ✅ FONCTION: Naviguer vers le profil d'un DJ
   */
  const handleDjPress = (djId, djUserId) => {
    if (djId && djUserId) {
      navigate('djProfile', {
        djId: djId,
        djUserId: djUserId,
      });
    }
  };

  /**
   * ✅ FONCTION: Naviguer vers le profil d'un Booker
   */
  const handleBookerPress = (bookerId) => {
    if (bookerId) {
      navigate('bookerProfile', { bookerId });
    }
  };

  /**
   * ✅ AJOUT: Vérifier quels posts sont likés par l'utilisateur
   */
  const checkLikes = async () => {
    if (!user?.token) return;
    
    const postIds = feed.filter(item => item.type === 'post').map(item => item.id);
    const likesState = {};
    const likesCountState = {};
    
    // Initialiser avec les valeurs du feed
    feed.forEach(item => {
      if (item.type === 'post') {
        likesCountState[item.id] = item.likes || 0;
      }
    });

    // Vérifier chaque post
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

    dispatchPostState({ type: 'SET_LIKES_STATE', likedPosts: likesState, likesCount: likesCountState });
  };

  /**
   * ✅ AJOUT: Liker ou unliker un post
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
        // Mettre à jour l'état local avec dispatch
        dispatchPostState({ type: 'SET_LIKED_POST', postId, liked: response.liked });
        dispatchPostState({ type: 'SET_LIKES_COUNT', postId, count: response.likesCount });
        // ✅ AJOUT: Rafraîchir les notifications après un like
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur like/unlike:', error);
      showError(error.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred'));
    }
  };

  /**
   * ✅ AJOUT: Charger les commentaires d'un post
   */
  const loadComments = async (postId) => {
    try {
      const response = await api.getPostComments(postId, 50, 0);
      if (response && response.success) {
        dispatchPostState({ type: 'SET_COMMENTS', postId, comments: response.comments || [] });
      }
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    }
  };

  /**
   * ✅ AJOUT: Toggle l'affichage des commentaires
   */
  const toggleComments = (postId) => {
    const isExpanded = expandedComments[postId];
    dispatchPostState({ type: 'TOGGLE_COMMENTS', postId });

    // Charger les commentaires si on les ouvre pour la première fois
    if (!isExpanded && !postComments[postId]) {
      loadComments(postId);
    }
  };

  /**
   * ✅ AJOUT: Créer un commentaire
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
        // Ajouter le commentaire à la liste
        dispatchPostState({ 
          type: 'SET_COMMENTS', 
          postId, 
          comments: [...(postComments[postId] || []), response.comment] 
        });
        // Vider l'input
        dispatchPostState({ type: 'CLEAR_COMMENT_INPUT', postId });
        // ✅ AJOUT: Rafraîchir les notifications après un commentaire
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur création commentaire:', error);
      showError(error.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred'));
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1744" />
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
        {/* ✅ AJOUT: Logo NOX à gauche */}
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.feedLogoButton}
            onPress={() => fetchFeed(true)}
            activeOpacity={0.7}
          >
            <Logo size={48} />
          </TouchableOpacity>
        </View>
        
        {/* Titre au centre */}
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Feed' : 'Feed'}
        </Text>
        
        {/* Boutons à droite */}
        <View style={styles.headerRight}>
          {user?.token && feedNotificationsCount > 0 && (
            <TouchableOpacity
              style={styles.notificationsButton}
              onPress={openFeedNotifications}
            >
              <Ionicons name="notifications" size={24} color="#FF1744" />
              <NotificationBadge count={feedNotificationsCount} />
            </TouchableOpacity>
          )}
          
          {(user?.activeProfileType === 'DJ' || user?.activeProfileType === 'BOOKER') && (
            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => navigate('createFeedPost')}
            >
              <Ionicons name="add-circle" size={24} color="#FF1744" />
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
            tintColor="#FF1744"
            colors={['#FF1744']}
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
                    ? 'Suis des DJs ou des bookers pour voir leurs posts ici'
                    : 'Follow DJs or bookers to see their posts here')
                : (language === 'fr'
                    ? 'Le feed est vide pour le moment'
                    : 'The feed is empty for now')
            }
          />
        ) : (
          feed.map((item) => {
            if (item.type === 'post') {
              const isDj = item.profileType === 'DJ';
              // Booker posts can sometimes miss the embedded booker object (old data / partial responses),
              // so fallback to author username instead of showing "Utilisateur".
              const profileName = isDj
                ? item.dj?.artistName
                : (item.booker?.name || item.author?.username);
              const profileImage = isDj ? item.dj?.profileImage : item.booker?.profileImage;
              const profileLocation = isDj ? item.dj?.city : null;
              const imageUri = normalizeMediaUrl(item.imageUrl);
              const avatarUri = normalizeMediaUrl(profileImage); // ✅ CORRECTION: Afficher la photo de profil pour DJs et Bookers
              // ✅ SUPPRIMÉ: isBrokenImage n'est plus nécessaire car ImageWithRetry gère les erreurs
              
              return (
                <View key={`post-${item.id}`} style={styles.postCard}>
                  {/* ✅ MODIFICATION: En-tête compacte style Twitter/X */}
                  <View style={styles.postHeader}>
                    <TouchableOpacity
                      style={styles.postHeaderLeft}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        if (isDj && item.dj) {
                          handleDjPress(item.dj.id, item.dj.userId);
                        } else if (!isDj && (item.booker?.id || item.bookerId)) {
                          handleBookerPress(item.booker?.id || item.bookerId);
                        }
                      }}
                    >
                      <View style={styles.postAvatar}>
                        {avatarUri ? (
                          <ImageWithRetry
                            uri={avatarUri}
                            style={styles.avatarImage}
                            resizeMode="cover"
                            maxRetries={2}
                            showRetryButton={false}
                            onError={() => {
                              // Marquer l'avatar comme broken pour afficher le placeholder
                              dispatchPostState({ type: 'SET_BROKEN_IMAGE', postId: `avatar-${item.id}` });
                            }}
                          />
                        ) : null}
                        {/* Afficher le placeholder si pas d'URI ou si l'image a échoué */}
                        {(!avatarUri || brokenPostImages[`avatar-${item.id}`]) && (
                          <View style={[StyleSheet.absoluteFill, styles.avatarPlaceholder, isDj ? styles.avatarDj : styles.avatarBooker]}>
                            <Text style={styles.avatarText}>
                              {profileName?.charAt(0)?.toUpperCase() || (isDj ? 'DJ' : 'B')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.postHeaderInfo}>
                        <View style={styles.postHeaderNameRow}>
                          <Text style={styles.postAuthorName} numberOfLines={1}>
                            {profileName || 'Utilisateur'}
                          </Text>
                          {/* ✅ AJOUT: Badge type de profil */}
                          <View style={[styles.profileBadge, isDj ? styles.badgeDj : styles.badgeBooker]}>
                            <Ionicons 
                              name={isDj ? "musical-notes" : "calendar"} 
                              size={10} 
                              color="#fff" 
                            />
                            <Text style={styles.profileBadgeText}>
                              {isDj ? 'DJ' : 'Booker'}
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

                    <TouchableOpacity
                      style={styles.reportIconBtn}
                      onPress={() => reportPost(item.id)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="flag-outline" size={18} color="rgba(255,255,255,0.65)" />
                    </TouchableOpacity>
                  </View>

                  {/* ✅ MODIFICATION: Contenu du post avec meilleure typographie */}
                  <Text style={styles.postContent}>{item.content}</Text>

                  {/* ✅ AMÉLIORATION: Image avec retry automatique et skeleton loader */}
                  {!!imageUri && (
                    <View style={styles.postImageContainer}>
                      <ImageWithRetry
                        uri={imageUri}
                        style={styles.postImage}
                        resizeMode="cover"
                        maxRetries={3}
                        retryDelay={1000}
                        showRetryButton={true}
                        // ✅ ImageWithRetry gère maintenant complètement l'affichage des erreurs avec bouton retry
                      />
                    </View>
                  )}

                  {/* ✅ MODIFICATION: Actions fonctionnelles avec likes et commentaires */}
                  <View style={styles.postActions}>
                    <TouchableOpacity 
                      style={styles.postActionButton}
                      onPress={() => handleToggleLike(item.id)}
                    >
                      <Ionicons 
                        name={likedPosts[item.id] ? "heart" : "heart-outline"} 
                        size={18} 
                        color={likedPosts[item.id] ? "#FF1744" : "rgba(255,255,255,0.6)"} 
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
                    >
                      <Ionicons 
                        name={expandedComments[item.id] ? "chatbubble" : "chatbubble-outline"} 
                        size={18} 
                        color={expandedComments[item.id] ? "#FF1744" : "rgba(255,255,255,0.6)"} 
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
                    <TouchableOpacity style={styles.postActionButton}>
                      <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>

                  {/* ✅ AJOUT: Section commentaires */}
                  {expandedComments[item.id] && (
                    <View style={styles.commentsSection}>
                      {/* Liste des commentaires */}
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

                      {/* Formulaire pour ajouter un commentaire */}
                      {user?.token && (
                        <View style={styles.commentInputContainer}>
                          <TextInput
                            style={styles.commentInput}
                            placeholder={language === 'fr' ? 'Ajouter un commentaire...' : 'Add a comment...'}
                            placeholderTextColor="rgba(255,255,255,0.5)"
                            value={commentInputs[item.id] || ''}
                            onChangeText={(text) => dispatchPostState({ type: 'SET_COMMENT_INPUT', postId: item.id, text })}
                            multiline
                          />
                          <TouchableOpacity
                            style={styles.commentSendButton}
                            onPress={() => handleCreateComment(item.id)}
                          >
                            <Ionicons name="send" size={18} color="#FF1744" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            } else if (item.type === 'event') {
              // ✅ RENDU: Annonce d'événement
              return (
                <TouchableOpacity
                  key={`event-${item.id}`}
                  style={styles.eventCard}
                  onPress={() => handleEventPress(item.id)}
                >
                  <View style={styles.eventHeader}>
                    <Ionicons name="musical-notes" size={24} color="#FF1744" />
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
            >
              <Text style={styles.modalCancelButtonText}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  headerLeftSpacer: {
    width: 44, // équilibre visuel (même largeur que l'espace du hamburger)
  },
  // ✅ AJOUT: Container pour le logo à gauche
  headerLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedLogoButton: {
    padding: 4,
  },
  floatingMenuButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.22)',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.35)',
    zIndex: 9999,
    elevation: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  // ✅ AJOUT: Container pour les boutons à droite du header
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  // ✅ AJOUT: Bouton de notifications
  notificationsButton: {
    position: 'relative',
    padding: 8,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  createPostText: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  feedTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0b0b0e',
  },
  feedTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedTabActive: {},
  feedTabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
  feedTabTextActive: {
    color: '#fff',
  },
  feedTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#FF1744',
    borderRadius: 2,
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: 0, // ✅ MODIFICATION: Pas de padding pour un look plus compact
  },
  // ✅ MODIFICATION: Post card style Twitter/X - plus compact avec séparateur fin
  postCard: {
    backgroundColor: '#0b0b0e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  postHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  reportIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  // ✅ MODIFICATION: Avatar plus petit style Twitter/X
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
    backgroundColor: '#FF1744',
  },
  avatarBooker: {
    backgroundColor: '#4CAF50', // Vert pour différencier des DJs
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
  // ✅ AJOUT: Ligne avec nom et badge
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
  // ✅ AJOUT: Badge type de profil
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
  // ✅ AJOUT: Ligne métadonnées
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
  // ✅ MODIFICATION: Contenu avec meilleure typographie
  postContent: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
    marginLeft: 52, // Aligné avec le contenu après l'avatar
  },
  // ✅ AJOUT: Container pour l'image
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
    fontWeight: '700',
  },
  // ✅ MODIFICATION: Actions plus visibles et espacées
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
    color: '#FF1744',
  },
  // ✅ AJOUT: Styles pour les commentaires
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
    color: '#FF1744',
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventBadge: {
    color: '#FF1744',
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
  eventImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 20,
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
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    flex: 1,
  },
  // ✅ AJOUT: Styles pour le modal de signalement
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
});
