import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput, // ✅ AJOUT: Pour les commentaires
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { api, normalizeMediaUrl } from '../api/config';
import EmptyState from '../components/EmptyState';
import { useFeedNotifications } from '../hooks/useFeedNotifications'; // ✅ AJOUT: Hook pour les notifications du feed
import NotificationBadge from '../components/NotificationBadge'; // ✅ AJOUT: Badge de notification
import Logo from '../components/Logo'; // ✅ AJOUT: Logo NOX

/**
 * ✅ AJOUT: Page Feed d'actualité
 * Affiche les posts des DJs et les annonces d'événements dans un feed scrollable
 */
export default function FeedPage() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { navigate } = useNavigation();
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
      Alert.alert(
        language === 'fr' ? 'Notifications' : 'Notifications',
        language === 'fr' ? 'Impossible de charger les notifications.' : 'Unable to load notifications.'
      );
    }
  };

  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // ✅ AJOUT: États pour gérer les likes et commentaires
  const [likedPosts, setLikedPosts] = useState({}); // { postId: true/false }
  const [postLikesCount, setPostLikesCount] = useState({}); // { postId: count }
  const [postComments, setPostComments] = useState({}); // { postId: [comments] }
  const [expandedComments, setExpandedComments] = useState({}); // { postId: true/false }
  const [commentInputs, setCommentInputs] = useState({}); // { postId: text }
  const [brokenPostImages, setBrokenPostImages] = useState({}); // { postId: true }

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
              if (res?.success) {
                Alert.alert(language === 'fr' ? 'Merci' : 'Thanks', language === 'fr' ? 'Signalement envoyé.' : 'Report sent.');
              } else {
                Alert.alert(language === 'fr' ? 'Erreur' : 'Error', res?.message || (language === 'fr' ? 'Impossible d’envoyer.' : 'Unable to send.'));
              }
            } catch (e) {
              Alert.alert(language === 'fr' ? 'Erreur' : 'Error', language === 'fr' ? 'Signalement impossible.' : 'Reporting failed.');
            }
          },
        })),
        { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  useEffect(() => {
    fetchFeed();
  }, []);

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
    // ✅ MODIFICATION: Utiliser 'refreshing' si c'est un rafraîchissement, sinon 'loading'
    // Cela permet d'avoir deux indicateurs différents : un pour le chargement initial, un pour le refresh
    if (isRefresh) {
      setRefreshing(true); // Indicateur de pull-to-refresh (en haut de la liste)
    } else {
      setLoading(true); // Indicateur de chargement initial (centré)
    }

    try {
      const response = await api.getFeed(30, 0); // Récupérer 30 éléments
      if (response && response.success && Array.isArray(response.feed)) {
        setFeed(response.feed);
        // ✅ AJOUT: Initialiser les compteurs de likes avec les valeurs du feed
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

    setLikedPosts(likesState);
    setPostLikesCount(likesCountState);
  };

  /**
   * ✅ AJOUT: Liker ou unliker un post
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
        // Mettre à jour l'état local
        setLikedPosts(prev => ({
          ...prev,
          [postId]: response.liked,
        }));
        setPostLikesCount(prev => ({
          ...prev,
          [postId]: response.likesCount,
        }));
        // ✅ AJOUT: Rafraîchir les notifications après un like
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur like/unlike:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred')
      );
    }
  };

  /**
   * ✅ AJOUT: Charger les commentaires d'un post
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
   * ✅ AJOUT: Toggle l'affichage des commentaires
   */
  const toggleComments = (postId) => {
    const isExpanded = expandedComments[postId];
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !isExpanded,
    }));

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
        // Ajouter le commentaire à la liste
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), response.comment],
        }));
        // Vider l'input
        setCommentInputs(prev => ({
          ...prev,
          [postId]: '',
        }));
        // ✅ AJOUT: Rafraîchir les notifications après un commentaire
        refreshFeedNotifications();
      }
    } catch (error) {
      console.error('Erreur création commentaire:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Une erreur est survenue' : 'An error occurred')
      );
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
              // Booker posts can sometimes miss the embedded booker object (old data / partial responses),
              // so fallback to author username instead of showing "Utilisateur".
              const profileName = isDj
                ? item.dj?.artistName
                : (item.booker?.name || item.author?.username);
              const profileImage = isDj ? item.dj?.profileImage : null;
              const profileLocation = isDj ? item.dj?.city : null;
              const imageUri = normalizeMediaUrl(item.imageUrl);
              const avatarUri = isDj ? normalizeMediaUrl(profileImage) : null;
              const isBrokenImage = !!brokenPostImages[item.id];
              
              return (
                <View key={`post-${item.id}`} style={styles.postCard}>
                  {/* ✅ MODIFICATION: En-tête compacte style Twitter/X */}
                  <View style={styles.postHeader}>
                    <TouchableOpacity
                      style={styles.postHeaderLeft}
                      onPress={() => {
                        if (isDj && item.dj) {
                          handleDjPress(item.dj.id, item.dj.userId);
                        }
                        // TODO: Ajouter navigation vers profil booker si nécessaire
                      }}
                    >
                      <View style={styles.postAvatar}>
                        {avatarUri ? (
                          <Image
                            source={{ uri: avatarUri }}
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

                  {/* ✅ MODIFICATION: Image avec bordures arrondies */}
                  {!!imageUri && !isBrokenImage && (
                    <View style={styles.postImageContainer}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.postImage}
                        resizeMode="cover"
                        onError={() => setBrokenPostImages((prev) => ({ ...prev, [item.id]: true }))}
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
                      {postComments[item.id] && postComments[item.id].length > 0 && (
                        <Text style={styles.postActionText}>
                          {postComments[item.id].length}
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
});
