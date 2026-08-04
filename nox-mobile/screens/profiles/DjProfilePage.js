import React, { useState, useEffect, useRef } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Alert,
} from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
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
import { NoxText, NoxButton, NoxCard } from '../../components/nox';
import { Spacing } from '../../constants/theme';
import { resolveStreamingEmbed } from '../../utils/streamingEmbedUrl';
import { styles } from './DjProfilePage.styles';

export default function DjProfilePage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { djId, djUserId, selectionMode, selectedDjIds = [], returnTo, eventId, slotIndex = null, slotIntent = 'fill', replaceDjId = null, isSlotMode = false } = routeParams || {};
  
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
          <NoxText variant="secondary" style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </NoxText>
        </View>
      </View>
    );
  }

  if (!dj || !ratings) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <NoxText variant="secondary" style={styles.errorText}>
            {language === 'fr' ? 'Profil non trouvé' : 'Profile not found'}
          </NoxText>
        </View>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <StatusBar style="light" />

        <View style={[styles.topBar, { paddingTop: (insets?.top ?? 0) + Spacing.sm }]}>
          <TouchableOpacity onPress={handleBack} hitSlop={12} style={styles.topBarBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <NoxText variant="titleSecondary">{dj.artistName}</NoxText>
            <NoxText variant="secondary">
              {dj.mainCity || dj.city || (language === 'fr' ? 'Artiste' : 'Artist')}
            </NoxText>
          </View>
          <View style={styles.topBarBtn} />
        </View>

        <View style={styles.profileHero}>
          <View style={styles.banner}>
            {bannerImage ? (
              <Image
                source={{ uri: normalizeMediaUrl(bannerImage) }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="musical-notes-outline" size={32} color={primaryAlpha(0.45)} />
            )}
          </View>
          <View style={styles.avatarWrap}>
            {normalizeMediaUrl(profileImage) ? (
              <Image
                source={{ uri: normalizeMediaUrl(profileImage) }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <NoxText variant="title">
                  {dj.artistName?.charAt(0)?.toUpperCase() || 'D'}
                </NoxText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.identityBlock}>
          <NoxText variant="title" style={styles.djName}>
            {dj.artistName}
          </NoxText>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
            <NoxText variant="secondary">
              {dj.mainCity || dj.city || (language === 'fr' ? 'Ville non renseignée' : 'City not set')}
            </NoxText>
          </View>

          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatPill}>
              <NoxText variant="secondary" style={styles.quickStatLabel}>
                {language === 'fr' ? 'Note' : 'Rating'}
              </NoxText>
              <View style={styles.quickStatValueRow}>
                <NoxText variant="titleSecondary" style={styles.quickStatValue}>
                  {(ratings?.averageRatingGlobal ?? 0).toFixed
                    ? Number(ratings.averageRatingGlobal).toFixed(1)
                    : '0.0'}
                </NoxText>
                <StarRating
                  rating={Number(ratings?.averageRatingGlobal || 0)}
                  size={14}
                  showStars
                  showValue={false}
                />
              </View>
            </View>
            <View style={[styles.quickStatPill, dj.availableStatus === false && styles.quickStatPillMuted]}>
              <NoxText variant="secondary" style={styles.quickStatLabel}>
                {language === 'fr' ? 'Dispo' : 'Avail.'}
              </NoxText>
              <NoxText variant="form" style={styles.quickStatValueSmall}>
                {dj.availableStatus === false
                  ? language === 'fr'
                    ? 'Indisponible'
                    : 'Unavailable'
                  : language === 'fr'
                    ? 'Disponible'
                    : 'Available'}
              </NoxText>
            </View>
          </View>

          <View style={styles.headerBadgesRow}>
            {dj.genre ? (
              <View style={styles.badge}>
                <NoxText variant="secondary" style={styles.badgeText}>
                  {dj.genre}
                </NoxText>
              </View>
            ) : null}
            {dj.languages ? (
              <View style={styles.badgeSecondary}>
                <NoxText variant="secondary" style={styles.badgeSecondaryText}>
                  {dj.languages}
                </NoxText>
              </View>
            ) : null}
          </View>

          {!selectionMode && user?.token && dj.userId !== user?.id ? (
            <NoxButton
              label={
                loadingFollow
                  ? '…'
                  : following
                    ? language === 'fr'
                      ? 'Abonné'
                      : 'Following'
                    : language === 'fr'
                      ? 'Suivre'
                      : 'Follow'
              }
              variant={following ? 'secondary' : 'primary'}
              onPress={handleFollowToggle}
              disabled={loadingFollow}
              style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
            />
          ) : null}

          {selectionMode ? (
            <NoxButton
              label={
                selectedDjIds.includes(dj.userId)
                  ? language === 'fr'
                    ? 'Désélectionner'
                    : 'Deselect'
                  : language === 'fr'
                    ? 'Sélectionner'
                    : 'Select'
              }
              variant={selectedDjIds.includes(dj.userId) ? 'secondary' : 'primary'}
              style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
              onPress={() => {
                const slotIndexToPass =
                  slotIndex !== null && slotIndex !== undefined ? slotIndex : undefined;
                const pickToken = `${Date.now()}-${dj.userId}-${slotIndexToPass ?? 'x'}`;
                navigate(returnTo || 'bookerDashboard', {
                  selectedDjId: dj.userId,
                  selectedDjName: dj.artistName,
                  action: selectedDjIds.includes(dj.userId) ? 'remove' : 'add',
                  eventId: eventId || undefined,
                  slotIndex: slotIndexToPass,
                  slotIntent: slotIntent || (replaceDjId ? 'replace' : 'fill'),
                  pickToken,
                  ...(returnTo === 'bookerEventDashboard' ? { resumeStep: 3 } : {}),
                });
              }}
            />
          ) : (
            user?.activeProfileType === 'BOOKER' && (
              <>
                <NoxButton
                  label={
                    dj.availableStatus === false
                      ? language === 'fr'
                        ? 'Indisponible'
                        : 'Unavailable'
                      : language === 'fr'
                        ? 'Booker ce DJ'
                        : 'Book this DJ'
                  }
                  disabled={dj.availableStatus === false}
                  style={{ marginTop: Spacing.md, alignSelf: 'stretch' }}
                  onPress={() => {
                    if (dj.availableStatus === false) {
                      showError(
                        language === 'fr'
                          ? "Ce DJ n'est pas disponible pour le moment."
                          : 'This DJ is not available at the moment.',
                      );
                    }
                  }}
                />
                {dj.availableStatus === false ? (
                  <NoxText variant="secondary" style={styles.unavailableHint}>
                    {language === 'fr'
                      ? 'Ce DJ est marqué comme indisponible.'
                      : 'This DJ has marked themselves as unavailable.'}
                  </NoxText>
                ) : null}
              </>
            )
          )}
        </View>

      {/* Bio */}
      <NoxCard style={styles.card}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {language === 'fr' ? 'Bio' : 'Bio'}
        </NoxText>
        <NoxText variant="description" style={[styles.bioText, !dj.bio && styles.bioTextEmpty]}>
          {dj.bio ||
            (language === 'fr'
              ? "Ce DJ n'a pas encore ajouté de bio."
              : 'This DJ has not added a bio yet.')}
        </NoxText>
      </NoxCard>

      {/* SoundCloud + Spotify */}
      <NoxCard style={styles.card}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {language === 'fr' ? 'Musique' : 'Music'}
        </NoxText>
        <NoxText variant="secondary" style={styles.streamSectionIntro}>
          {language === 'fr'
            ? 'Lecture dans l’app via le lecteur intégré (Spotify / SoundCloud).'
            : 'In-app playback via the built-in player (Spotify / SoundCloud).'}
        </NoxText>
        {!dj.spotifyUrl && !dj.soundcloudUrl ? (
          <NoxText variant="secondary" style={styles.emptyHint}>
            {language === 'fr'
              ? 'Aucun lien Spotify / SoundCloud renseigné.'
              : 'No Spotify / SoundCloud links yet.'}
          </NoxText>
        ) : (
          <View style={styles.streamBlock}>
            {dj.spotifyUrl ? (
              <View style={styles.streamProviderBlock}>
                <NoxText variant="form" style={styles.streamProviderLabel}>
                  Spotify
                </NoxText>
                <NoxButton
                  label={language === 'fr' ? 'Écouter dans l’app' : 'Listen in app'}
                  onPress={() => openBuiltInStream(dj.spotifyUrl, 'spotify')}
                  style={{ marginBottom: Spacing.sm }}
                />
                <NoxButton
                  label={language === 'fr' ? 'Ouvrir Spotify' : 'Open Spotify'}
                  variant="ghost"
                  onPress={() => Linking.openURL(dj.spotifyUrl)}
                />
              </View>
            ) : null}
            {dj.soundcloudUrl ? (
              <View style={[styles.streamProviderBlock, dj.spotifyUrl ? styles.streamProviderBlockSpaced : null]}>
                <NoxText variant="form" style={styles.streamProviderLabel}>
                  SoundCloud
                </NoxText>
                <NoxButton
                  label={language === 'fr' ? 'Écouter dans l’app' : 'Listen in app'}
                  onPress={() => openBuiltInStream(dj.soundcloudUrl, 'soundcloud')}
                  style={{ marginBottom: Spacing.sm }}
                />
                <NoxButton
                  label={language === 'fr' ? 'Ouvrir SoundCloud' : 'Open SoundCloud'}
                  variant="ghost"
                  onPress={() => Linking.openURL(dj.soundcloudUrl)}
                />
              </View>
            ) : null}
          </View>
        )}
      </NoxCard>

      {/* Médias: un seul bouton qui regroupe photos + vidéos */}
      <View style={styles.mediaSection}>
        <TouchableOpacity
          style={[styles.mediaButton, activeTab === 'media' && styles.mediaButtonActive]}
          onPress={() => setActiveTab(activeTab === 'media' ? 'none' : 'media')}
          activeOpacity={0.85}
        >
          <NoxText variant="form" style={styles.mediaButtonText}>
            {language === 'fr' ? 'Médias (photos & vidéos)' : 'Media (photos & videos)'}
          </NoxText>
          <NoxText variant="secondary" style={styles.mediaButtonSub}>
            {language === 'fr'
              ? `${media.photos.length} photo(s) • ${media.videos.length} vidéo(s)`
              : `${media.photos.length} photo(s) • ${media.videos.length} video(s)`}
          </NoxText>
        </TouchableOpacity>

        {activeTab === 'media' && (
          <View style={styles.mediaContent}>
            {/* Vidéos */}
            {media.videos && media.videos.length > 0 ? (
              <>
                <NoxText variant="secondary" style={styles.mediaSubtitle}>
                  {language === 'fr' ? 'Vidéos' : 'Videos'}
                </NoxText>
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
                                <Ionicons name="videocam-outline" size={28} color={Colors.primary} />
                                <NoxText variant="secondary" style={styles.videoPlaceholderText} numberOfLines={2}>
                                  {videoTitle}
                                </NoxText>
                              </View>
                            )}
                            {!isUnavailable && (
                              <View style={styles.playButtonOverlay}>
                                <Text style={styles.playIconWhite}>▶</Text>
                              </View>
                            )}
                          </View>
                          <NoxText
                            variant="secondary"
                            style={[styles.videoTitle, isUnavailable && styles.videoTitleUnavailable]}
                            numberOfLines={2}
                          >
                            {videoTitle}
                          </NoxText>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            ) : null}

            {/* Photos */}
            {media.photos && media.photos.length > 0 ? (
              <>
                <NoxText variant="secondary" style={styles.mediaSubtitle}>
                  {language === 'fr' ? 'Photos' : 'Photos'}
                </NoxText>
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
              <NoxText variant="secondary" style={styles.noMedia}>
                {language === 'fr' ? 'Aucun média disponible' : 'No media available'}
              </NoxText>
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
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            {language === 'fr' ? 'Avis' : 'Reviews'}
          </NoxText>
          {ratings.allRatings && ratings.allRatings.length > 0 ? (
            ratings.allRatings.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewItem}>
                <View style={styles.reviewHeader}>
                  <Ionicons name="chatbubble-outline" size={14} color={Colors.primary} />
                  <NoxText variant="form" style={styles.reviewerName}>
                    {review.raterType === 'COMMUNITY'
                      ? language === 'fr' ? 'Communauté' : 'Community'
                      : review.raterType === 'BOOKER'
                      ? (language === 'fr' ? 'Organisateur' : 'Organizer')
                      : language === 'fr' ? 'Lieu' : 'Venue'}
                  </NoxText>
                </View>
                <StarRating rating={review.rating} size={16} showStars={false} />
                {review.comment ? (
                  <NoxText variant="secondary" style={styles.reviewComment}>
                    {review.comment}
                  </NoxText>
                ) : null}
              </View>
            ))
          ) : (
            <NoxText variant="secondary" style={styles.noReviews}>
              {language === 'fr' ? 'Aucun avis pour le moment' : 'No reviews yet'}
            </NoxText>
          )}
        </View>

        <View style={styles.equipmentColumn}>
          <NoxText variant="titleSecondary" style={styles.sectionTitle}>
            {language === 'fr' ? 'Matériel' : 'Equipment'}
          </NoxText>
          {dj.equipment ? (
            <NoxText variant="description" style={styles.equipmentText}>
              {dj.equipment}
            </NoxText>
          ) : (
            <View style={styles.equipmentList}>
              <NoxText variant="secondary" style={styles.equipmentItem}>• CDJ-3000</NoxText>
              <NoxText variant="secondary" style={styles.equipmentItem}>• DJM-900NX32</NoxText>
              <NoxText variant="secondary" style={styles.equipmentItem}>• Moniteurs Pioneer</NoxText>
            </View>
          )}
        </View>
      </View>

      {/* Calendrier */}
      <NoxCard style={[styles.card, { marginBottom: Spacing.xl }]}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {language === 'fr' ? 'Calendrier' : 'Calendar'}
        </NoxText>

        {events.upcomingEvents && events.upcomingEvents.length > 0 ? (
          events.upcomingEvents.slice(0, 3).map((event) => {
            const eventDate = new Date(event.date);
            const monthNames = language === 'fr'
              ? ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
              : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
            const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')} ${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;

            return (
              <View key={event.id} style={styles.eventBox}>
                <NoxText variant="form" style={styles.eventDate}>{formattedDate}</NoxText>
                <NoxText variant="titleSecondary" style={styles.eventName}>{event.title}</NoxText>
                {event.venue ? (
                  <NoxText variant="secondary" style={styles.eventVenue}>{event.venue.name}</NoxText>
                ) : null}
              </View>
            );
          })
        ) : (
          <View style={styles.eventBox}>
            <NoxText variant="secondary" style={styles.eventDate}>
              {language === 'fr' ? 'Aucun événement à venir' : 'No upcoming events'}
            </NoxText>
          </View>
        )}

        {events.pastEvents && events.pastEvents.length > 0 ? (
          <>
            <NoxText variant="secondary" style={styles.pastEventsTitle}>
              {language === 'fr' ? 'Événements passés' : 'Past events'}
            </NoxText>
            {events.pastEvents.slice(0, 5).map((event) => {
              const eventDate = new Date(event.date);
              const monthNames = language === 'fr'
                ? ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC']
                : ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
              const formattedDate = `${eventDate.getDate().toString().padStart(2, '0')} ${monthNames[eventDate.getMonth()]} ${eventDate.getFullYear()}`;

              return (
                <View key={event.id} style={styles.pastEventBox}>
                  <NoxText variant="secondary" style={styles.pastEventDate}>{formattedDate}</NoxText>
                  {event.title ? (
                    <NoxText variant="form" style={styles.pastEventName}>{event.title}</NoxText>
                  ) : null}
                </View>
              );
            })}
          </>
        ) : null}
      </NoxCard>

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

