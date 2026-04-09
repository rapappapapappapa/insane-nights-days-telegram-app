import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
  Modal,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
// Audio migration: expo-av -> expo-audio (no direct replacement for setIsEnabledAsync)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, API_CONFIG, normalizeMediaUrl } from '../../api/config';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';
// AudioPlayer retiré: plus d'audio mp3 dans le profil DJ
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Générer une image différente basée sur le nom du DJ
const getDjImage = (djName) => {
  if (!djName) return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop';
  // Utiliser le hash du nom pour sélectionner une image différente
  const hash = djName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const images = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop',
  ];
  return images[hash % images.length];
};

// Générer une image de background différente
const getDjBackgroundImage = (djName) => {
  if (!djName) return 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop';
  const hash = djName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const images = [
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=800&h=400&fit=crop',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&h=400&fit=crop',
  ];
  return images[hash % images.length];
};

export default function DjProfilePage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { djId, djUserId, selectionMode, selectedDjIds = [], returnTo, eventId, slotIndex = null, isSlotMode = false } = routeParams || {};
  
  const [dj, setDj] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('media');
  const [media, setMedia] = useState({ photos: [], videos: [], audio: [] });
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [events, setEvents] = useState({ upcomingEvents: [], pastEvents: [] });
  const previousTabRef = useRef(activeTab);
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  // Drawer global géré dans App.js

  useEffect(() => {
    if (djId || djUserId) {
      fetchDjProfile();
    }
  }, [djId, djUserId]);

  // Charger le statut d'abonnement (suivre ce profil DJ)
  useEffect(() => {
    if (!user?.token || !dj?.id || dj.userId === user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.getFollowStatus(user.token, { djId: dj.id });
        if (mounted && res?.success) setFollowing(!!res.following);
      } catch {
        if (mounted) setFollowing(false);
      }
    })();
    return () => { mounted = false; };
  }, [user?.token, user?.id, dj?.id, dj?.userId]);

  // Note: plus d'onglet audio, rien à stopper au changement d'onglet

  // Fonction pour arrêter l'audio et revenir en arrière
  const handleBack = async () => {
    // Note: expo-audio gère automatiquement le nettoyage des players
    // quand les composants sont démontés, pas besoin d'arrêter manuellement
    goBack();
  };

  const handleFollowToggle = async () => {
    if (!user?.token || !dj?.id || loadingFollow) return;
    if (dj.userId === user?.id) return;
    setLoadingFollow(true);
    try {
      if (following) {
        await api.unfollowDj(user.token, dj.id);
        setFollowing(false);
        showSuccess(language === 'fr' ? 'Abonnement retiré.' : 'Unfollowed.');
      } else {
        await api.followDj(user.token, dj.id);
        setFollowing(true);
        showSuccess(language === 'fr' ? 'Vous suivez ce DJ.' : 'You now follow this DJ.');
      }
    } catch (e) {
      showError(e?.message || (language === 'fr' ? 'Erreur.' : 'Error.'));
    } finally {
      setLoadingFollow(false);
    }
  };

  const fetchDjProfile = async () => {
    setLoading(true);
    try {
      // Récupérer les notes et les infos du DJ
      const identifier = djUserId || djId;
      const ratingsResponse = await api.getDjRatings(identifier);
      
      if (ratingsResponse && ratingsResponse.success) {
        setRatings(ratingsResponse.ratings);
        // Utiliser les infos du DJ depuis l'API
        if (ratingsResponse.dj) {
          setDj({
            id: ratingsResponse.dj.id,
            userId: ratingsResponse.dj.userId,
            artistName: ratingsResponse.dj.artistName,
            city: ratingsResponse.dj.city,
            phone: ratingsResponse.dj.phone,
            birthDate: ratingsResponse.dj.birthDate,
            // Champs éditables
            bio: ratingsResponse.dj.bio,
            genre: ratingsResponse.dj.genre,
            mainCity: ratingsResponse.dj.mainCity,
            languages: ratingsResponse.dj.languages,
            // ✅ Tarifs retirés (prix à convenir via contrat Booker ↔ DJ)
            availableStatus: ratingsResponse.dj.availableStatus,
            soundcloudUrl: ratingsResponse.dj.soundcloudUrl,
            spotifyUrl: ratingsResponse.dj.spotifyUrl,
            youtubeUrl: ratingsResponse.dj.youtubeUrl,
            instagramUrl: ratingsResponse.dj.instagramUrl,
            tiktokUrl: ratingsResponse.dj.tiktokUrl,
            equipment: ratingsResponse.dj.equipment,
            averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
          });

          // Récupérer les médias (depuis la réponse ou via API séparée)
          const allMedia = ratingsResponse.media || [];
          if (allMedia.length > 0) {
            setMedia({
              photos: allMedia.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner'),
              videos: allMedia.filter(m => m.type === 'video'),
              audio: [], // audio supprimé
            });
            
            // Photo de profil et bannière
            const profileImg = allMedia.find(m => m.type === 'photo' && m.title === 'profile');
            const bannerImg = allMedia.find(m => m.type === 'photo' && m.title === 'banner');
            if (profileImg) setProfileImage(profileImg.url);
            if (bannerImg) setBannerImage(bannerImg.url);
          } else {
            // Fallback : récupérer les médias via API séparée
            try {
              const mediaResponse = await api.getDjMedia(identifier);
              if (mediaResponse && mediaResponse.success) {
                const mediaList = mediaResponse.media || [];
                setMedia({
                  photos: mediaList.filter(m => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner'),
                  videos: mediaList.filter(m => m.type === 'video'),
                  audio: [], // audio supprimé
                });
                
                const profileImg = mediaList.find(m => m.type === 'photo' && m.title === 'profile');
                const bannerImg = mediaList.find(m => m.type === 'photo' && m.title === 'banner');
                if (profileImg) setProfileImage(profileImg.url);
                if (bannerImg) setBannerImage(bannerImg.url);
              }
            } catch (mediaError) {
              console.error('Erreur récupération médias:', mediaError);
            }
          }
        } else {
          // Fallback si les infos ne sont pas disponibles
          setDj({
            id: djId,
            userId: djUserId,
            artistName: routeParams?.djName || 'DJ',
            city: 'Ville inconnue',
            averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
          });
        }
      }

      // Récupérer les événements du DJ
      try {
        const identifier = djUserId || djId;
        const eventsResponse = await api.getDjEvents(identifier);
        if (eventsResponse && eventsResponse.success) {
          setEvents({
            upcomingEvents: eventsResponse.upcomingEvents || [],
            pastEvents: eventsResponse.pastEvents || [],
          });
        }
      } catch (eventsError) {
        console.error('Erreur récupération événements DJ:', eventsError);
        // Ne pas bloquer l'affichage si les événements ne peuvent pas être chargés
      }
    } catch (error) {
      console.error('Erreur récupération profil DJ:', error);
      showError(language === 'fr' ? 'Impossible de charger le profil.' : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  if (!dj || !ratings) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === 'fr' ? 'Profil non trouvé' : 'Profile not found'}
          </Text>
        </View>
      </View>
    );
  }

  return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar style="light" />
      
        {/* Bouton retour */}
        <TouchableOpacity style={[styles.backButton, { top: (insets?.top ?? 0) + 10 }]} onPress={handleBack}>
          <Text style={styles.backButtonText}>
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </Text>
        </TouchableOpacity>
      
      {/* Header avec photo de profil et background */}
      <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 70 }]}>
        <View style={styles.backgroundImage}>
          <Image
            source={{ uri: bannerImage || getDjBackgroundImage(dj.artistName) }}
            style={styles.backgroundImageContent}
            blurRadius={3}
          />
        </View>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: normalizeMediaUrl(profileImage) || getDjImage(dj.artistName) }}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.djName}>{dj.artistName}</Text>
          <Text style={styles.djLocation}>📍 {dj.mainCity || dj.city || 'Ville inconnue'}, France</Text>

          {/* Stats rapides */}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatPill}>
              <Text style={styles.quickStatLabel}>{language === 'fr' ? 'Note' : 'Rating'}</Text>
              <View style={styles.quickStatValueRow}>
                <Text style={styles.quickStatValue}>
                  {(ratings?.averageRatingGlobal ?? 0).toFixed ? ratings.averageRatingGlobal.toFixed(1) : (ratings?.averageRatingGlobal ?? '0.0')}
                </Text>
                <View style={styles.quickStatStars}>
                  <StarRating rating={Number(ratings?.averageRatingGlobal || 0)} size={14} showStars={true} showValue={false} />
                </View>
              </View>
            </View>

            <View style={[styles.quickStatPill, dj.availableStatus === false && styles.quickStatPillMuted]}>
              <Text style={styles.quickStatLabel}>{language === 'fr' ? 'Dispo' : 'Avail.'}</Text>
              <Text style={styles.quickStatValueSmall}>
                {dj.availableStatus === false
                  ? (language === 'fr' ? 'Indisponible' : 'Unavailable')
                  : (language === 'fr' ? 'Disponible' : 'Available')}
              </Text>
            </View>
          </View>

          {/* Badges principaux (style + langues) */}
          <View style={styles.headerBadgesRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🎧 {dj.genre || (language === 'fr' ? 'Style' : 'Style')}</Text>
            </View>
            {dj.languages ? (
              <View style={styles.badgeSecondary}>
                <Text style={styles.badgeSecondaryText}>🗣️ {dj.languages}</Text>
              </View>
            ) : null}
          </View>
          {/* Bouton Suivre (profil DJ) - visible si connecté, pas son propre profil, pas en mode sélection */}
          {!selectionMode && user?.token && dj.userId !== user?.id && (
            <TouchableOpacity
              style={[styles.followButton, following && styles.followButtonActive]}
              onPress={handleFollowToggle}
              disabled={loadingFollow}
            >
              {loadingFollow ? (
                <Text style={styles.followButtonText}>...</Text>
              ) : (
                <Text style={[styles.followButtonText, following && styles.followButtonTextActive]}>
                  {following ? (language === 'fr' ? 'Abonné ✓' : 'Following ✓') : (language === 'fr' ? 'Suivre' : 'Follow')}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {selectionMode ? (
            <TouchableOpacity 
              style={[styles.bookButton, selectedDjIds.includes(dj.userId) && styles.bookButtonSelected]}
              onPress={() => {
                // Retourner au dashboard avec la sélection
                const slotIndexToPass = (slotIndex !== null && slotIndex !== undefined) ? slotIndex : undefined;
                navigate(returnTo || 'bookerDashboard', {
                  selectedDjId: dj.userId,
                  selectedDjName: dj.artistName,
                  action: selectedDjIds.includes(dj.userId) ? 'remove' : 'add',
                  eventId: eventId || undefined,
                  slotIndex: slotIndexToPass, // Toujours passer slotIndex s'il est défini
                });
              }}
            >
            <Text style={styles.bookButtonText}>
                {selectedDjIds.includes(dj.userId)
                  ? (language === 'fr' ? '✓ DÉSÉLECTIONNER' : '✓ DESELECT')
                  : (language === 'fr' ? 'SÉLECTIONNER' : 'SELECT')}
            </Text>
          </TouchableOpacity>
          ) : (
            user?.activeProfileType === 'BOOKER' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.bookButton,
                    dj.availableStatus === false && styles.bookButtonDisabled,
                  ]}
                  disabled={dj.availableStatus === false}
                  onPress={() => {
                    if (dj.availableStatus === false) {
                      showError(language === 'fr'
                        ? 'Ce DJ n\'est pas disponible pour le moment.'
                        : 'This DJ is not available at the moment.');
                      return;
                    }
                    // Ici on pourra brancher le flux de booking direct plus tard
                  }}
                >
                  <Text
                    style={[
                      styles.bookButtonText,
                      dj.availableStatus === false && styles.bookButtonTextDisabled,
                    ]}
                  >
                    {dj.availableStatus === false
                      ? language === 'fr'
                        ? 'INDISPONIBLE'
                        : 'UNAVAILABLE'
                      : language === 'fr'
                        ? 'BOOKER CE DJ'
                        : 'BOOK THIS DJ'}
                  </Text>
                </TouchableOpacity>
                {dj.availableStatus === false && (
                  <Text style={styles.unavailableHint}>
                    {language === 'fr'
                      ? 'Ce DJ est marqué comme indisponible par le DJ.'
                      : 'This DJ has marked themselves as unavailable.'}
                  </Text>
                )}
              </>
            )
          )}
        </View>
      </View>

      {/* Bio (simplifiée) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {language === 'fr' ? 'BIO' : 'BIO'}
        </Text>
        <Text style={[styles.bioText, !dj.bio && styles.bioTextEmpty]}>
          {dj.bio || (language === 'fr'
            ? 'Ce DJ n’a pas encore ajouté de bio.'
            : 'This DJ has not added a bio yet.')}
        </Text>
      </View>

      {/* SoundCloud (call-to-action) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>SOUNDCLOUD</Text>
        {dj.soundcloudUrl ? (
          <TouchableOpacity style={styles.soundcloudButton} onPress={() => Linking.openURL(dj.soundcloudUrl)}>
            <Text style={styles.soundcloudButtonText}>
              🎵 {language === 'fr' ? 'Ouvrir SoundCloud' : 'Open SoundCloud'}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.emptyHint}>
            {language === 'fr' ? 'Aucun lien SoundCloud renseigné.' : 'No SoundCloud link provided.'}
          </Text>
        )}
      </View>

      {/* Médias: un seul bouton qui regroupe photos + vidéos */}
      <View style={styles.mediaSection}>
        <TouchableOpacity
          style={[styles.mediaButton, activeTab === 'media' && styles.mediaButtonActive]}
          onPress={() => setActiveTab(activeTab === 'media' ? 'none' : 'media')}
          activeOpacity={0.85}
        >
          <Text style={styles.mediaButtonText}>
            📸 {language === 'fr' ? 'Médias (photos & vidéos)' : 'Media (photos & videos)'}
          </Text>
          <Text style={styles.mediaButtonSub}>
            {language === 'fr'
              ? `${media.photos.length} photo(s) • ${media.videos.length} vidéo(s)`
              : `${media.photos.length} photo(s) • ${media.videos.length} video(s)`}
          </Text>
        </TouchableOpacity>

        {activeTab === 'media' && (
          <View style={styles.mediaContent}>
            {/* Vidéos */}
            {media.videos && media.videos.length > 0 ? (
              <>
                <Text style={styles.mediaSubtitle}>{language === 'fr' ? 'VIDÉOS' : 'VIDEOS'}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.videoRow}>
                  {media.videos
                    .filter(video => {
                      const videoUrl = video?.url || (typeof video === 'string' ? video : null);
                      return videoUrl && typeof videoUrl === 'string';
                    })
                    .map((video, index) => {
                      const videoUrl = video?.url || (typeof video === 'string' ? video : null);
                      const videoTitle = video?.title || `${language === 'fr' ? 'Vidéo' : 'Video'} ${index + 1}`;
                      if (!videoUrl || typeof videoUrl !== 'string') return null;

                      const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
                      const isLocalFileUri = videoUrl.startsWith('file://') || videoUrl.startsWith('content://') ||
                        videoUrl.startsWith('ph://') || videoUrl.startsWith('assets-library://');
                      const isLocalAsset = videoUrl.startsWith('local:') ||
                        (videoTitle && typeof videoTitle === 'string' && (
                          videoTitle.toLowerCase().includes('tracer') ||
                          videoTitle.toLowerCase().includes('gogg')
                        ) && !videoUrl.startsWith('http'));

                      let finalVideoUrl = videoUrl;
                      let isUnavailable = false;
                      if (isLocalFileUri) {
                        isUnavailable = true;
                      } else if (isLocalAsset) {
                        try {
                          if (videoUrl.includes('gogg') || videoUrl.includes('tracer') ||
                              (videoTitle && typeof videoTitle === 'string' && videoTitle.toLowerCase().includes('tracer'))) {
                            finalVideoUrl = require('../../assets/videos/gogg-tracer.mp4');
                          }
                        } catch {
                          finalVideoUrl = videoUrl;
                        }
                      } else {
                        finalVideoUrl = normalizeMediaUrl(videoUrl);
                      }

                      let youtubeId = null;
                      if (isYouTube) {
                        const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                        if (match) youtubeId = match[1];
                      }
                      const thumbnailUrl = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null;

                      return (
                        <TouchableOpacity
                          key={video?.id || index}
                          style={[styles.videoCard, isUnavailable && styles.videoItemUnavailable]}
                          onPress={() => {
                            if (isUnavailable) {
                              showError(language === 'fr'
                                ? 'Vidéo non accessible (upload local).'
                                : 'Video not accessible (local upload).');
                              return;
                            }
                            setSelectedVideo({
                              url: isYouTube ? videoUrl : finalVideoUrl,
                              title: videoTitle,
                              thumbnail: thumbnailUrl,
                              isYouTube: isYouTube,
                            });
                            setVideoPlayerVisible(true);
                          }}
                          activeOpacity={0.7}
                          disabled={isUnavailable}
                        >
                          <View style={styles.videoThumbnail}>
                            {thumbnailUrl ? (
                              <Image
                                source={{ uri: thumbnailUrl }}
                                style={styles.videoThumbnailImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.videoPlaceholder}>
                                <Text style={styles.videoPlaceholderIcon}>🎬</Text>
                                <Text style={styles.videoPlaceholderText} numberOfLines={2}>
                                  {videoTitle}
                                </Text>
                              </View>
                            )}
                            {!isUnavailable && (
                              <View style={styles.playButtonOverlay}>
                                <Text style={styles.playIconWhite}>▶</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[styles.videoTitle, isUnavailable && styles.videoTitleUnavailable]} numberOfLines={2}>
                            {videoTitle}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            ) : null}

            {/* Photos */}
            {media.photos && media.photos.length > 0 ? (
              <>
                <Text style={styles.mediaSubtitle}>{language === 'fr' ? 'PHOTOS' : 'PHOTOS'}</Text>
                <View style={styles.photoGrid}>
                  {media.photos
                    .filter(photo => {
                      const photoUrl = photo?.url || (typeof photo === 'string' ? photo : null);
                      return photoUrl && typeof photoUrl === 'string';
                    })
                    .map((photo, index) => {
                      let photoUrl = photo?.url || (typeof photo === 'string' ? photo : null);
                      if (!photoUrl || typeof photoUrl !== 'string') return null;
                      photoUrl = normalizeMediaUrl(photoUrl);
                      return (
                        <TouchableOpacity
                          key={photo?.id || index}
                          activeOpacity={0.85}
                          onPress={() => {
                            setSelectedPhotoUrl(photoUrl);
                            setPhotoModalVisible(true);
                          }}
                        >
                          <Image
                          key={photo?.id || index}
                          source={{ uri: photoUrl }}
                          style={styles.photoItem}
                          resizeMode="cover"
                          />
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </>
            ) : null}

            {(!media.photos?.length && !media.videos?.length) ? (
              <Text style={styles.noMedia}>
                {language === 'fr' ? 'Aucun média disponible' : 'No media available'}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {/* Photo en plein écran */}
      <Modal
        visible={photoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setPhotoModalVisible(false);
          setSelectedPhotoUrl(null);
        }}
      >
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity
            style={styles.photoModalClose}
            onPress={() => {
              setPhotoModalVisible(false);
              setSelectedPhotoUrl(null);
            }}
          >
            <Text style={styles.photoModalCloseText}>✕</Text>
          </TouchableOpacity>
          {selectedPhotoUrl ? (
            <Image source={{ uri: selectedPhotoUrl }} style={styles.photoModalImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>

      {/* Section Avis et Matériel */}
      <View style={styles.bottomSection}>
        <View style={styles.reviewsColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Avis au DJ' : 'DJ Reviews'}
          </Text>
          {ratings.allRatings && ratings.allRatings.length > 0 ? (
            ratings.allRatings.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewIcon}>💬</Text>
                  <Text style={styles.reviewerName}>
                    {review.raterType === 'COMMUNITY'
                      ? language === 'fr' ? 'Communauté' : 'Community'
                      : review.raterType === 'BOOKER'
                      ? (language === 'fr' ? 'Organisateur' : 'Organizer')
                      : language === 'fr' ? 'Lieu' : 'Venue'}
                  </Text>
                </View>
                <StarRating rating={review.rating} size={16} showStars={false} />
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
              </View>
            ))
          ) : (
            <Text style={styles.noReviews}>
              {language === 'fr' ? 'Aucun avis pour le moment' : 'No reviews yet'}
            </Text>
          )}
        </View>

        <View style={styles.equipmentColumn}>
          <Text style={styles.sectionTitle}>
            {language === 'fr' ? 'Matériel' : 'Equipment'}
          </Text>
          {dj.equipment ? (
            <Text style={styles.equipmentText}>{dj.equipment}</Text>
          ) : (
          <View style={styles.equipmentList}>
            <Text style={styles.equipmentItem}>• CDJ-3000</Text>
            <Text style={styles.equipmentItem}>• DJM-900NX32</Text>
            <Text style={styles.equipmentItem}>• Moniteurs Pioneer</Text>
          </View>
          )}
        </View>
      </View>

      {/* Calendrier */}
      <View style={styles.calendarSection}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity>
            <Text style={styles.calendarArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {language === 'fr' ? 'Calendrier' : 'Calendar'}
          </Text>
          <TouchableOpacity>
            <Text style={styles.calendarArrow}>→</Text>
          </TouchableOpacity>
        </View>
        
        {/* Événements à venir */}
        {events.upcomingEvents && events.upcomingEvents.length > 0 ? (
          events.upcomingEvents.slice(0, 3).map((event) => {
            const eventDate = new Date(event.date);
            const monthNames = language === 'fr' 
              ? ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
              : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')} ${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
            
            return (
              <View key={event.id} style={styles.eventBox}>
                <Text style={styles.eventDate}>{formattedDate}</Text>
                <Text style={styles.eventName}>{event.title}</Text>
                {event.venue && (
                  <Text style={styles.eventVenue}>{event.venue.name}</Text>
                )}
              </View>
            );
          })
        ) : (
        <View style={styles.eventBox}>
            <Text style={styles.eventDate}>
              {language === 'fr' ? 'Aucun événement à venir' : 'No upcoming events'}
            </Text>
        </View>
        )}
        
        {/* Événements passés */}
        {events.pastEvents && events.pastEvents.length > 0 && (
          <>
        <Text style={styles.pastEventsTitle}>
          {language === 'fr' ? 'ÉVÈNEMENTS PASSÉS' : 'PAST EVENTS'}
        </Text>
            {events.pastEvents.slice(0, 5).map((event) => {
              const eventDate = new Date(event.date);
              const monthNames = language === 'fr' 
                ? ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
                : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
              const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')} ${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;
              
              return (
                <View key={event.id} style={styles.pastEventBox}>
                  <Text style={styles.pastEventDate}>{formattedDate}</Text>
                  {event.title && (
                    <Text style={styles.pastEventName}>{event.title}</Text>
                  )}
        </View>
              );
            })}
          </>
        )}
      </View>

      {/* Lecteur vidéo modal */}
      {selectedVideo && (
        <VideoPlayer
          videoUrl={selectedVideo.url}
          thumbnailUrl={selectedVideo.thumbnail}
          title={selectedVideo.title}
          isYouTube={selectedVideo.isYouTube || false}
          visible={videoPlayerVisible}
          onClose={() => {
            setVideoPlayerVisible(false);
            setSelectedVideo(null);
          }}
        />
      )}

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  header: {
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImageContent: {
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  profileSection: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  quickStatPill: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 14, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quickStatPillMuted: {
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickStatLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  quickStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickStatStars: {
    flexShrink: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  quickStatValue: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  quickStatValueSmall: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  headerBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: 'hidden',
    marginBottom: 12,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  djName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  djLocation: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  bookButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  bookButtonSelected: {
    backgroundColor: Colors.primary,
  },
  bookButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  bookButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  bookButtonTextDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  followButton: {
    marginTop: 12,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  followButtonActive: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderColor: Colors.primary,
  },
  followButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  followButtonTextActive: {
    color: Colors.primary,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.22)',
    borderRadius: 18,
    padding: 18,
  },
  sectionTitle: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoItem: {
    marginBottom: 12,
  },
  unavailableHint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bioText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  bioTextEmpty: {
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,23,68,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.28)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  badgeSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  badgeSecondaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  badgesHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  soundcloudButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.45)',
    backgroundColor: 'rgba(255,23,68,0.10)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  soundcloudButtonText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontStyle: 'italic',
  },
  audioPlayer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
    gap: 16,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: Colors.background,
    fontSize: 16,
    marginLeft: 2,
  },
  playIconWhite: {
    color: '#fff',
    fontSize: 20,
    marginLeft: 3,
    fontWeight: 'bold',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  duration: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  photoThumbnails: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  mediaContent: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  videoRow: {
    gap: 12,
    paddingBottom: 6,
    paddingRight: 10,
  },
  videoCard: {
    width: 190,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    padding: 10,
  },
  mediaSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mediaButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  mediaButtonActive: {
    borderColor: 'rgba(255,23,68,0.35)',
    backgroundColor: 'rgba(255,23,68,0.08)',
  },
  mediaButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  mediaButtonSub: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
  },
  mediaSubtitle: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  noMedia: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  videoItem: {
    width: (width - 60) / 2,
    marginBottom: 12,
  },
  videoThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#1a1a1f',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 122, 26, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    position: 'absolute',
  },
  videoPlaceholderIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  videoPlaceholderText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.9,
  },
  playButtonOverlay: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 23, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  videoTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  videoTitleUnavailable: {
    color: 'rgba(255,255,255,0.5)',
    textDecorationLine: 'line-through',
  },
  videoItemUnavailable: {
    opacity: 0.6,
  },
  unavailableOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  unavailableText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  audioUnavailableContainer: {
    backgroundColor: 'rgba(255, 122, 26, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 26, 0.3)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  audioUnavailableTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  audioUnavailableText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoItem: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    borderRadius: 8,
    backgroundColor: '#1a1a1f',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalImage: {
    width: '100%',
    height: '80%',
    borderRadius: 18,
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  bottomSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  reviewsColumn: {
    flex: 1,
    paddingRight: 10,
  },
  equipmentColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  reviewItem: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  reviewerName: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  reviewComment: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  noReviews: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontStyle: 'italic',
  },
  equipmentList: {
    gap: 8,
  },
  equipmentItem: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  equipmentText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  calendarSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  calendarArrow: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  eventBox: {
    backgroundColor: 'rgba(255,23,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  eventDate: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  eventVenue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  pastEventsTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  pastEventBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pastEventDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  pastEventName: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(11, 11, 14, 0.7)',
    borderRadius: 8,
  },
  menuButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(11, 11, 14, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
