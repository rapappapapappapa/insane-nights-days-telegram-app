import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
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

function buildTabs(fr) {
  return [
    { id: 'events', label: fr ? 'Événements' : 'Events' },
    { id: 'posts', label: fr ? 'Publications' : 'Posts' },
    { id: 'following', label: fr ? 'Abonnements' : 'Following' },
  ];
}

export default function CommunityHomePage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { unreadCount: feedNotificationsCount } = useFeedNotifications();

  const fr = language === 'fr';
  const tabs = useMemo(() => buildTabs(fr), [fr]);

  const [activeTab, setActiveTab] = useState('events');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [djs, setDjs] = useState([]);
  const [brokenImages, setBrokenImages] = useState({});
  const [eventsRefreshKey, setEventsRefreshKey] = useState(0);

  const displayName = getDisplayName(user, profile);
  const featured = useMemo(() => getFeaturedEvent(events), [events]);
  const upcoming = useMemo(() => filterUpcomingEvents(events, 8), [events]);
  const suggestedDjs = useMemo(() => djs.slice(0, 8), [djs]);

  const loadDiscovery = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const tasks = [api.getEvents(), api.getDjs()];
        if (user?.token) {
          tasks.push(api.getCommunityProfile(user.token).catch(() => null));
        }

        const [eventsRes, djsRes, profileRes] = await Promise.all(tasks);

        setEvents(eventsRes?.success && Array.isArray(eventsRes.events) ? eventsRes.events : []);
        setDjs(djsRes?.success && Array.isArray(djsRes.djs) ? djsRes.djs : []);
        if (profileRes?.success && profileRes.profile) {
          setProfile(profileRes.profile);
        }
      } catch {
        setEvents([]);
        setDjs([]);
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

  const renderThumb = (uri, fallbackIcon, key) => {
    const normalized = uri ? normalizeMediaUrl(uri) : null;
    if (normalized && !brokenImages[key]) {
      return (
        <Image
          source={{ uri: normalized }}
          style={StyleSheet.absoluteFillObject}
          onError={() => setBrokenImages((prev) => ({ ...prev, [key]: true }))}
        />
      );
    }
    return <Ionicons name={fallbackIcon} size={22} color={primaryAlpha(0.6)} />;
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
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
        </View>
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
    </>
  );

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

      <View style={styles.sectionHeaderRow}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {fr ? 'Suggestions de DJs' : 'Suggested DJs'}
        </NoxText>
        <TouchableOpacity onPress={() => openDiscover(navigate, user?.activeProfileType, { tab: 'djs' })}>
          <NoxText variant="secondary" style={styles.link}>
            {fr ? 'Voir plus' : 'See more'}
          </NoxText>
        </TouchableOpacity>
      </View>

      {suggestedDjs.length === 0 ? (
        <NoxText variant="secondary" style={styles.emptyHint}>
          {fr ? 'Aucun DJ disponible.' : 'No DJs available.'}
        </NoxText>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          {suggestedDjs.map((dj) => (
            <TouchableOpacity key={dj.id} style={styles.djCard} activeOpacity={0.85} onPress={() => openDj(dj)}>
              <View style={styles.djAvatar}>
                {renderThumb(dj.profileImage, 'person', `dj-${dj.id}`)}
              </View>
              <NoxText variant="secondary" style={styles.djName} numberOfLines={1}>
                {dj.artistName}
              </NoxText>
              <NoxText variant="secondary" style={styles.djGenre} numberOfLines={1}>
                {dj.genre || dj.style || dj.city || ''}
              </NoxText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
});
