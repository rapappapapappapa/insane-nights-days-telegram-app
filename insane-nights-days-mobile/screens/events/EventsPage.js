import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../api/config';
import { useDebounce } from '../../hooks/useDebounce';
import { NoxText, NoxSearchBar, NoxCard, NoxScreenHeader } from '../../components/nox';
import SkeletonLoader from '../../components/SkeletonLoader';
import { formatEventPriceBadge } from '../../utils/eventPriceUtils';
import { styles } from './EventsPage.styles';

const API_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const iso = API_DATE_RE.test(dateStr) ? `${dateStr}T12:00:00` : dateStr;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatEventDateLabel(dateStr, language) {
  if (!dateStr) return '';
  try {
    const iso = API_DATE_RE.test(dateStr) ? `${dateStr}T12:00:00` : dateStr;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getEventStatusStyle(status) {
  switch (status) {
    case 'UPCOMING':
      return { bg: 'rgba(16,185,129,0.12)', border: Colors.success, color: Colors.success, labelFr: 'À venir', labelEn: 'Upcoming' };
    case 'ONGOING':
      return { bg: 'rgba(245,158,11,0.12)', border: Colors.warning, color: Colors.warning, labelFr: 'En cours', labelEn: 'Ongoing' };
    case 'FINISHED':
      return { bg: 'rgba(255,255,255,0.06)', border: Colors.textTertiary, color: Colors.textTertiary, labelFr: 'Terminé', labelEn: 'Finished' };
    default:
      return null;
  }
}

export default function EventsPage() {
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';

  const [mode, setMode] = useState(routeParams?.tab === 'djs' ? 'djs' : 'events');
  const [events, setEvents] = useState([]);
  const [djs, setDjs] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    if (routeParams?.tab === 'djs') setMode('djs');
    else if (routeParams?.tab === 'events') setMode('events');
  }, [routeParams?.tab]);

  useEffect(() => {
    if (user?.activeProfileType === 'COMMUNITY') {
      navigate('communityDiscover', routeParams?.tab ? { tab: routeParams.tab } : undefined);
    }
  }, [user?.activeProfileType, navigate, routeParams?.tab]);

  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('home');
    }
  }, [user?.isAuthenticated, navigate]);

  const fetchEvents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingEvents(true);
    try {
      const data = await api.getEvents();
      if (data?.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setLoadingEvents(false);
      setRefreshing(false);
    }
  }, []);

  const fetchDjs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoadingDjs(true);
    try {
      const response = await api.getDjs();
      if (response?.success && Array.isArray(response.djs)) {
        setDjs(response.djs);
      } else {
        setDjs([]);
      }
    } catch {
      setDjs([]);
    } finally {
      setLoadingDjs(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (mode === 'djs' && djs.length === 0 && !loadingDjs) {
      fetchDjs();
    }
  }, [mode, djs.length, loadingDjs, fetchDjs]);

  const genres = useMemo(() => {
    const source = mode === 'events' ? events : djs;
    const values = source
      .map((item) => (mode === 'events' ? item.genre : item.genre || item.style))
      .filter(Boolean);
    return ['all', ...new Set(values)];
  }, [events, djs, mode]);

  useEffect(() => {
    setSelectedGenre('all');
  }, [mode]);

  const filteredEvents = useMemo(() => {
    const today = startOfToday();
    return events.filter((event) => {
      const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
      const q = debouncedSearchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        event.title?.toLowerCase().includes(q) ||
        event.location?.toLowerCase().includes(q) ||
        event.genre?.toLowerCase().includes(q);

      const eventDate = parseEventDate(event.date);
      let matchesDate = true;
      if (dateFilter !== 'all' && eventDate) {
        if (dateFilter === 'upcoming') matchesDate = eventDate >= today;
        if (dateFilter === 'past') matchesDate = eventDate < today;
      }

      return matchesGenre && matchesSearch && matchesDate;
    });
  }, [events, selectedGenre, debouncedSearchTerm, dateFilter]);

  const filteredDjs = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase();
    return djs.filter((dj) => {
      const djGenre = (dj.genre || dj.style || '').toString();
      const matchesGenre = selectedGenre === 'all' || djGenre === selectedGenre;
      const matchesSearch =
        !q ||
        dj.artistName?.toLowerCase().includes(q) ||
        djGenre.toLowerCase().includes(q) ||
        dj.city?.toLowerCase().includes(q);
      return matchesGenre && matchesSearch;
    });
  }, [djs, selectedGenre, debouncedSearchTerm]);

  const handleRefresh = () => {
    if (mode === 'events') fetchEvents(true);
    else fetchDjs(true);
  };

  const loading = mode === 'events' ? loadingEvents : loadingDjs;
  const dateOptions = [
    { id: 'upcoming', label: fr ? 'À venir' : 'Upcoming' },
    { id: 'past', label: fr ? 'Passés' : 'Past' },
    { id: 'all', label: fr ? 'Tous' : 'All' },
  ];

  const renderGenreChip = (genre) => {
    const active = selectedGenre === genre;
    const label =
      genre === 'all'
        ? fr ? 'Tous' : 'All'
        : genre;
    return (
      <TouchableOpacity
        key={genre}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => setSelectedGenre(genre)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
      >
        <NoxText variant="secondary" style={[styles.chipText, active && styles.chipTextActive]}>
          {label}
        </NoxText>
      </TouchableOpacity>
    );
  };

  const renderEventRow = (event) => {
    const statusStyle = getEventStatusStyle(event.status);
    const priceLabel = formatEventPriceBadge(event, language);
    const imageBroken = brokenImages[`ev-${event.id}`];

    return (
      <TouchableOpacity
        key={event.id}
        activeOpacity={0.85}
        onPress={() => navigate('eventDetail', { eventId: event.id })}
        accessibilityRole="button"
        accessibilityLabel={event.title}
      >
        <NoxCard style={styles.listCard} padded={false}>
          <View style={styles.eventThumb}>
            {event.image && !imageBroken ? (
              <Image
                source={{ uri: event.image }}
                style={styles.eventThumbImage}
                onError={() => setBrokenImages((prev) => ({ ...prev, [`ev-${event.id}`]: true }))}
              />
            ) : (
              <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
            )}
          </View>
          <View style={styles.itemBody}>
            <NoxText variant="form" style={styles.itemName} numberOfLines={2}>
              {event.title}
            </NoxText>
            <NoxText variant="secondary" numberOfLines={1}>
              {formatEventDateLabel(event.date, language)}
              {event.location ? ` · ${event.location}` : ''}
            </NoxText>
            {priceLabel ? (
              <NoxText variant="secondary" style={styles.itemPrice}>
                {priceLabel}
              </NoxText>
            ) : null}
            {statusStyle ? (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                ]}
              >
                <NoxText style={[styles.statusDotText, { color: statusStyle.color }]}>
                  {fr ? statusStyle.labelFr : statusStyle.labelEn}
                </NoxText>
              </View>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </NoxCard>
      </TouchableOpacity>
    );
  };

  const renderDjRow = (dj) => {
    const djGenre = dj.genre || dj.style || '';
    const imageBroken = brokenImages[`dj-${dj.id}`];

    return (
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
        accessibilityRole="button"
        accessibilityLabel={dj.artistName}
      >
        <NoxCard style={styles.listCard} padded={false}>
          <View style={styles.djThumb}>
            {dj.profileImage && !imageBroken ? (
              <Image
                source={{ uri: dj.profileImage }}
                style={styles.eventThumbImage}
                onError={() => setBrokenImages((prev) => ({ ...prev, [`dj-${dj.id}`]: true }))}
              />
            ) : (
              <Ionicons name="person" size={22} color={Colors.primary} />
            )}
          </View>
          <View style={styles.itemBody}>
            <NoxText variant="form" style={styles.itemName} numberOfLines={1}>
              {dj.artistName}
            </NoxText>
            {dj.city ? (
              <NoxText variant="secondary" numberOfLines={1}>
                {dj.city}
              </NoxText>
            ) : null}
            {djGenre ? (
              <NoxText variant="secondary" style={styles.itemGenre} numberOfLines={1}>
                {djGenre}
              </NoxText>
            ) : null}
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
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={mode === 'events' ? 'calendar-outline' : 'person-outline'}
          size={32}
          color={Colors.primary}
        />
      </View>
      <NoxText variant="titleSecondary" style={styles.emptyTitle}>
        {mode === 'events'
          ? fr ? 'Aucun événement trouvé' : 'No events found'
          : fr ? 'Aucun DJ trouvé' : 'No DJs found'}
      </NoxText>
      <NoxText variant="secondary" style={styles.emptyText}>
        {fr ? 'Essaie de modifier tes filtres ou ta recherche.' : 'Try changing your filters or search.'}
      </NoxText>
    </View>
  );

  if (loadingEvents && events.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.loadingContent}>
          <NoxScreenHeader
            title={fr ? 'Discover' : 'Discover'}
            subtitle={fr ? 'Événements et DJs' : 'Events and DJs'}
            onBack={goBack}
          />
          <SkeletonLoader width="100%" height={48} style={{ borderRadius: 12 }} />
          <SkeletonLoader width="100%" height={40} style={{ borderRadius: 12 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <SkeletonLoader width={80} height={34} style={{ borderRadius: 20 }} />
            <SkeletonLoader width={90} height={34} style={{ borderRadius: 20 }} />
            <SkeletonLoader width={70} height={34} style={{ borderRadius: 20 }} />
          </View>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <SkeletonLoader width="100%" height={56} style={{ borderRadius: 8, marginBottom: 12 }} />
              <SkeletonLoader width="70%" height={16} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="50%" height={14} />
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <View style={styles.headerBlock}>
        <NoxScreenHeader
          title="Discover"
          subtitle={fr ? 'Événements, artistes et lieux' : 'Events, artists and venues'}
          onBack={goBack}
        />

        <NoxSearchBar
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder={
            fr
              ? 'Rechercher un événement, un artiste ou un lieu'
              : 'Search an event, artist or venue'
          }
        />

        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, mode === 'events' && styles.segmentBtnActive]}
            onPress={() => setMode('events')}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'events' }}
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
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === 'djs' }}
          >
            <NoxText
              variant="buttonSecondary"
              style={[styles.segmentText, mode === 'djs' && styles.segmentTextActive]}
            >
              DJs
            </NoxText>
          </TouchableOpacity>
        </View>

        {mode === 'events' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
            {dateOptions.map((opt) => {
              const active = dateFilter === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setDateFilter(opt.id)}
                >
                  <NoxText variant="secondary" style={[styles.chipText, active && styles.chipTextActive]}>
                    {opt.label}
                  </NoxText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {genres.map(renderGenreChip)}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
      >
        {loading && mode === 'djs' ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 24 }} />
        ) : null}

        {mode === 'events'
          ? filteredEvents.map(renderEventRow)
          : filteredDjs.map(renderDjRow)}

        {!loading &&
        (mode === 'events' ? filteredEvents.length === 0 : filteredDjs.length === 0)
          ? renderEmptyState()
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}
