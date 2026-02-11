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
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import { useDebounce } from '../../hooks/useDebounce';
import SkeletonLoader from '../../components/SkeletonLoader';
import EventCard from '../../components/EventCard';

const mockEvents = [
  {
    id: '1',
    title: 'Insane Night - Soirée Electro',
    date: '15 Janvier 2024',
    time: '22:00',
    location: 'Club Insane, Paris',
    price: 25,
    capacity: 200,
    sold: 45,
    genre: 'Electro',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    djs: ['DJ Neon', 'Mixmaster Nova'],
    description: 'Une soirée électro explosive avec les meilleurs DJs de la scène underground',
  },
  {
    id: '2',
    title: 'Bass Revolution - Drum & Bass',
    date: '20 Janvier 2024',
    time: '21:00',
    location: 'Warehouse Underground, Lyon',
    price: 30,
    capacity: 150,
    sold: 78,
    genre: 'Drum & Bass',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['Bass Storm', 'DJ Cyber'],
    description: 'Une révolution sonore avec les meilleurs artistes drum & bass',
  },
  {
    id: '3',
    title: 'Techno Underground Session',
    date: '25 Janvier 2024',
    time: '23:00',
    location: 'Le Bunker, Marseille',
    price: 20,
    capacity: 300,
    sold: 120,
    genre: 'Techno',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['DJ Dark', 'Techno Master'],
    description: 'Session techno underground dans un lieu unique',
  },
];

export default function EventsPage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();
  const [events, setEvents] = useState(mockEvents);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
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
      console.log('⚠️ Backend non accessible, utilisation des données locales');
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
    return events.filter(event => {
      const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
      const matchesSearch =
        event.title.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      return matchesGenre && matchesSearch;
    });
  }, [events, selectedGenre, debouncedSearchTerm]);

  const getAvailabilityColor = (sold, capacity) => {
    const percentage = (sold / capacity) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

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
            tintColor="#FF1744"
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
    backgroundColor: '#0b0b0e',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 16,
    fontSize: 14,
  },
  eventsTopBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0b0b0e',
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonTopText: {
    color: '#FF1744',
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
    borderColor: '#FF1744',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#FF1744',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
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
    backgroundColor: '#FF1744',
    borderColor: '#FF1744',
  },
  filterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0b0b0e',
  },
  eventCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  eventImageContainer: {
    position: 'relative',
    height: 200,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF1744',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: '#0b0b0e',
    fontSize: 14,
    fontWeight: '800',
  },
  genreBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(11,11,14,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eventContent: {
    padding: 16,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  eventDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  eventInfo: {
    marginBottom: 16,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventInfoIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  eventInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    flex: 1,
  },
  availabilityContainer: {
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,23,68,0.3)',
  },
  availabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  availabilityLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  availabilityCount: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#0b0b0e',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  detailsButton: {
    backgroundColor: '#FF1744',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  detailsButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
  reserveButton: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  reserveButtonText: {
    color: '#fefce8',
    fontSize: 16,
    fontWeight: '700',
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

