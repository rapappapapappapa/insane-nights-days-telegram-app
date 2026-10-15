import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
} from 'react-native';
import Colors from '../../constants/colors';
import { Spacing } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';
import { NoxText, NoxButton } from '../../components/nox';
import ProfileWallStream from '../../components/community/ProfileWallStream';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import {
  PublicProfileHero,
  PublicProfileTabs,
  PublicProfileEventCarousel,
  publicProfileStyles as pp,
} from '../../components/publicProfile';

export default function VenueProfilePage() {
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { venueId, selectionMode, selectedVenueId, returnTo, eventId, replaceMode } =
    routeParams || {};
  const fr = language === 'fr';

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [following, setFollowing] = useState(false);
  const [loadingFollow, setLoadingFollow] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [events, setEvents] = useState([]);
  const [ratings, setRatings] = useState([]);

  useEffect(() => {
    if (venueId) fetchVenueProfile();
  }, [venueId]);

  useEffect(() => {
    if (!user?.token || !venue?.id || venue.userId === user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const res = await api.getFollowStatus(user.token, { venueId: venue.id });
        if (mounted && res?.success) setFollowing(!!res.following);
      } catch {
        if (mounted) setFollowing(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.token, user?.id, venue?.id, venue?.userId]);

  const handleFollowToggle = async () => {
    if (!user?.token || !venue?.id || loadingFollow) return;
    if (venue.userId === user?.id) return;
    setLoadingFollow(true);
    try {
      if (following) {
        await api.unfollowVenue(user.token, venue.id);
        setFollowing(false);
        showSuccess(fr ? 'Abonnement retiré.' : 'Unfollowed.');
      } else {
        await api.followVenue(user.token, venue.id);
        setFollowing(true);
        showSuccess(fr ? 'Vous suivez ce lieu.' : 'You now follow this venue.');
      }
    } catch (e) {
      showError(e?.message || (fr ? 'Erreur.' : 'Error.'));
    } finally {
      setLoadingFollow(false);
    }
  };

  const fetchVenueProfile = async () => {
    setLoading(true);
    try {
      let foundVenue = null;
      try {
        const publicRes = await api.getVenueProfileById(venueId);
        if (publicRes?.success && publicRes.venue) {
          foundVenue = publicRes.venue;
          if (Array.isArray(publicRes.events)) setEvents(publicRes.events);
          if (Array.isArray(publicRes.upcomingEvents)) setEvents(publicRes.upcomingEvents);
          if (Array.isArray(publicRes.ratings)) setRatings(publicRes.ratings);
        }
      } catch {
        // fallback
      }
      if (!foundVenue && user?.token) {
        const response = await api.getVenues(user.token);
        if (response?.success && Array.isArray(response.venues)) {
          foundVenue = response.venues.find((v) => v.id === venueId) || null;
        }
      }
      if (foundVenue) setVenue(foundVenue);

      const mediaRes = await api.getVenueMedia(venueId);
      if (mediaRes?.success && Array.isArray(mediaRes.media)) {
        const normalized = mediaRes.media.map((m) => ({ ...m, url: normalizeMediaUrl(m.url) }));
        setPhotos(normalized.filter((m) => m.type === 'photo'));
        setVideos(normalized.filter((m) => m.type === 'video'));
      }

      try {
        if (api.getVenueRatings) {
          const ratingsRes = await api.getVenueRatings(venueId);
          if (ratingsRes?.success) {
            const list =
              ratingsRes.ratings?.allRatings ||
              ratingsRes.allRatings ||
              ratingsRes.ratings ||
              [];
            if (Array.isArray(list)) setRatings(list);
          }
        }
      } catch {
        // optional
      }
    } catch (error) {
      console.error('Erreur récupération profil lieu:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventItems = useMemo(
    () =>
      (events || []).slice(0, 8).map((event) => ({
        id: event.id,
        title: event.title || event.eventTitle,
        date: event.date || event.eventDate,
        location:
          event.location ||
          event.eventLocation ||
          venue?.venueName ||
          [venue?.city].filter(Boolean).join(', '),
        image: event.image || event.coverImage || event.eventImage,
        tags: [event.genre || event.eventGenre].filter(Boolean),
        onPress: () => navigate('eventDetail', { eventId: event.id || event.eventId }),
      })),
    [events, venue, navigate],
  );

  if (loading) {
    return (
      <View style={pp.container}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary" style={{ marginTop: Spacing.md }}>
            {fr ? 'Chargement...' : 'Loading...'}
          </NoxText>
        </View>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={pp.container}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
          <NoxText variant="secondary">{fr ? 'Lieu non trouvé' : 'Venue not found'}</NoxText>
          <NoxButton label={fr ? 'Retour' : 'Back'} onPress={goBack} style={{ marginTop: Spacing.lg }} />
        </View>
      </View>
    );
  }

  const isSelected = selectedVenueId === venue.id;
  const cityLine = [venue.city, venue.country].filter(Boolean).join(', ');
  const metaLine = [
    venue.venueType || venue.type || (fr ? 'Lieu' : 'Venue'),
    fr ? 'Événements' : 'Events',
    venue.city,
  ]
    .filter(Boolean)
    .join(' • ');
  const ratingValue = Number(venue.averageRatingGlobal || 0);
  const ratingLabel = ratingValue > 0 ? `${ratingValue.toFixed(1)} ★` : null;

  const stats = [
    { label: fr ? 'Followers' : 'Followers', value: venue.followersCount, force: true },
    {
      label: fr ? 'Événements' : 'Events',
      value: venue.eventsCount ?? events.length ?? null,
      force: true,
    },
    { label: fr ? 'Note' : 'Rating', value: ratingLabel, force: true },
    {
      label: fr ? 'Capacité' : 'Capacity',
      value: venue.maxCapacity || venue.capacity || null,
      force: true,
    },
  ];

  const showFollow = !selectionMode && !!user?.token && venue.userId && venue.userId !== user?.id;

  const extraActions = selectionMode ? (
    <NoxButton
      label={
        isSelected
          ? fr
            ? 'Désélectionner'
            : 'Deselect'
          : fr
            ? 'Sélectionner'
            : 'Select'
      }
      variant={isSelected ? 'secondary' : 'primary'}
      onPress={() => {
        navigate(returnTo || 'bookerDashboard', {
          selectedVenueId: venue.id,
          selectedVenueName: venue.venueName,
          action: replaceMode ? 'replaceVenue' : isSelected ? 'remove' : 'select',
          eventId: eventId || undefined,
          highlightEventId: eventId || undefined,
          ...(returnTo === 'bookerEventDashboard' ? { resumeStep: 2 } : {}),
        });
      }}
    />
  ) : null;

  const renderMedia = (limit = 24) => {
    const items = [
      ...videos.slice(0, limit).map((v) => ({ kind: 'video', data: v })),
      ...photos.slice(0, Math.max(0, limit - videos.length)).map((p) => ({ kind: 'photo', data: p })),
    ].slice(0, limit);

    if (items.length === 0) {
      return (
        <NoxText variant="secondary" style={pp.emptyHint}>
          {fr ? 'Aucun média' : 'No media yet'}
        </NoxText>
      );
    }

    return (
      <View style={pp.mediaGrid}>
        {items.map((item) => {
          if (item.kind === 'video') {
            return (
              <TouchableOpacity
                key={`v-${item.data.id}`}
                style={pp.mediaThumb}
                onPress={() => {
                  setSelectedVideo(item.data);
                  setVideoModalVisible(true);
                }}
              >
                <View
                  style={[
                    pp.mediaThumbImage,
                    { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.backgroundElevated },
                  ]}
                >
                  <Ionicons name="play" size={28} color={Colors.primary} />
                </View>
              </TouchableOpacity>
            );
          }
          return (
            <View key={`p-${item.data.id}`} style={pp.mediaThumb}>
              <Image source={{ uri: item.data.url }} style={pp.mediaThumbImage} resizeMode="cover" />
            </View>
          );
        })}
      </View>
    );
  };

  const renderAbout = () => (
    <View>
      <PublicProfileEventCarousel
        language={language}
        items={eventItems}
        onSeeAll={() => setActiveTab('events')}
      />

      <View style={[pp.sectionHeader, { marginTop: Spacing.xl }]}>
        <NoxText variant="titleSecondary" style={pp.sectionTitle}>
          {fr ? 'À propos' : 'About'}
        </NoxText>
      </View>
      <View style={pp.aboutGrid}>
        <View style={pp.aboutDetails}>
          {venue.address ? (
            <View style={pp.aboutRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {venue.address}
              </NoxText>
            </View>
          ) : null}
          {venue.accessInfo || venue.access ? (
            <View style={pp.aboutRow}>
              <Ionicons name="navigate-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {venue.accessInfo || venue.access}
              </NoxText>
            </View>
          ) : null}
          {(venue.maxCapacity || venue.capacity) ? (
            <View style={pp.aboutRow}>
              <Ionicons name="people-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {fr
                  ? `${venue.maxCapacity || venue.capacity} personnes`
                  : `${venue.maxCapacity || venue.capacity} people`}
              </NoxText>
            </View>
          ) : null}
          {venue.openingHours || venue.hours ? (
            <View style={pp.aboutRow}>
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {venue.openingHours || venue.hours}
              </NoxText>
            </View>
          ) : null}
          {venue.website ? (
            <TouchableOpacity style={pp.aboutRow} onPress={() => Linking.openURL(venue.website)}>
              <Ionicons name="globe-outline" size={16} color={Colors.primary} />
              <NoxText style={[pp.aboutRowText, { color: Colors.primary }]}>
                {String(venue.website).replace(/^https?:\/\//, '')}
              </NoxText>
            </TouchableOpacity>
          ) : null}
          {(venue.soundSystem || venue.sound) ? (
            <View style={pp.aboutRow}>
              <Ionicons name="volume-high-outline" size={16} color={Colors.primary} />
              <NoxText variant="secondary" style={pp.aboutRowText}>
                {venue.soundSystem || venue.sound}
              </NoxText>
            </View>
          ) : null}
        </View>
        {venue.bio || venue.description ? (
          <View style={pp.quoteCard}>
            <NoxText style={pp.quoteMark}>“</NoxText>
            <NoxText variant="secondary" style={pp.quoteText} numberOfLines={6}>
              {venue.bio || venue.description}
            </NoxText>
            <NoxText variant="secondary" style={pp.quoteAttr}>
              — {venue.venueName}
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
      {renderMedia(4)}

      {ratings.length > 0 || ratingValue > 0 ? (
        <>
          <View style={pp.sectionHeader}>
            <NoxText variant="titleSecondary" style={pp.sectionTitle}>
              {fr ? 'Avis récents' : 'Recent reviews'}
            </NoxText>
            <TouchableOpacity
              onPress={() =>
                navigate('venueRatings', { venueId, venueName: venue.venueName })
              }
              hitSlop={8}
            >
              <NoxText style={pp.seeAll}>{fr ? 'Voir tout >' : 'See all >'}</NoxText>
            </TouchableOpacity>
          </View>
          {ratings.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {ratings.slice(0, 8).map((review) => (
                <View key={review.id || review.comment} style={pp.reviewCard}>
                  <View style={pp.reviewHeader}>
                    <View style={pp.reviewAvatar}>
                      <Ionicons name="person" size={16} color={Colors.primary} />
                    </View>
                    <StarRating rating={review.rating} size={14} showStars showValue={false} />
                  </View>
                  {review.comment ? (
                    <NoxText variant="secondary" style={pp.reviewComment} numberOfLines={4}>
                      “{review.comment}”
                    </NoxText>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : (
            <TouchableOpacity
              onPress={() =>
                navigate('venueRatings', { venueId, venueName: venue.venueName })
              }
            >
              <NoxText style={pp.seeAll}>
                {fr ? `Note ${ratingLabel} — voir les avis` : `Rating ${ratingLabel} — see reviews`}
              </NoxText>
            </TouchableOpacity>
          )}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={pp.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={pp.scrollContent} showsVerticalScrollIndicator={false}>
        <PublicProfileHero
          language={language}
          onBack={goBack}
          bannerImage={venue.bannerImage || venue.coverImage || photos[0]?.url}
          profileImage={venue.profileImage}
          name={venue.venueName}
          metaLine={metaLine}
          locationLine={cityLine || venue.address}
          bio={venue.bio || venue.description}
          stats={stats}
          showFollow={showFollow}
          following={following}
          loadingFollow={loadingFollow}
          onFollowPress={handleFollowToggle}
          shareMessage={fr ? `Découvre ${venue.venueName} sur NOX` : `Discover ${venue.venueName} on NOX`}
          extraActions={extraActions}
          fallbackIcon="business"
        />

        <PublicProfileTabs language={language} activeTab={activeTab} onChange={setActiveTab} />

        <View style={pp.tabBody}>
          {activeTab === 'about' ? renderAbout() : null}
          {activeTab === 'feed' ? (
            <ProfileWallStream
              wallFilter={venue?.id ? { venueId: venue.id } : null}
              isOwnProfile={!!(user?.id && venue.userId === user?.id)}
              enabled={!!venue?.id}
            />
          ) : null}
          {activeTab === 'events' ? (
            <PublicProfileEventCarousel
              language={language}
              title={fr ? 'Événements' : 'Events'}
              items={eventItems}
            />
          ) : null}
          {activeTab === 'media' ? renderMedia(24) : null}
          {activeTab === 'reviews' ? (
            ratings.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {ratings.map((review) => (
                  <View key={review.id || review.comment} style={pp.reviewCard}>
                    <View style={pp.reviewHeader}>
                      <View style={pp.reviewAvatar}>
                        <Ionicons name="person" size={16} color={Colors.primary} />
                      </View>
                      <StarRating rating={review.rating} size={14} showStars showValue={false} />
                    </View>
                    {review.comment ? (
                      <NoxText variant="secondary" style={pp.reviewComment} numberOfLines={4}>
                        “{review.comment}”
                      </NoxText>
                    ) : null}
                  </View>
                ))}
              </ScrollView>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  navigate('venueRatings', { venueId, venueName: venue.venueName })
                }
              >
                <NoxText variant="secondary" style={pp.emptyHint}>
                  {fr ? 'Voir les avis du lieu' : 'See venue reviews'}
                </NoxText>
              </TouchableOpacity>
            )
          ) : null}
        </View>
      </ScrollView>

      <VideoPlayer
        videoUrl={selectedVideo?.url}
        title={selectedVideo?.title}
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
      />
      {toast?.visible ? (
        <Toast message={toast.message} type={toast.type} onHide={hideToast} />
      ) : null}
    </View>
  );
}
