import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
  Modal,
  Alert,
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
import BuiltInStreamPlayerModal from '../../components/BuiltInStreamPlayerModal';
// AudioPlayer retiré: plus d'audio mp3 dans le profil DJ
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { resolveStreamingEmbed } from '../../utils/streamingEmbedUrl';
import { styles } from './DjProfilePage.styles';

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
  const [streamPlayer, setStreamPlayer] = useState({ visible: false, uri: null, title: '' });
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

  const openBuiltInStream = (url, provider) => {
    if (!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    const resolved = resolveStreamingEmbed(trimmed, provider);
    if (!resolved) {
      Alert.alert(
        language === 'fr' ? 'Lecture intégrée impossible' : 'In-app playback unavailable',
        language === 'fr'
          ? 'Ce lien ne peut pas être chargé dans le lecteur intégré (lien court, page compte, etc.). Colle une URL complète du type open.spotify.com (piste, album, playlist, artiste, podcast) ou une URL SoundCloud https://soundcloud.com/…'
          : 'This link cannot load in the in-app player (short link, profile-only URL, etc.). Use a full open.spotify.com URL (track, album, playlist, artist, show) or an https://soundcloud.com/… URL.',
        [
          { text: language === 'fr' ? 'Annuler' : 'Cancel', style: 'cancel' },
          {
            text: language === 'fr' ? 'Ouvrir dans le navigateur / app' : 'Open in browser / app',
            onPress: () => Linking.openURL(trimmed).catch(() => {}),
          },
        ]
      );
      return;
    }
    setStreamPlayer({
      visible: true,
      uri: resolved.uri,
      title: resolved.title,
    });
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
    <>
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
                  ...(returnTo === 'bookerEventDashboard' ? { resumeStep: 3 } : {}),
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

      {/* SoundCloud + Spotify : lecteur intégré (embed WebView) */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {language === 'fr' ? 'MUSIQUE' : 'MUSIC'}
        </Text>
        <Text style={styles.streamSectionIntro}>
          {language === 'fr'
            ? 'Lecture dans l’app via le lecteur intégré (Spotify / SoundCloud) — le bouton vert lance l’embed ; « Ouvrir dans l’app » est optionnel.'
            : 'In-app playback via the built-in player (Spotify / SoundCloud) — the main button opens the embed; opening the external app is optional.'}
        </Text>
        {!dj.spotifyUrl && !dj.soundcloudUrl ? (
          <Text style={styles.emptyHint}>
            {language === 'fr' ? 'Aucun lien Spotify / SoundCloud renseigné.' : 'No Spotify / SoundCloud links yet.'}
          </Text>
        ) : (
          <View style={styles.streamBlock}>
            {dj.spotifyUrl ? (
              <View style={styles.streamProviderBlock}>
                <Text style={styles.streamProviderLabel}>Spotify</Text>
                <TouchableOpacity
                  style={styles.streamPrimaryButton}
                  onPress={() => openBuiltInStream(dj.spotifyUrl, 'spotify')}
                  accessibilityRole="button"
                  accessibilityLabel={language === 'fr' ? 'Écouter Spotify dans l’application' : 'Listen to Spotify in-app'}
                >
                  <Text style={styles.streamPrimaryButtonText}>
                    ▶ {language === 'fr' ? 'Écouter dans l’app (lecteur intégré)' : 'Listen in app (embedded player)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.streamSecondaryButton}
                  onPress={() => Linking.openURL(dj.spotifyUrl)}
                  accessibilityRole="link"
                >
                  <Text style={styles.streamSecondaryButtonText}>
                    {language === 'fr' ? 'Ouvrir dans l’app Spotify' : 'Open in Spotify app'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
            {dj.soundcloudUrl ? (
              <View style={[styles.streamProviderBlock, dj.spotifyUrl ? styles.streamProviderBlockSpaced : null]}>
                <Text style={styles.streamProviderLabel}>SoundCloud</Text>
                <TouchableOpacity
                  style={styles.streamPrimaryButton}
                  onPress={() => openBuiltInStream(dj.soundcloudUrl, 'soundcloud')}
                  accessibilityRole="button"
                  accessibilityLabel={
                    language === 'fr' ? 'Écouter SoundCloud dans l’application' : 'Listen to SoundCloud in-app'
                  }
                >
                  <Text style={styles.streamPrimaryButtonText}>
                    ▶ {language === 'fr' ? 'Écouter dans l’app (lecteur intégré)' : 'Listen in app (embedded player)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.streamSecondaryButton}
                  onPress={() => Linking.openURL(dj.soundcloudUrl)}
                  accessibilityRole="link"
                >
                  <Text style={styles.streamSecondaryButtonText}>
                    {language === 'fr' ? 'Ouvrir dans SoundCloud' : 'Open in SoundCloud'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
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
                        finalVideoUrl = normalizeMediaUrl(videoUrl) || videoUrl;
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
      <BuiltInStreamPlayerModal
        visible={streamPlayer.visible}
        embedUri={streamPlayer.uri}
        title={streamPlayer.title}
        language={language}
        onClose={() => setStreamPlayer({ visible: false, uri: null, title: '' })}
      />
      </ScrollView>
    </>
  );
}

