import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api, normalizeMediaUrl } from '../../api/config';
import StarRating from '../../components/StarRating';
import VideoPlayer from '../../components/VideoPlayer';
import { NoxText, NoxButton, NoxCard } from '../../components/nox';

const { width } = Dimensions.get('window');

export default function VenueProfilePage() {
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const { routeParams, goBack, navigate } = useNavigation();
  const { user } = useAuth();
  const { venueId, selectionMode, selectedVenueId, returnTo, eventId, replaceMode } = routeParams || {};

  const [venue, setVenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState([]);
  const [videos, setVideos] = useState([]);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [bannerBroken, setBannerBroken] = useState(false);

  useEffect(() => {
    if (venueId) {
      fetchVenueProfile();
    }
  }, [venueId]);

  const fetchVenueProfile = async () => {
    setLoading(true);
    setBannerBroken(false);
    try {
      const response = await api.getVenues(user.token);
      if (response && response.success && Array.isArray(response.venues)) {
        const foundVenue = response.venues.find((v) => v.id === venueId);
        if (foundVenue) {
          setVenue(foundVenue);
        }
      }
      const mediaRes = await api.getVenueMedia(venueId);
      if (mediaRes?.success && Array.isArray(mediaRes.media)) {
        const normalized = mediaRes.media.map((m) => ({ ...m, url: normalizeMediaUrl(m.url) }));
        setPhotos(normalized.filter((m) => m.type === 'photo'));
        setVideos(normalized.filter((m) => m.type === 'video'));
      }
    } catch (error) {
      console.error('Erreur récupération profil lieu:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <NoxText variant="secondary" style={{ marginTop: Spacing.md }}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </NoxText>
        </View>
      </View>
    );
  }

  if (!venue) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={[styles.topBar, { paddingTop: (insets?.top ?? 0) + Spacing.sm }]}>
          <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.topBarBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <NoxText variant="titleSecondary">
              {language === 'fr' ? 'Lieu' : 'Venue'}
            </NoxText>
          </View>
          <View style={styles.topBarBtn} />
        </View>
        <View style={styles.centered}>
          <NoxText variant="secondary">
            {language === 'fr' ? 'Lieu non trouvé' : 'Venue not found'}
          </NoxText>
          <NoxButton
            label={language === 'fr' ? 'Retour' : 'Back'}
            onPress={goBack}
            style={{ marginTop: Spacing.lg }}
          />
        </View>
      </View>
    );
  }

  const isSelected = selectedVenueId === venue.id;
  const bannerUri = normalizeMediaUrl(venue.bannerImage || venue.coverImage || photos[0]?.url);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />

      <View style={[styles.topBar, { paddingTop: (insets?.top ?? 0) + Spacing.sm }]}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <NoxText variant="titleSecondary">{venue.venueName}</NoxText>
          <NoxText variant="secondary" numberOfLines={1}>
            {venue.city || venue.address || (language === 'fr' ? 'Lieu' : 'Venue')}
          </NoxText>
        </View>
        <View style={styles.topBarBtn} />
      </View>

      <View style={styles.profileHero}>
        <View style={styles.banner}>
          {bannerUri && !bannerBroken ? (
            <Image
              source={{ uri: bannerUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              onError={() => setBannerBroken(true)}
            />
          ) : (
            <Ionicons name="business-outline" size={32} color={primaryAlpha(0.45)} />
          )}
        </View>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="business" size={32} color={Colors.primary} />
          </View>
        </View>
      </View>

      <View style={styles.identityBlock}>
        <NoxText variant="title" style={styles.venueName}>
          {venue.venueName}
        </NoxText>
        {venue.address ? (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
            <NoxText variant="secondary" style={{ flex: 1 }}>
              {venue.address}
            </NoxText>
          </View>
        ) : null}

        {selectionMode ? (
          <NoxButton
            label={
              isSelected
                ? language === 'fr'
                  ? 'Désélectionner'
                  : 'Deselect'
                : language === 'fr'
                  ? 'Sélectionner'
                  : 'Select'
            }
            variant={isSelected ? 'secondary' : 'primary'}
            style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
            onPress={() => {
              navigate(returnTo || 'bookerDashboard', {
                selectedVenueId: venue.id,
                selectedVenueName: venue.venueName,
                action: replaceMode ? 'replaceVenue' : isSelected ? 'remove' : 'select',
                eventId: eventId || undefined,
                ...(returnTo === 'bookerEventDashboard' ? { resumeStep: 2 } : {}),
              });
            }}
          />
        ) : null}
      </View>

      <NoxCard style={styles.card}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {language === 'fr' ? 'Informations' : 'Information'}
        </NoxText>

        {venue.averageRatingGlobal > 0 ? (
          <TouchableOpacity
            style={styles.ratingRow}
            onPress={() => navigate('venueRatings', { venueId, venueName: venue.venueName })}
            accessibilityRole="button"
            accessibilityLabel={language === 'fr' ? 'Voir tous les avis' : 'See all reviews'}
          >
            <NoxText variant="secondary">
              {language === 'fr' ? 'Note moyenne' : 'Average rating'}
            </NoxText>
            <View style={styles.ratingValueRow}>
              <StarRating rating={venue.averageRatingGlobal} size={18} showStars showValue={false} />
              <NoxText variant="titleSecondary" style={{ color: Colors.primary }}>
                {Number(venue.averageRatingGlobal).toFixed(1)}
              </NoxText>
              <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
            </View>
          </TouchableOpacity>
        ) : null}

        {venue.capacity ? (
          <View style={styles.infoRow}>
            <NoxText variant="secondary">{language === 'fr' ? 'Capacité' : 'Capacity'}</NoxText>
            <NoxText variant="form">{String(venue.capacity)}</NoxText>
          </View>
        ) : null}

        {venue.surface || venue.area ? (
          <View style={styles.infoRow}>
            <NoxText variant="secondary">{language === 'fr' ? 'Surface' : 'Area'}</NoxText>
            <NoxText variant="form">{String(venue.surface || venue.area)}</NoxText>
          </View>
        ) : null}

        {venue.soundSystem || venue.sound ? (
          <View style={styles.infoRow}>
            <NoxText variant="secondary">Sound system</NoxText>
            <NoxText variant="form" style={{ flex: 1, textAlign: 'right' }}>
              {venue.soundSystem || venue.sound}
            </NoxText>
          </View>
        ) : null}

        {venue.address ? (
          <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
            <NoxText variant="secondary">{language === 'fr' ? 'Adresse' : 'Address'}</NoxText>
            <NoxText variant="form" style={{ flex: 1, textAlign: 'right' }}>
              {venue.address}
            </NoxText>
          </View>
        ) : null}
      </NoxCard>

      <NoxCard style={styles.card}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {language === 'fr' ? 'Médias' : 'Media'}
        </NoxText>

        <NoxText variant="secondary" style={styles.mediaSubtitle}>
          {language === 'fr' ? 'Photos' : 'Photos'}
        </NoxText>
        {photos.length > 0 ? (
          <View style={styles.photoGrid}>
            {photos.map((p) => (
              <Image key={p.id} source={{ uri: p.url }} style={styles.photoItem} resizeMode="cover" />
            ))}
          </View>
        ) : (
          <NoxText variant="secondary" style={styles.emptyMedia}>
            {language === 'fr' ? 'Aucune photo' : 'No photos yet'}
          </NoxText>
        )}

        <NoxText variant="secondary" style={[styles.mediaSubtitle, { marginTop: Spacing.lg }]}>
          {language === 'fr' ? 'Vidéos' : 'Videos'}
        </NoxText>
        {videos.length > 0 ? (
          <View style={styles.videoList}>
            {videos.map((v) => (
              <TouchableOpacity
                key={v.id}
                style={styles.videoItem}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedVideo(v);
                  setVideoModalVisible(true);
                }}
              >
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="play" size={28} color={Colors.primary} />
                </View>
                {v.title ? (
                  <NoxText variant="form" style={styles.videoTitle}>
                    {v.title}
                  </NoxText>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <NoxText variant="secondary" style={styles.emptyMedia}>
            {language === 'fr' ? 'Aucune vidéo' : 'No videos yet'}
          </NoxText>
        )}
      </NoxCard>

      <VideoPlayer
        videoUrl={selectedVideo?.url}
        title={selectedVideo?.title}
        visible={videoModalVisible}
        onClose={() => setVideoModalVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  profileHero: {
    marginBottom: Spacing.lg,
  },
  banner: {
    height: 120,
    marginHorizontal: Spacing.xl,
    borderRadius: Radius.card,
    backgroundColor: primaryAlpha(0.1),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: -40,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: primaryAlpha(0.2),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.background,
  },
  identityBlock: {
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  venueName: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: Spacing.xs,
  },
  card: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  ratingRow: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  mediaSubtitle: {
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  photoItem: {
    width: (width - 72) / 2,
    height: 140,
    borderRadius: Radius.md,
    backgroundColor: Colors.backgroundElevated,
  },
  videoList: {
    gap: Spacing.md,
  },
  videoItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.borderSubtle,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElevated,
  },
  videoPlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: primaryAlpha(0.08),
  },
  videoTitle: {
    padding: Spacing.md,
  },
  emptyMedia: {
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
});
