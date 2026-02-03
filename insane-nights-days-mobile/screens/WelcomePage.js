import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { api, normalizeMediaUrl } from '../api/config';
import BackgroundVideo from '../components/BackgroundVideo';
import Logo from '../components/Logo';
import { useFeedNotifications } from '../hooks/useFeedNotifications';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBadge from '../components/NotificationBadge';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MENU_HEIGHT = SCREEN_HEIGHT * 0.7; // Hauteur du menu (70% de l'écran)

export default function WelcomePage() {
  const { language, t } = useLanguage();
  const { user, logout, updateUser, refreshCurrentUser } = useAuth();
  const { navigate } = useNavigation();
  const { unreadCount: feedNotificationsCount, refreshUnreadCount: refreshFeedNotifications } = useFeedNotifications();
  const { unreadCount: chatUnreadCount, latest: chatLatest } = useNotifications();
  const { toast, showError, showSuccess, hideToast } = useToast();
  
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [showMenu, setShowMenu] = useState(false); // État pour afficher/cacher le menu
  // Drawer global géré dans App.js
  
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

  const reportPost = (postId) => {
    if (!user?.token) {
      Alert.alert(
        language === 'fr' ? 'Connexion requise' : 'Login required',
        language === 'fr' ? 'Connecte-toi pour signaler.' : 'Log in to report.'
      );
      return;
    }

    const reasons = [
      { id: 'SPAM', label: language === 'fr' ? 'Spam / pub' : 'Spam / ads' },
      { id: 'SCAM', label: language === 'fr' ? 'Arnaque' : 'Scam' },
      { id: 'HARASSMENT', label: language === 'fr' ? 'Harcèlement' : 'Harassment' },
      { id: 'ILLEGAL', label: language === 'fr' ? 'Illégal' : 'Illegal' },
      { id: 'OTHER', label: language === 'fr' ? 'Autre' : 'Other' },
    ];

    Alert.alert(
      language === 'fr' ? 'Signaler ce post' : 'Report this post',
      language === 'fr' ? 'Choisis une raison.' : 'Choose a reason.',
      [
        ...reasons.map((r) => ({
          text: r.label,
          onPress: async () => {
            try {
              const res = await api.createReport(user.token, {
                targetType: 'FEED_POST',
                targetId: postId,
                reason: r.id,
              });
              if (res?.success) showSuccess(language === 'fr' ? 'Signalement envoyé.' : 'Report sent.');
              else showError(res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
            } catch (e) {
              showError(language === 'fr' ? 'Signalement impossible.' : 'Reporting failed.');
            }
          },
        })),
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      ]
    );
  };
  
  // Animation pour le feed
  const feedTranslateY = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Charger les données utilisateur complètes si connecté
    if (user?.isAuthenticated && user?.token) {
      loadUserData();
      fetchFeed();
    }
  }, [user?.isAuthenticated, user?.token]);

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
      Alert.alert(
        language === 'fr' ? 'Messages' : 'Messages',
        language === 'fr' ? 'Aucun message non lu.' : 'No unread messages.'
      );
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
      Alert.alert(
        language === 'fr' ? 'Notifications' : 'Notifications',
        language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.'
      );
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

    try {
      const response = await api.getFeed(30, 0);
      if (response && response.success && Array.isArray(response.feed)) {
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

    setLikedPosts(likesState);
  };

  /**
   * ✅ FONCTION: Liker ou unliker un post
   */
  const handleToggleLike = async (postId) => {
    if (!user?.token) {
      Alert.alert(
        language === 'fr' ? 'Connexion requise' : 'Login required',
        language === 'fr' 
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
      Alert.alert(
        language === 'fr' ? 'Connexion requise' : 'Login required',
        language === 'fr' 
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

    Alert.alert(
      language === 'fr' ? 'Supprimer le post' : 'Delete post',
      language === 'fr' 
        ? 'Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.'
        : 'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: language === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.deleteFeedPost(user.token, postId);
              if (response && response.success) {
                setFeed(prev => prev.filter(item => item.id !== postId));
                showSuccess(language === 'fr' ? 'Post supprimé avec succès' : 'Post deleted successfully');
              } else {
                showError(response?.message || (language === 'fr' ? 'Erreur lors de la suppression du post' : 'Error deleting post'));
              }
            } catch (error) {
              console.error('Erreur suppression post:', error);
              showError(language === 'fr' ? 'Erreur réseau ou serveur.' : 'Network or server error.');
            }
          },
        },
      ]
    );
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
   * ✅ FONCTION: Toggle l'affichage du menu
   */
  const toggleMenu = () => {
    const toValue = showMenu ? 0 : -MENU_HEIGHT;
    setShowMenu(!showMenu);
    
    Animated.spring(feedTranslateY, {
      toValue,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

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

        {/* ✅ MENU BAS DÉSACTIVÉ: remplacé par le drawer latéral */}
        {false && (
        <View style={styles.menuContainer}>
          <KeyboardAvoidingView
            style={styles.menuContent}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={styles.menuScroll}
              contentContainerStyle={styles.menuScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.menuTitle}>
                {language === 'fr'
                  ? 'Que souhaitez-vous faire ?'
                  : 'What would you like to do?'}
              </Text>

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigate('events')}
                >
                  <Ionicons name="musical-notes" size={36} color="#FF1744" />
                  <Text style={styles.actionText}>
                    {language === 'fr' ? 'Événements' : 'Events'}
                  </Text>
                </TouchableOpacity>

                {/* Afficher "Mes Tickets" uniquement pour le profil COMMUNITY */}
                {user?.activeProfileType === 'COMMUNITY' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigate('tickets')}
                  >
                    <MaterialIcons name="confirmation-number" size={36} color="#FF1744" />
                    <Text style={styles.actionText}>
                      {language === 'fr' ? 'Mes Tickets' : 'My Tickets'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Afficher "Dashboard DJ" pour les DJs */}
                {user?.activeProfileType === 'DJ' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigate('djDashboard')}
                  >
                    <Ionicons name="headset" size={36} color="#FF1744" />
                    <Text style={styles.actionText}>
                      {language === 'fr' ? 'Dashboard DJ' : 'DJ Dashboard'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Afficher "Dashboard Lieu" pour les Lieux */}
                {user?.activeProfileType === 'VENUE' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigate('venueDashboard')}
                  >
                    <Ionicons name="business" size={36} color="#FF1744" />
                    <Text style={styles.actionText}>
                      {language === 'fr' ? 'Dashboard Lieu' : 'Venue Dashboard'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Bouton pour parcourir les profils de lieux */}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigate('venueList')}
                >
                  <Ionicons name="location" size={36} color="#FF1744" />
                  <Text style={styles.actionText}>
                    {language === 'fr' ? 'Profils de lieux' : 'Venue profiles'}
                  </Text>
                </TouchableOpacity>

                {/* Afficher "Dashboard Booker" et les listes DJ / Lieux pour les Bookers */}
                {user?.activeProfileType === 'BOOKER' && (
                  <>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigate('bookerDashboard')}
                    >
                      <MaterialIcons name="event" size={36} color="#FF1744" />
                      <Text style={styles.actionText}>
                        {language === 'fr' ? 'Dashboard Booker' : 'Booker Dashboard'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => navigate('venueList')}
                    >
                      <MaterialIcons name="location-city" size={36} color="#FF1744" />
                      <Text style={styles.actionText}>
                        {language === 'fr' ? 'Liste des lieux' : 'Venue List'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigate('djList')}
                >
                  <Ionicons name="people" size={36} color="#FF1744" />
                  <Text style={styles.actionText}>
                    {language === 'fr' ? 'Liste des DJs' : 'DJ List'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigate('profile')}
                >
                  <Ionicons name="person" size={36} color="#FF1744" />
                  <Text style={styles.actionText}>
                    {language === 'fr' ? 'Mon Profil' : 'My Profile'}
                  </Text>
                </TouchableOpacity>

                {user?.isAuthenticated && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => navigate('switchProfile')}
                  >
                    <Ionicons name="swap-horizontal" size={36} color="#FF1744" />
                    <Text style={styles.actionText}>
                      {language === 'fr' ? 'Changer de profil' : 'Switch Profile'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.logoutButton}
                onPress={() => {
                  logout();
                  navigate('home');
                }}
              >
                <Ionicons name="log-out-outline" size={20} color="#FF1744" style={{ marginRight: 8 }} />
                <Text style={styles.logoutButtonText}>
                  {language === 'fr' ? 'Déconnexion' : 'Logout'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
        )}

        {/* ✅ FEED: Affiché par-dessus le menu avec animation */}
        <Animated.View
          style={[
            styles.feedContainer,
            {
              transform: [{ translateY: feedTranslateY }],
            },
          ]}
        >
          {/* Header du feed */}
          <View style={styles.feedHeader}>
            {/* ✅ AJOUT: Logo INSANE à gauche */}
            <View style={styles.feedHeaderLeft}>
              <Logo size={40} />
            </View>
            
            {/* Titre au centre */}
            <Text style={styles.feedHeaderTitle}>
              {language === 'fr' ? 'Feed' : 'Feed'}
            </Text>
            
            {/* Boutons à droite */}
            <View style={styles.feedHeaderRight}>
              {/* ✅ Cloche "MESSAGES" (chat DJ/Booker) */}
              {user?.isAuthenticated && chatUnreadCount > 0 && (
                <TouchableOpacity
                  style={styles.notificationsButton}
                  onPress={openChatNotifications}
                >
                  <Ionicons name="notifications" size={24} color="#FF1744" />
                  <NotificationBadge count={chatUnreadCount} />
                </TouchableOpacity>
              )}

              {feedNotificationsCount > 0 && (
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

          {/* Liste du feed */}
          {loadingFeed ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF1744" />
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
                  tintColor="#FF1744"
                  colors={['#FF1744']}
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
                    const profileName = isDj
                      ? item.dj?.artistName
                      : (item.booker?.name || item.author?.username);
                    const profileImage = isDj ? normalizeMediaUrl(item.dj?.profileImage) : null;
                    const profileLocation = isDj ? item.dj?.city : null;
                    const isAuthor = user?.id && item.author?.id === user.id;
                    const imageUri = normalizeMediaUrl(item.imageUrl);
                    const isBrokenImage = !!brokenPostImages[item.id];
                    
                    return (
                      <View key={`post-${item.id}`} style={styles.postCard}>
                        <View style={styles.postHeader}>
                          <TouchableOpacity
                            style={styles.postHeaderLeft}
                            onPress={() => {
                              if (isDj && item.dj) {
                                navigate('djProfile', {
                                  djId: item.dj.id,
                                  djUserId: item.dj.userId,
                                });
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
                          {/* ✅ AJOUT: Bouton de suppression (visible uniquement pour l'auteur) */}
                          {isAuthor && (
                            <TouchableOpacity
                              style={styles.deletePostButton}
                              onPress={() => handleDeletePost(item.id)}
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
                                if (__DEV__) {
                                  console.warn('Erreur chargement image post:', error?.nativeEvent?.error);
                                  console.warn('URL de l\'image:', imageUri);
                                }
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
                            {postComments[item.id] && postComments[item.id].length > 0 && (
                              <Text style={styles.postActionText}>
                                {postComments[item.id].length}
                              </Text>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.postActionButton}>
                            <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.6)" />
                          </TouchableOpacity>
                          {isAuthor ? (
                            <TouchableOpacity
                              style={styles.deletePostButton}
                              onPress={() => handleDeletePost(item.id)}
                            >
                              <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={styles.reportPostButton}
                              onPress={() => reportPost(item.id)}
                              activeOpacity={0.75}
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
                    return (
                      <TouchableOpacity
                        key={`event-${item.id}`}
                        style={styles.eventCard}
                        onPress={() => navigate('eventDetail', { eventId: item.id })}
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
          )}

          {/* ✅ TOGGLE menu bas désactivé */}
          {false && (
            <TouchableOpacity
              style={styles.menuToggleButton}
              onPress={toggleMenu}
              activeOpacity={0.8}
            >
              <View style={styles.menuToggleButtonContent}>
                <Ionicons
                  name={showMenu ? "chevron-down" : "chevron-up"}
                  size={24}
                  color="#FF1744"
                />
                <Text style={styles.menuToggleButtonText}>
                  {showMenu
                    ? (language === 'fr' ? 'Masquer le menu' : 'Hide menu')
                    : (language === 'fr' ? 'Afficher le menu' : 'Show menu')
                  }
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
      
      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={hideToast}
      />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  contentOverlay: {
    flex: 1,
    zIndex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  headerRight: {
    width: 44, // Même largeur que menuButton pour équilibrer
  },
  headerTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 12,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  usernameText: {
    color: '#FF1744',
    fontSize: 20,
    fontWeight: '600',
  },
  // ✅ MENU: Styles pour le menu d'actions en bas
  menuContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: MENU_HEIGHT,
    backgroundColor: '#0b0b0e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,23,68,0.3)',
    zIndex: 2,
  },
  menuContent: {
    flex: 1,
  },
  menuScroll: {
    flex: 1,
  },
  menuScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  menuTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    width: '45%',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logoutButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  // ✅ FEED: Styles pour le feed par-dessus le menu
  feedContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0b0b0e',
    zIndex: 3,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  feedHeaderLeft: {
    width: 40,
    alignItems: 'flex-start',
  },
  feedHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
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
    padding: 8,
    marginRight: 12,
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
  // ✅ POST: Styles pour les posts du feed
  postCard: {
    backgroundColor: '#0b0b0e',
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
    backgroundColor: '#FF1744',
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
    color: '#FF1744',
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
    color: '#FF1744',
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
  // ✅ BOUTON: Styles pour le bouton de toggle du menu
  menuToggleButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1f',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,23,68,0.3)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuToggleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuToggleButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '700',
  },
});
