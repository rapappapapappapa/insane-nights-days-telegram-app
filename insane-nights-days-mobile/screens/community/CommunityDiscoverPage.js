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
import { useLanguage } from '../../contexts/LanguageContext';
import { api, normalizeMediaUrl } from '../../api/config';
import { useDebounce } from '../../hooks/useDebounce';
import { NoxText, NoxSearchBar, NoxCard } from '../../components/nox';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';
import { formatEventPriceBadge } from '../../utils/eventPriceUtils';
import {
  collectGenres,
  filterDjsList,
  filterEventsList,
  formatEventDateLabel,
} from '../../utils/noxDiscoverUtils';

export default function CommunityDiscoverPage() {
  const { navigate, routeParams } = useNavigation();
  const insets = useSafeAreaInsets();
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [mode, setMode] = useState(routeParams?.tab === 'djs' ? 'djs' : 'events');
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [events, setEvents] = useState([]);
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (routeParams?.tab === 'djs') setMode('djs');
    else if (routeParams?.tab === 'events') setMode('events');
  }, [routeParams?.tab]);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [eventsRes, djsRes] = await Promise.all([api.getEvents(), api.getDjs()]);
      setEvents(eventsRes?.success && Array.isArray(eventsRes.events) ? eventsRes.events : []);
      setDjs(djsRes?.success && Array.isArray(djsRes.djs) ? djsRes.djs : []);
    } catch {
      setEvents([]);
      setDjs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const genres = useMemo(() => {
    const source = mode === 'events' ? events : djs;
    return collectGenres(source, mode === 'events' ? 'genre' : 'genre');
  }, [events, djs, mode]);

  useEffect(() => {
    setFilter('all');
  }, [mode]);

  const filteredEvents = useMemo(
    () => filterEventsList(events, { genre: filter, search: debouncedSearch, dateFilter: 'upcoming' }),
    [events, filter, debouncedSearch],
  );

  const filteredDjs = useMemo(
    () => filterDjsList(djs, { genre: filter, search: debouncedSearch }),
    [djs, filter, debouncedSearch],
  );

  const renderThumb = (uri, fallbackIcon, key, round = false) => {
    const normalized = uri ? normalizeMediaUrl(uri) : null;
    const boxStyle = round ? styles.djThumb : styles.eventThumb;
    if (normalized && !brokenImages[key]) {
      return (
        <View style={boxStyle}>
          <Image
            source={{ uri: normalized }}
            style={styles.thumbImage}
            onError={() => setBrokenImages((prev) => ({ ...prev, [key]: true }))}
          />
        </View>
      );
    }
    return (
      <View style={boxStyle}>
        <Ionicons name={fallbackIcon} size={20} color={primaryAlpha(0.6)} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top + Spacing.md }}>
        <View style={styles.searchRow}>
          <NoxSearchBar
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder={
              fr ? 'Rechercher un événement, un artiste ou un lieu' : 'Search an event, artist or venue'
            }
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'events' && styles.segmentBtnActive]}
            onPress={() => setMode('events')}
          >
            <NoxText
              variant="buttonSecondary"
              style={[styles.segmentText, mode === 'events' && styles.segmentTextActive]}
            >
              {fr ? 'Événements' : 'Events'}
            </NoxText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'djs' && styles.segmentBtnActive]}
            onPress={() => setMode('djs')}
          >
            <NoxText
              variant="buttonSecondary"
              style={[styles.segmentText, mode === 'djs' && styles.segmentTextActive]}
            >
              DJs
            </NoxText>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {genres.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, filter === g && styles.chipActive]}
              onPress={() => setFilter(g)}
            >
              <NoxText variant="secondary" style={[styles.chipText, filter === g && styles.chipTextActive]}>
                {g === 'all' ? (fr ? 'Tous' : 'All') : g}
              </NoxText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, paddingBottom: 140, paddingTop: Spacing.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={Colors.primary} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
        ) : mode === 'events' ? (
          filteredEvents.length === 0 ? (
            <NoxText variant="secondary" style={styles.empty}>
              {fr ? 'Aucun événement trouvé.' : 'No events found.'}
            </NoxText>
          ) : (
            filteredEvents.map((ev) => {
              const priceLabel = formatEventPriceBadge(ev, language);
              return (
                <TouchableOpacity
                  key={ev.id}
                  activeOpacity={0.85}
                  onPress={() => navigate('eventDetail', { eventId: ev.id })}
                >
                  <NoxCard style={styles.eventCard} padded={false}>
                    {renderThumb(ev.image, 'calendar-outline', `ev-${ev.id}`)}
                    <View style={{ flex: 1 }}>
                      <NoxText variant="form" style={styles.itemName}>
                        {ev.title}
                      </NoxText>
                      <NoxText variant="secondary">
                        {formatEventDateLabel(ev.date, language, { shortMonth: true })}
                        {ev.location ? ` - ${ev.location}` : ''}
                      </NoxText>
                      {priceLabel ? (
                        <NoxText variant="secondary" style={styles.price}>
                          {fr ? `À partir de ${priceLabel}` : `From ${priceLabel}`}
                        </NoxText>
                      ) : null}
                    </View>
                    <Ionicons name="bookmark-outline" size={18} color={Colors.textTertiary} />
                  </NoxCard>
                </TouchableOpacity>
              );
            })
          )
        ) : filteredDjs.length === 0 ? (
          <NoxText variant="secondary" style={styles.empty}>
            {fr ? 'Aucun DJ trouvé.' : 'No DJs found.'}
          </NoxText>
        ) : (
          filteredDjs.map((dj) => (
            <TouchableOpacity
              key={dj.id}
              activeOpacity={0.85}
              onPress={() =>
                navigate('djProfile', {
                  djId: dj.id,
                  djUserId: dj.userId,
                  djName: dj.artistName,
                })
              }
            >
              <NoxCard style={styles.eventCard} padded={false}>
                {renderThumb(dj.profileImage, 'person', `dj-${dj.id}`, true)}
                <View style={{ flex: 1 }}>
                  <NoxText variant="form" style={styles.itemName}>
                    {dj.artistName}
                  </NoxText>
                  <NoxText variant="secondary">{dj.city || ''}</NoxText>
                  <NoxText variant="secondary" style={styles.genre}>
                    {dj.genre || dj.style || ''}
                  </NoxText>
                </View>
                {dj.averageRatingGlobal != null ? (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={13} color={Colors.primary} />
                    <NoxText variant="secondary" style={styles.ratingText}>
                      {Number(dj.averageRatingGlobal).toFixed(1)}
                    </NoxText>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
                )}
              </NoxCard>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg },
  segment: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xl,
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  segmentBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.sm },
  segmentBtnActive: { backgroundColor: primaryAlpha(0.18) },
  segmentText: { color: Colors.textTertiary },
  segmentTextActive: { color: Colors.text },
  filters: { paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.backgroundCard,
  },
  chipActive: { backgroundColor: primaryAlpha(0.15), borderColor: primaryAlpha(0.45) },
  chipText: { color: Colors.textTertiary },
  chipTextActive: { color: Colors.primary },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  eventThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  djThumb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImage: { width: '100%', height: '100%' },
  itemName: { fontWeight: '700', marginBottom: 2 },
  price: { color: Colors.primary, marginTop: 2 },
  genre: { color: Colors.primary, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { color: Colors.text },
  empty: { textAlign: 'center', marginTop: Spacing.xxl },
});
