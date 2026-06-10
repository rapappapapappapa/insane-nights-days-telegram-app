import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../api/config';
import { useDebounce } from '../../hooks/useDebounce';
import SkeletonLoader from '../../components/SkeletonLoader';
import EventCard from '../../components/EventCard';
import { EVENT_DETAIL_MOCK_EVENTS as mockEvents } from '../../utils/eventDetailPageUtils';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseEventDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function EventsPage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const [events, setEvents] = useState(mockEvents);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [dateFilter, setDateFilter] = useState('upcoming');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // ✅ AJOUT: Vérifier l'authentification et rediriger si non connecté
  useEffect(() => {
    if (!user?.isAuthenticated) {
      navigate('home');
    }
  }, [user?.isAuthenticated, navigate]);

  const fetchEvents = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await api.getEvents();
      if (data && data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      } else {
        setEvents(mockEvents);
      }
    } catch (error) {
      setEvents(mockEvents);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const genres = useMemo(() => {
    return ['all', ...new Set(events.map(event => event.genre))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    const today = startOfToday();
    return events.filter((event) => {
      const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
      const matchesSearch =
        event.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase());

      const eventDate = parseEventDate(event.date);
      let matchesDate = true;
      if (dateFilter !== 'all' && eventDate) {
        if (dateFilter === 'upcoming') matchesDate = eventDate >= today;
        if (dateFilter === 'past') matchesDate = eventDate < today;
      }

      return matchesGenre && matchesSearch && matchesDate;
    });
  }, [events, selectedGenre, debouncedSearchTerm, dateFilter]);

  if (loading && events.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.eventsTopBar}>
          <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('welcome')}>
            <Text style={styles.backButtonTopText}>← Retour</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.eventsScroll} contentContainerStyle={styles.eventsContent}>
          <View style={styles.eventsHeader}>
            <SkeletonLoader width="60%" height={28} style={{ marginBottom: 8 }} />
            <SkeletonLoader width="80%" height={14} />
          </View>
          
          <SkeletonLoader width="100%" height={50} style={{ marginBottom: 16, borderRadius: 12 }} />
          
          <View style={{ flexDirection: 'row', marginBottom: 20 }}>
            <SkeletonLoader width={80} height={36} style={{ marginRight: 8, borderRadius: 20 }} />
            <SkeletonLoader width={100} height={36} style={{ marginRight: 8, borderRadius: 20 }} />
            <SkeletonLoader width={90} height={36} style={{ borderRadius: 20 }} />
          </View>
          
          {[1, 2, 3].map(i => (
            <View key={i} style={styles.eventCard}>
              <SkeletonLoader width="100%" height={200} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="80%" height={20} style={{ marginBottom: 8 }} />
              <SkeletonLoader width="60%" height={16} style={{ marginBottom: 12 }} />
              <SkeletonLoader width="100%" height={12} style={{ marginBottom: 4 }} />
              <SkeletonLoader width="70%" height={12} style={{ marginBottom: 16 }} />
              <SkeletonLoader width="100%" height={48} style={{ borderRadius: 12 }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.eventsTopBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('welcome')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.eventsScroll}
        contentContainerStyle={styles.eventsContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEvents(true)}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.eventsHeader}>
          <Text style={styles.eventsTitle}>📅 Événements</Text>
          <Text style={styles.eventsSubtitle}>Découvrez tous les événements</Text>
        </View>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un événement..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateFiltersContainer}>
          {[
            { id: 'upcoming', label: language === 'fr' ? 'À venir' : 'Upcoming' },
            { id: 'past', label: language === 'fr' ? 'Passés' : 'Past' },
            { id: 'all', label: language === 'fr' ? 'Tous' : 'All' },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.filterButton, dateFilter === opt.id && styles.filterButtonActive]}
              onPress={() => setDateFilter(opt.id)}
            >
              <Text
                style={[styles.filterText, dateFilter === opt.id && styles.filterTextActive]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {genres.map(genre => (
            <TouchableOpacity
              key={genre}
              style={[
                styles.filterButton,
                selectedGenre === genre && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedGenre(genre)}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedGenre === genre && styles.filterTextActive,
                ]}
              >
                {genre === 'all' ? '🎵 Tous' : genre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filteredEvents.map(event => (
          <EventCard
            key={event.id}
            event={event}
            language={language}
            onPress={(eventId) => navigate('eventDetail', { eventId })}
          />
        ))}

        {filteredEvents.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>😔</Text>
            <Text style={styles.emptyTitle}>Aucun événement trouvé</Text>
            <Text style={styles.emptyText}>
              Essayez de modifier vos filtres ou votre recherche
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  eventsTopBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.background,
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  eventsScroll: {
    flex: 1,
  },
  eventsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  eventsHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  eventsTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
  },
  eventsSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: Colors.primary,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  dateFiltersContainer: {
    marginBottom: 12,
  },
  filtersContainer: {
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.background,
  },
  // eventCard sert encore au squelette de chargement
  eventCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
});

