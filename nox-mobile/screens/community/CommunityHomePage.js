import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { useFeedNotifications } from '../../hooks/useFeedNotifications';
import CommunityFeedStream from '../../components/community/CommunityFeedStream';
import { NoxText, NoxSearchBar, NoxTabs } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import {
  filterUpcomingEvents,
  formatEventDateLabel,
  formatEventTimeLabel,
  getDisplayName,
  getFeaturedEvent,
} from '../../utils/noxDiscoverUtils';
import { openDiscover, openEventPreview } from '../../utils/noxNavigation';
import { shouldShowPushOptIn } from '../../utils/communityPushOptInStorage';

function buildTabs(fr) {
  return [
    { id: 'events', label: fr ? 'Événements' : 'Events' },
    { id: 'posts', label: fr ? 'Publications' : 'Posts' },
    { id: 'following', label: fr ? 'Abonnements' : 'Following' },
  ];
}

/** Première partie d'une localisation ("Lyon, France" → "lyon") pour comparaison. */
function normalizeCity(value) {
  return String(value || '').split(',')[0].trim().toLowerCase();
}

function capitalize(value) {
  const s = String(value || '').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Options uniques (non vides) à partir de plusieurs listes de valeurs brutes. */
function collectOptions(...valueLists) {
  const seen = new Map();
  valueLists.flat().forEach((raw) => {
    const key = String(raw || '').trim().toLowerCase();
    if (key && !seen.has(key)) seen.set(key, capitalize(key));
  });
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export default function CommunityHomePage() {
  const { navigate, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { unreadCount: feedNotificationsCount } = useFeedNotifications();

  const fr = language === 'fr';
  const tabs = useMemo(() => buildTabs(fr), [fr]);

  const [activeTab, setActiveTab] = useState(routeParams?.feedTab || 'events');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [djs, setDjs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [collectifs, setCollectifs] = useState([]);
  const [brokenImages, setBrokenImages] = useState({});
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  // Filtres suggestions (backlog TODO.md) : style, ville, tri note / followers 7j
  const [styleFilter, setStyleFilter] = useState(null);
  const [cityFilter, setCityFilter] = useState(null);
  const [sortMode, setSortMode] = useState(null); // null | 'rating' | 'followers'
  const [pickerType, setPickerType] = useState(null); // null | 'style' | 'city'

  const displayName = getDisplayName(user, profile);
  const featured = useMemo(() => getFeaturedEvent(events), [events]);

  const styleOptions = useMemo(
    () => collectOptions(events.map((e) => e.genre), djs.map((d) => d.genre)),
    [events, djs],
  );
  const cityOptions = useMemo(
    () =>
      collectOptions(
        events.map((e) => normalizeCity(e.location)),
        djs.map((d) => normalizeCity(d.city || d.mainCity)),
        venues.map((v) => normalizeCity(v.city || v.address)),
      ),
    [events, djs, venues],
  );

  const matchesStyle = useCallback(
    (value) => !styleFilter || String(value || '').trim().toLowerCase() === styleFilter.toLowerCase(),
    [styleFilter],
  );
  const matchesCity = useCallback(
    (value) => !cityFilter || normalizeCity(value) === cityFilter.toLowerCase(),
    [cityFilter],
  );

  const upcoming = useMemo(() => {
    const base = filterUpcomingEvents(events, 24).filter(
      (ev) => matchesStyle(ev.genre) && matchesCity(ev.location),
    );
    return base.slice(0, 8);
  }, [events, matchesStyle, matchesCity]);

  const suggestedDjs = useMemo(() => {
    let list = djs.filter(
      (dj) => matchesStyle(dj.genre) && matchesCity(dj.city || dj.mainCity),
    );
    if (sortMode === 'rating') {
      list = [...list].sort(
        (a, b) => (b.averageRatingGlobal || 0) - (a.averageRatingGlobal || 0),
      );
    } else if (sortMode === 'followers') {
      list = [...list].sort((a, b) => (b.weeklyFollowers || 0) - (a.weeklyFollowers || 0));
    }
    return list.slice(0, 8);
  }, [djs, matchesStyle, matchesCity, sortMode]);

  const suggestedVenues = useMemo(
    () => venues.filter((v) => matchesCity(v.city || v.address)).slice(0, 8),
    [venues, matchesCity],
  );
  const suggestedCollectifs = useMemo(() => collectifs.slice(0, 8), [collectifs]);

  useEffect(() => {
    if (routeParams?.feedTab) setActiveTab(routeParams.feedTab);
  }, [routeParams?.feedTab]);

  useEffect(() => {
    if (!user?.isAuthenticated || user?.activeProfileType !== 'COMMUNITY') return;
    let cancelled = false;
    (async () => {
      const show = await shouldShowPushOptIn(user.activeProfileType);
      if (!cancelled && show) navigate('communityPushOptIn');
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.isAuthenticated, user?.activeProfileType, navigate]);

  const loadDiscovery = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const tasks = [api.getEvents(), api.getDjs(), api.getPublicVenues(), api.getPublicBookers('Collectif')];
        if (user?.token) {
          tasks.push(api.getCommunityProfile(user.token).catch(() => null));
        }

        const [eventsRes, djsRes, venuesRes, collectifsRes, profileRes] = await Promise.all(tasks);

        setEvents(eventsRes?.success && Array.isArray(eventsRes.events) ? eventsRes.events : []);
        setDjs(djsRes?.success && Array.isArray(djsRes.djs) ? djsRes.djs : []);
        setVenues(venuesRes?.success && Array.isArray(venuesRes.venues) ? venuesRes.venues : []);
        setCollectifs(
          collectifsRes?.success && Array.isArray(collectifsRes.bookers) ? collectifsRes.bookers : [],
        );
        if (profileRes?.success && profileRes.profile) {
          setProfile(profileRes.profile);
        }
      } catch {
        setEvents([]);
        setDjs([]);
        setVenues([]);
        setCollectifs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token],
  );

  useEffect(() => {
    if (activeTab === 'events') {
      loadDiscovery();
    }
  }, [activeTab, loadDiscovery]);

  const onRefreshEvents = async () => {
    await loadDiscovery(true);
    setEventsRefreshKey((k) => k + 1);
  };

  const openEvent = (eventId) => {
    openEventPreview(navigate, user?.activeProfileType, eventId);
  };

  const openDj = (dj) => {
    if (!dj?.id) return;
    navigate('djProfile', {
      djId: dj.id,
      djUserId: dj.userId,
      djName: dj.artistName,
    });
  };

  const openVenue = (venue) => {
    if (!venue?.id) return;
    navigate('venueProfile', { venueId: venue.id, venueName: venue.venueName });
  };

  const openCollectif = (booker) => {
    if (!booker?.id) return;
    navigate('bookerProfile', { bookerId: booker.id });
  };

  const renderThumb = (uri, fallbackIcon, key) => {
    const normalized = uri ? normalizeMediaUrl(uri) : null;
    if (normalized && !brokenImages[key]) {
      return (
        <Image
          source={{ uri: normalized }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setBrokenImages((prev) => ({ ...prev, [key]: true }))}
        />
      );
    }
    return <Ionicons name={fallbackIcon} size={22} color={primaryAlpha(0.6)} />;
  };

  const renderAvatarSuggestions = ({
    title,
    seeMoreLabel,
    onSeeMore,
    items,
    emptyText,
    getKey,
    getImageUri,
    fallbackIcon,
    getTitle,
    getSubtitle,
    onPressItem,
  }) => (
    <>
      <View style={styles.sectionHeaderRow}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {title}
        </NoxText>
        <TouchableOpacity onPress={onSeeMore}>
          <NoxText variant="secondary" style={styles.link}>
            {seeMoreLabel}
          </NoxText>
        </TouchableOpacity>
      </View>
      {items.length === 0 ? (
        <NoxText variant="secondary" style={styles.emptyHint}>
          {emptyText}
        </NoxText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {items.map((item) => {
            const key = getKey(item);
            return (
              <TouchableOpacity
                key={key}
                style={styles.djCard}
                activeOpacity={0.85}
                onPress={() => onPressItem(item)}
              >
                <View style={styles.djAvatar}>
                  {renderThumb(getImageUri(item), fallbackIcon, key)}
                </View>
                <NoxText variant="secondary" style={styles.djName} numberOfLines={1}>
                  {getTitle(item)}
                </NoxText>
                <NoxText variant="secondary" style={styles.djGenre} numberOfLines={1}>
                  {getSubtitle(item) || ' '}
                </NoxText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </>
  );

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.85}
          onPress={() => navigate('communityMyProfile')}
        >
          <View style={styles.avatar}>
            {profile?.profileImage && !brokenImages.profile ? (
              <Image
                source={{ uri: normalizeMediaUrl(profile.profileImage) }}
                style={styles.avatarImage}
                onError={() => setBrokenImages((prev) => ({ ...prev, profile: true }))}
              />
            ) : null}
          </View>
          <View>
            <NoxText variant="titleSecondary" style={styles.greeting}>
              Hello {displayName} !
            </NoxText>
            <NoxText variant="secondary">
              {fr ? 'Découvre ton prochain événement' : 'Discover your next event'}
            </NoxText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bell} onPress={() => navigate('notifications')} hitSlop={10}>
          <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          {feedNotificationsCount > 0 ? <View style={styles.notifDot} /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <NoxSearchBar
          placeholder={
            fr ? 'Rechercher un événement, un artiste ou un lieu' : 'Search an event, artist or venue'
          }
          onPress={() => openDiscover(navigate, user?.activeProfileType)}
        />
      </View>

      <NoxTabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} style={styles.tabs} />

      {activeTab === 'events' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
        >
          <TouchableOpacity
            style={[styles.filterChip, styleFilter && styles.filterChipActive]}
            onPress={() => setPickerType('style')}
          >
            <NoxText variant="secondary" style={[styles.filterChipText, styleFilter && styles.filterChipTextActive]}>
              {styleFilter || (fr ? 'Style' : 'Style')}
            </NoxText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={styleFilter ? Colors.text : Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, cityFilter && styles.filterChipActive]}
            onPress={() => setPickerType('city')}
          >
            <NoxText variant="secondary" style={[styles.filterChipText, cityFilter && styles.filterChipTextActive]}>
              {cityFilter || (fr ? 'Ville' : 'City')}
            </NoxText>
            <Ionicons
              name="chevron-down"
              size={12}
              color={cityFilter ? Colors.text : Colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, sortMode === 'rating' && styles.filterChipActive]}
            onPress={() => setSortMode((m) => (m === 'rating' ? null : 'rating'))}
          >
            <NoxText
              variant="secondary"
              style={[styles.filterChipText, sortMode === 'rating' && styles.filterChipTextActive]}
            >
              {fr ? 'Mieux notés' : 'Top rated'}
            </NoxText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, sortMode === 'followers' && styles.filterChipActive]}
            onPress={() => setSortMode((m) => (m === 'followers' ? null : 'followers'))}
          >
            <NoxText
              variant="secondary"
              style={[styles.filterChipText, sortMode === 'followers' && styles.filterChipTextActive]}
            >
              {fr ? 'Top followers 7j' : 'Top followers 7d'}
            </NoxText>
          </TouchableOpacity>
          {styleFilter || cityFilter || sortMode ? (
            <TouchableOpacity
              style={styles.filterReset}
              onPress={() => {
                setStyleFilter(null);
                setCityFilter(null);
                setSortMode(null);
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
    </>
  );

  const renderFilterPicker = () => {
    const isStyle = pickerType === 'style';
    const options = isStyle ? styleOptions : cityOptions;
    const current = isStyle ? styleFilter : cityFilter;
    const setValue = isStyle ? setStyleFilter : setCityFilter;
    return (
      <Modal
        visible={pickerType != null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
      >
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPickerType(null)}
        >
          <View style={styles.pickerCard}>
            <NoxText variant="titleSecondary" style={styles.pickerTitle}>
              {isStyle ? (fr ? 'Filtrer par style' : 'Filter by style') : fr ? 'Filtrer par ville' : 'Filter by city'}
            </NoxText>
            <ScrollView style={styles.pickerList}>
              <TouchableOpacity
                style={styles.pickerRow}
                onPress={() => {
                  setValue(null);
                  setPickerType(null);
                }}
              >
                <NoxText variant="form" style={!current ? styles.pickerRowActive : null}>
                  {fr ? 'Tous' : 'All'}
                </NoxText>
              </TouchableOpacity>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={styles.pickerRow}
                  onPress={() => {
                    setValue(opt);
                    setPickerType(null);
                  }}
                >
                  <NoxText variant="form" style={current === opt ? styles.pickerRowActive : null}>
                    {opt}
                  </NoxText>
                </TouchableOpacity>
              ))}
              {options.length === 0 ? (
                <NoxText variant="secondary" style={styles.pickerEmpty}>
                  {fr ? 'Aucune option disponible.' : 'No options available.'}
                </NoxText>
              ) : null}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const renderEventsSections = () => (
    <>
      {featured ? (
        <TouchableOpacity
          style={styles.featured}
          activeOpacity={0.9}
          onPress={() => openEvent(featured.id)}
        >
          <View style={styles.featuredImage}>
            {renderThumb(featured.image, 'flame-outline', `featured-${featured.id}`)}
          </View>
          <View style={styles.featuredOverlay}>
            <NoxText variant="titleSecondary" style={styles.featuredTitle}>
              {featured.title}
            </NoxText>
            <NoxText variant="secondary" style={styles.featuredMeta}>
              {formatEventDateLabel(featured.date, language, { shortMonth: true })}
              {featured.time ? `, ${formatEventTimeLabel(featured.time)}` : ''}
              {featured.location ? ` • ${featured.location}` : ''}
            </NoxText>
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.sectionHeaderRow}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {fr ? 'Prochains événements' : 'Upcoming events'}
        </NoxText>
        <TouchableOpacity onPress={() => openDiscover(navigate, user?.activeProfileType)}>
          <NoxText variant="secondary" style={styles.link}>
            {fr ? 'Voir plus' : 'See more'}
          </NoxText>
        </TouchableOpacity>
      </View>

      {upcoming.length === 0 ? (
        <NoxText variant="secondary" style={styles.emptyHint}>
          {fr ? 'Aucun événement à venir pour le moment.' : 'No upcoming events yet.'}
        </NoxText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {upcoming.map((ev) => (
            <TouchableOpacity
              key={ev.id}
              style={styles.upcomingCard}
              activeOpacity={0.85}
              onPress={() => openEvent(ev.id)}
            >
              <View style={styles.upcomingImage}>
                {renderThumb(ev.image, 'calendar-outline', `up-${ev.id}`)}
              </View>
              <NoxText variant="secondary" style={styles.upcomingName} numberOfLines={1}>
                {ev.title}
              </NoxText>
              <NoxText variant="secondary" style={styles.upcomingMeta}>
                {formatEventDateLabel(ev.date, language, { shortMonth: true })}
                {ev.location ? ` • ${ev.location}` : ''}
              </NoxText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {renderAvatarSuggestions({
        title: fr ? 'Suggestions de DJs' : 'Suggested DJs',
        seeMoreLabel: fr ? 'Voir plus' : 'See more',
        onSeeMore: () => openDiscover(navigate, user?.activeProfileType, { tab: 'djs' }),
        items: suggestedDjs,
        emptyText: fr ? 'Aucun DJ disponible.' : 'No DJs available.',
        getKey: (dj) => `dj-${dj.id}`,
        getImageUri: (dj) => dj.profileImage,
        fallbackIcon: 'person',
        getTitle: (dj) => dj.artistName,
        getSubtitle: (dj) => dj.genre || dj.style || dj.city,
        onPressItem: openDj,
      })}

      {renderAvatarSuggestions({
        title: fr ? 'Suggestions collectifs' : 'Suggested collectives',
        seeMoreLabel: fr ? 'Voir plus' : 'See more',
        onSeeMore: () => openDiscover(navigate, user?.activeProfileType, { tab: 'collectifs' }),
        items: suggestedCollectifs,
        emptyText: fr ? 'Aucun collectif pour le moment.' : 'No collectives yet.',
        getKey: (b) => `collectif-${b.id}`,
        getImageUri: (b) => b.profileImage,
        fallbackIcon: 'people',
        getTitle: (b) => b.name || b.pseudo,
        getSubtitle: (b) => b.bookerType || (fr ? 'Collectif' : 'Collective'),
        onPressItem: openCollectif,
      })}

      {renderAvatarSuggestions({
        title: fr ? 'Suggestions lieux' : 'Suggested venues',
        seeMoreLabel: fr ? 'Voir plus' : 'See more',
        onSeeMore: () => navigate('venueList'),
        items: suggestedVenues,
        emptyText: fr ? 'Aucun lieu disponible.' : 'No venues available.',
        getKey: (v) => `venue-${v.id}`,
        getImageUri: (v) => v.profileImage || v.bannerImage,
        fallbackIcon: 'business',
        getTitle: (v) => v.venueName,
        getSubtitle: (v) => v.city || v.address,
        onPressItem: openVenue,
      })}
    </>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.topArea, { paddingTop: insets.top + Spacing.md }]}>{renderHeader()}</View>

      {activeTab === 'events' ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={{ paddingBottom: 160 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefreshEvents} tintColor={Colors.primary} />
          }
        >
          {loading ? (
            <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: Spacing.xxl }} />
          ) : (
            renderEventsSections()
          )}
        </ScrollView>
      ) : (
        <CommunityFeedStream
          key={`${activeTab}-${eventsRefreshKey}`}
          feedTab={activeTab === 'following' ? 'following' : 'all'}
        />
      )}

      {renderFilterPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  topArea: { paddingBottom: Spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.backgroundElevated,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  greeting: { fontSize: 18 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  searchWrap: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  tabs: { marginBottom: Spacing.sm },
  featured: {
    marginHorizontal: Spacing.xl,
    height: 180,
    borderRadius: Radius.card,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  featuredImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredOverlay: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  featuredTitle: { fontSize: 20 },
  featuredMeta: { color: Colors.textSecondary, marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 17 },
  link: { color: Colors.primary },
  emptyHint: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  hScroll: { paddingHorizontal: Spacing.xl, gap: Spacing.md },
  upcomingCard: { width: 130 },
  upcomingImage: {
    width: 130,
    height: 90,
    borderRadius: Radius.md,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  upcomingName: { color: Colors.text, fontWeight: '600' },
  upcomingMeta: { fontSize: 12 },
  djCard: { width: 84, alignItems: 'center' },
  djAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: primaryAlpha(0.1),
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  djName: { color: Colors.text, fontWeight: '600' },
  djGenre: { fontSize: 11 },
  filtersRow: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  filterChipActive: {
    backgroundColor: primaryAlpha(0.25),
    borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 12 },
  filterChipTextActive: { color: Colors.text },
  filterReset: { marginLeft: 2 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  pickerCard: {
    backgroundColor: Colors.backgroundElevated,
    borderRadius: Radius.card,
    borderWidth: 0.5,
    borderColor: Colors.borderCard,
    padding: Spacing.xl,
    maxHeight: '65%',
  },
  pickerTitle: { marginBottom: Spacing.md, textAlign: 'center' },
  pickerList: { flexGrow: 0 },
  pickerRow: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  pickerRowActive: { color: Colors.primary, fontWeight: '700' },
  pickerEmpty: { paddingVertical: Spacing.md, textAlign: 'center' },
});
