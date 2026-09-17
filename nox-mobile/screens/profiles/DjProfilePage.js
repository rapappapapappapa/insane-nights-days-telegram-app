import React, { useState, useEffect, useMemo } from 'react';
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
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';
import BuiltInStreamPlayerModal from '../../components/BuiltInStreamPlayerModal';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import { Ionicons } from '@expo/vector-icons';
import { NoxText, NoxButton } from '../../components/nox';
import ProfileWallStream from '../../components/community/ProfileWallStream';
import {
  PublicProfileHero,
  PublicProfileTabs,
  PublicProfileEventCarousel,
  publicProfileStyles as pp,
} from '../../components/publicProfile';
import { Spacing } from '../../constants/theme';
import { resolveStreamingEmbed } from '../../utils/streamingEmbedUrl';
import { styles } from './DjProfilePage.styles';

export default function DjProfilePage() {
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const {
    djId,
    djUserId,
    selectionMode,
    selectedDjIds = [],
    returnTo,
    eventId,
    slotIndex = null,
    slotIntent = 'fill',
    replaceDjId = null,
  } = routeParams || {};
  const fr = language === 'fr';

  const [dj, setDj] = useState(null);
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [media, setMedia] = useState({ photos: [], videos: [], audio: [] });
  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState(null);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [events, setEvents] = useState({ upcomingEvents: [], pastEvents: [] });
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [streamPlayer, setStreamPlayer] = useState({ visible: false, uri: null, title: '' });

  useEffect(() => {
    if (djId || djUserId) fetchDjProfile();
  }, [djId, djUserId]);

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
    return () => {
      mounted = false;
    };
  }, [user?.token, user?.id, dj?.id, dj?.userId]);

  const openBuiltInStream = (url, provider) => {
    if (!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    const resolved = resolveStreamingEmbed(trimmed, provider);
    if (!resolved) {
      Alert.alert(
        fr ? 'Lecture intégrée impossible' : 'In-app playback unavailable',
        fr
          ? 'Ce lien ne peut pas être chargé dans le lecteur intégré. Utilise une URL Spotify / SoundCloud complète.'
          : 'This link cannot load in the in-app player. Use a full Spotify / SoundCloud URL.',
        [
          { text: fr ? 'Annuler' : 'Cancel', style: 'cancel' },
          {
            text: fr ? 'Ouvrir dans le navigateur' : 'Open in browser',
            onPress: () => Linking.openURL(trimmed).catch(() => {}),
          },
        ],
      );
      return;
    }
    setStreamPlayer({ visible: true, uri: resolved.uri, title: resolved.title });
  };

  const handleFollowToggle = async () => {
    if (!user?.token || !dj?.id || loadingFollow) return;
    if (dj.userId === user?.id) return;
    setLoadingFollow(true);
    try {
      if (following) {
        await api.unfollowDj(user.token, dj.id);
        setFollowing(false);
        showSuccess(fr ? 'Abonnement retiré.' : 'Unfollowed.');
      } else {
        await api.followDj(user.token, dj.id);
        setFollowing(true);
        showSuccess(fr ? 'Vous suivez ce DJ.' : 'You now follow this DJ.');
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
    } finally {
      setLoadingFollow(false);
    }
  };

  const fetchDjProfile = async () => {
    setLoading(true);
    try {
      const identifier = djUserId || djId;
      const ratingsResponse = await api.getDjRatings(identifier);

      if (ratingsResponse && ratingsResponse.success) {
        setRatings(ratingsResponse.ratings);
        if (ratingsResponse.dj) {
          setDj({
            id: ratingsResponse.dj.id,
            userId: ratingsResponse.dj.userId,
            artistName: ratingsResponse.dj.artistName,
            city: ratingsResponse.dj.city,
            phone: ratingsResponse.dj.phone,
            birthDate: ratingsResponse.dj.birthDate,
            bio: ratingsResponse.dj.bio,
            genre: ratingsResponse.dj.genre,
            mainCity: ratingsResponse.dj.mainCity,
            languages: ratingsResponse.dj.languages,
            availableStatus: ratingsResponse.dj.availableStatus,
            soundcloudUrl: ratingsResponse.dj.soundcloudUrl,
            spotifyUrl: ratingsResponse.dj.spotifyUrl,
            youtubeUrl: ratingsResponse.dj.youtubeUrl,
            instagramUrl: ratingsResponse.dj.instagramUrl,
            tiktokUrl: ratingsResponse.dj.tiktokUrl,
            equipment: ratingsResponse.dj.equipment,
            followersCount: ratingsResponse.dj.followersCount,
            followingCount: ratingsResponse.dj.followingCount,
            averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
          });

          const allMedia = ratingsResponse.media || [];
          if (allMedia.length > 0) {
            setMedia({
              photos: allMedia.filter(
                (m) => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner',
              ),
              videos: allMedia.filter((m) => m.type === 'video'),
              audio: [],
            });
            const profileImg = allMedia.find((m) => m.type === 'photo' && m.title === 'profile');
            const bannerImg = allMedia.find((m) => m.type === 'photo' && m.title === 'banner');
            if (profileImg) setProfileImage(profileImg.url);
            if (bannerImg) setBannerImage(bannerImg.url);
          } else {
            try {
              const mediaResponse = await api.getDjMedia(identifier);
              if (mediaResponse?.success) {
                const mediaList = mediaResponse.media || [];
                setMedia({
                  photos: mediaList.filter(
                    (m) => m.type === 'photo' && m.title !== 'profile' && m.title !== 'banner',
                  ),
                  videos: mediaList.filter((m) => m.type === 'video'),
                  audio: [],
                });
                const profileImg = mediaList.find((m) => m.type === 'photo' && m.title === 'profile');
                const bannerImg = mediaList.find((m) => m.type === 'photo' && m.title === 'banner');
                if (profileImg) setProfileImage(profileImg.url);
                if (bannerImg) setBannerImage(bannerImg.url);
              }
            } catch (mediaError) {
              console.error('Erreur récupération médias:', mediaError);
            }
          }
        } else {
          setDj({
            id: djId,
            userId: djUserId,
            artistName: routeParams?.djName || 'DJ',
            city: 'Ville inconnue',
            averageRatingGlobal: ratingsResponse.ratings.averageRatingGlobal,
          });
        }
      }

      try {
        const eventsResponse = await api.getDjEvents(identifier);
        if (eventsResponse?.success) {
          setEvents({
            upcomingEvents: eventsResponse.upcomingEvents || [],
            pastEvents: eventsResponse.pastEvents || [],
          });
        }
      } catch (eventsError) {
        console.error('Erreur récupération événements DJ:', eventsError);
      }
    } catch (error) {
      console.error('Erreur récupération profil DJ:', error);
      showError(fr ? 'Impossible de charger le profil.' : 'Unable to load profile.');
    } finally {
      setLoading(false);
    }
  };

  const upcomingEventItems = useMemo(
    () =>
      (events.upcomingEvents || []).slice(0, 8).map((event) => ({
        id: event.id,
        title: event.title,
        date: event.date,
        location: event.venue?.name || event.location || event.city,
        image: event.image || event.coverImage,
        tags: [event.genre, dj?.genre].filter(Boolean),
        onPress: () => navigate('eventDetail', { eventId: event.id }),
      })),
    [events.upcomingEvents, dj?.genre, navigate],
  );

  const openVideo = (video, index) => {
    const videoUrl = video?.url || (typeof video === 'string' ? video : null);
    if (!videoUrl || typeof videoUrl !== 'string') return;
    const videoTitle = video?.title || `${fr ? 'Vidéo' : 'Video'} ${index + 1}`;
    const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
    const isLocalFileUri =
      videoUrl.startsWith('file://') ||
      videoUrl.startsWith('content://') ||
      videoUrl.startsWith('ph://') ||
      videoUrl.startsWith('assets-library://');
    if (isLocalFileUri) {
      showError(fr ? 'Vidéo non accessible (upload local).' : 'Video not accessible (local upload).');
      return;
    }
    let youtubeId = null;
    if (isYouTube) {
      const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
      if (match) youtubeId = match[1];
    }
    setSelectedVideo({
      url: isYouTube ? videoUrl : normalizeMediaUrl(videoUrl),
      title: videoTitle,
      thumbnail: youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null,
      isYouTube,
    });
    setVideoPlayerVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary" style={styles.loadingText}>
            {fr ? 'Chargement...' : 'Loading...'}
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
            {fr ? 'Profil non trouvé' : 'Profile not found'}
          </NoxText>
          <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    );
  }

  const cityLine = [dj.mainCity || dj.city, dj.country].filter(Boolean).join(', ');
  const metaLine = [dj.genre, fr ? 'Artiste' : 'Artist', dj.mainCity || dj.city]
    .filter(Boolean)
    .join(' • ');
  const ratingValue = Number(ratings?.averageRatingGlobal || dj.averageRatingGlobal || 0);
  const eventsCount =
    (events.upcomingEvents?.length || 0) + (events.pastEvents?.length || 0);

  const stats = [
    { label: fr ? 'Followers' : 'Followers', value: dj.followersCount, force: true },
    { label: fr ? 'Suivis' : 'Following', value: dj.followingCount, force: true },
    { label: fr ? 'Événements' : 'Events', value: eventsCount || null, force: true },
    {
      label: fr ? 'Note' : 'Rating',
      value: ratingValue > 0 ? `${ratingValue.toFixed(1)} ★` : null,
      force: true,
    },
  ];

  const showFollow = !selectionMode && !!user?.token && dj.userId !== user?.id;

  const extraActions = selectionMode ? (
    <NoxButton
      label={
        selectedDjIds.includes(dj.userId)
          ? fr
            ? 'Désélectionner'
            : 'Deselect'
          : fr
            ? 'Sélectionner'
            : 'Select'
      }
      variant={selectedDjIds.includes(dj.userId) ? 'secondary' : 'primary'}
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
  ) : user?.activeProfileType === 'BOOKER' && dj.userId !== user?.id ? (
    <NoxButton
      label={
        dj.availableStatus === false
          ? fr
            ? 'Indisponible'
            : 'Unavailable'
          : fr
            ? 'Booker ce DJ'
            : 'Book this DJ'
      }
      disabled={dj.availableStatus === false}
      onPress={() => {
        if (dj.availableStatus === false) {
          showError(
            fr
              ? "Ce DJ n'est pas disponible pour le moment."
              : 'This DJ is not available at the moment.',
          );
        }
      }}
    />
  ) : null;

  const renderAbout = () => (
    <View>
      {(dj.soundcloudUrl || dj.spotifyUrl) && (
        <View style={pp.highlightRow}>
          {dj.soundcloudUrl ? (
            <TouchableOpacity
              style={pp.highlightCard}
              onPress={() => openBuiltInStream(dj.soundcloudUrl, 'soundcloud')}
              activeOpacity={0.85}
            >
              <NoxText variant="secondary" style={pp.highlightLabel}>
                {fr ? 'Mix du moment' : 'Featured mix'}
              </NoxText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="play-circle" size={28} color={Colors.primary} />
                <NoxText style={pp.highlightTitle} numberOfLines={2}>
                  SoundCloud
                </NoxText>
              </View>
            </TouchableOpacity>
          ) : null}
          {dj.spotifyUrl ? (
            <TouchableOpacity
              style={pp.highlightCard}
              onPress={() => openBuiltInStream(dj.spotifyUrl, 'spotify')}
              activeOpacity={0.85}
            >
              <NoxText variant="secondary" style={pp.highlightLabel}>
                {fr ? 'Dernière release' : 'Latest release'}
              </NoxText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="musical-notes" size={24} color={Colors.primary} />
                <NoxText style={pp.highlightTitle} numberOfLines={2}>
                  Spotify
                </NoxText>
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <PublicProfileEventCarousel
        language={language}
        items={upcomingEventItems}
        onSeeAll={() => setActiveTab('events')}
      />

      <View style={[pp.sectionHeader, { marginTop: Spacing.xl }]}>
        <NoxText variant="titleSecondary" style={pp.sectionTitle}>
          {fr ? 'À propos' : 'About'}
        </NoxText>
      </View>
      <View style={pp.aboutGrid}>
        <View style={pp.aboutDetails}>
          {dj.genre ? (
            <View style={pp.aboutRow}>
              <Ionicons name="musical-notes-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {dj.genre}
              </NoxText>
            </View>
          ) : null}
          {cityLine ? (
            <View style={pp.aboutRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {fr ? `Basé à ${cityLine}` : `Based in ${cityLine}`}
              </NoxText>
            </View>
          ) : null}
          <View style={pp.socialRow}>
            {dj.instagramUrl ? (
              <TouchableOpacity
                style={pp.socialChip}
                onPress={() => Linking.openURL(dj.instagramUrl)}
              >
                <Ionicons name="logo-instagram" size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
            {dj.soundcloudUrl ? (
              <TouchableOpacity
                style={pp.socialChip}
                onPress={() => Linking.openURL(dj.soundcloudUrl)}
              >
                <Ionicons name="cloud-outline" size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
            {dj.youtubeUrl ? (
              <TouchableOpacity
                style={pp.socialChip}
                onPress={() => Linking.openURL(dj.youtubeUrl)}
              >
                <Ionicons name="logo-youtube" size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
            {dj.spotifyUrl ? (
              <TouchableOpacity
                style={pp.socialChip}
                onPress={() => Linking.openURL(dj.spotifyUrl)}
              >
                <Ionicons name="musical-note-outline" size={18} color={Colors.text} />
              </TouchableOpacity>
            ) : null}
          </View>
          {dj.equipment ? (
            <View style={pp.aboutRow}>
              <Ionicons name="hardware-chip-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {dj.equipment}
              </NoxText>
            </View>
          ) : null}
        </View>
        {dj.bio ? (
          <View style={pp.quoteCard}>
            <NoxText style={pp.quoteMark}>“</NoxText>
            <NoxText variant="secondary" style={pp.quoteText} numberOfLines={6}>
              {dj.bio}
            </NoxText>
            <NoxText variant="secondary" style={pp.quoteAttr}>
              — {dj.artistName}
            </NoxText>
          </View>
        ) : null}
      </View>

      <View style={pp.sectionHeader}>
        <NoxText variant="titleSecondary" style={pp.sectionTitle}>
          {fr ? 'Médias récents' : 'Recent media'}
        </NoxText>
        <TouchableOpacity onPress={() => setActiveTab('media')} hitSlop={8}>
          <NoxText style={pp.seeAll}>{fr ? 'Voir tout >' : 'See all >'}</NoxText>
        </TouchableOpacity>
      </View>
      {renderMediaGrid(4)}
    </View>
  );

  const renderMediaGrid = (limit = 12) => {
    const videos = (media.videos || []).slice(0, limit);
    const photos = (media.photos || []).slice(0, Math.max(0, limit - videos.length));
    const items = [
      ...videos.map((v, i) => ({ kind: 'video', data: v, index: i })),
      ...photos.map((p, i) => ({ kind: 'photo', data: p, index: i })),
    ].slice(0, limit);

    if (items.length === 0) {
      return (
        <NoxText variant="secondary" style={pp.emptyHint}>
          {fr ? 'Aucun média disponible' : 'No media available'}
        </NoxText>
      );
    }

    return (
      <View style={pp.mediaGrid}>
        {items.map((item) => {
          if (item.kind === 'video') {
            const videoUrl = item.data?.url || item.data;
            const isYouTube =
              typeof videoUrl === 'string' &&
              (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be'));
            let thumb = null;
            if (isYouTube) {
              const match = String(videoUrl).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
              if (match) thumb = `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
            }
            return (
              <TouchableOpacity
                key={`v-${item.data?.id || item.index}`}
                style={pp.mediaThumb}
                onPress={() => openVideo(item.data, item.index)}
                activeOpacity={0.85}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={pp.mediaThumbImage} />
                ) : (
                  <View style={[pp.mediaThumbImage, { alignItems: 'center', justifyContent: 'center' }]}>
                    <Ionicons name="videocam-outline" size={28} color={Colors.primary} />
                  </View>
                )}
                <View style={pp.mediaPlay}>
                  <Ionicons name="play" size={22} color={Colors.text} />
                </View>
              </TouchableOpacity>
            );
          }
          const photoUrl = normalizeMediaUrl(item.data?.url || item.data);
          return (
            <TouchableOpacity
              key={`p-${item.data?.id || item.index}`}
              style={pp.mediaThumb}
              onPress={() => {
                setSelectedPhotoUrl(photoUrl);
                setPhotoModalVisible(true);
              }}
              activeOpacity={0.85}
            >
              <Image source={{ uri: photoUrl }} style={pp.mediaThumbImage} resizeMode="cover" />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderEvents = () => (
    <View>
      <PublicProfileEventCarousel
        language={language}
        title={fr ? 'À venir' : 'Upcoming'}
        items={upcomingEventItems}
      />
      {(events.pastEvents || []).length > 0 ? (
        <>
          <View style={pp.sectionHeader}>
            <NoxText variant="titleSecondary" style={pp.sectionTitle}>
              {fr ? 'Passés' : 'Past'}
            </NoxText>
          </View>
          {(events.pastEvents || []).slice(0, 10).map((event) => {
            const d = event.date ? new Date(event.date) : null;
            const label =
              d && !Number.isNaN(d.getTime())
                ? d.toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '';
            return (
              <TouchableOpacity
                key={event.id}
                style={[pp.aboutRow, { paddingVertical: Spacing.sm }]}
                onPress={() => navigate('eventDetail', { eventId: event.id })}
              >
                <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
                <View style={{ flex: 1 }}>
                  <NoxText variant="form">{event.title}</NoxText>
                  <NoxText variant="secondary" style={{ fontSize: 12 }}>
                    {label}
                  </NoxText>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      ) : null}
    </View>
  );

  const renderReviews = () => {
    const list = ratings.allRatings || [];
    if (list.length === 0) {
      return (
        <NoxText variant="secondary" style={pp.emptyHint}>
          {fr ? 'Aucun avis pour le moment' : 'No reviews yet'}
        </NoxText>
      );
    }
    return (
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {list.slice(0, 12).map((review) => (
            <View key={review.id} style={pp.reviewCard}>
              <View style={pp.reviewHeader}>
                <View style={pp.reviewAvatar}>
                  <Ionicons name="person" size={16} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <NoxText variant="form" numberOfLines={1}>
                    {review.raterType === 'COMMUNITY'
                      ? fr
                        ? 'Communauté'
                        : 'Community'
                      : review.raterType === 'BOOKER'
                        ? fr
                          ? 'Organisateur'
                          : 'Organizer'
                        : fr
                          ? 'Lieu'
                          : 'Venue'}
                  </NoxText>
                  <StarRating rating={review.rating} size={14} showStars showValue={false} />
                </View>
              </View>
              {review.comment ? (
                <NoxText variant="secondary" style={pp.reviewComment} numberOfLines={4}>
                  “{review.comment}”
                </NoxText>
              ) : null}
            </View>
          ))}
        </ScrollView>
        {list.length > 3 ? (
          <TouchableOpacity
            style={{ marginTop: Spacing.md }}
            onPress={() => navigate('djRatings', { djId, djName: dj?.artistName })}
          >
            <NoxText style={pp.seeAll}>
              {fr ? `Voir les ${list.length} avis` : `See all ${list.length} reviews`}
            </NoxText>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={pp.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PublicProfileHero
          language={language}
          onBack={goBack}
          bannerImage={bannerImage}
          profileImage={profileImage}
          name={dj.artistName}
          metaLine={metaLine}
          locationLine={cityLine}
          bio={dj.bio}
          stats={stats}
          showFollow={showFollow}
          following={following}
          loadingFollow={loadingFollow}
          onFollowPress={handleFollowToggle}
          shareMessage={fr ? `Découvre ${dj.artistName} sur NOX` : `Discover ${dj.artistName} on NOX`}
          extraActions={extraActions}
          fallbackIcon="musical-notes"
        />

        <PublicProfileTabs language={language} activeTab={activeTab} onChange={setActiveTab} />

        <View style={pp.tabBody}>
          {activeTab === 'about' ? renderAbout() : null}
          {activeTab === 'feed' ? (
            dj?.id ? (
              <ProfileWallStream
                wallFilter={{ djId: dj.id }}
                isOwnProfile={!!(user?.id && dj.userId === user?.id)}
                enabled
              />
            ) : null
          ) : null}
          {activeTab === 'events' ? renderEvents() : null}
          {activeTab === 'media' ? renderMediaGrid(24) : null}
          {activeTab === 'reviews' ? renderReviews() : null}
        </View>
      </ScrollView>

      <Modal
        visible={photoModalVisible}
        transparent
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

      {selectedVideo ? (
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
      ) : null}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
      <BuiltInStreamPlayerModal
        visible={streamPlayer.visible}
        embedUri={streamPlayer.uri}
        title={streamPlayer.title}
        language={language}
        onClose={() => setStreamPlayer({ visible: false, uri: null, title: '' })}
      />
    </View>
  );
}
