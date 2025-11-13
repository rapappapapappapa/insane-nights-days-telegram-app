import React, { useEffect, useState } from 'react';
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
import { api } from '../api/config';

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

export default function EventsPage({ onNavigate, onBuyTicket }) {
  const [events, setEvents] = useState(mockEvents);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const genres = ['all', ...new Set(events.map(event => event.genre))];

  const filteredEvents = events.filter(event => {
    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesGenre && matchesSearch;
  });

  const getAvailabilityColor = (sold, capacity) => {
    const percentage = (sold / capacity) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  if (loading && events.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#ff7a1a" />
        <Text style={styles.loadingText}>Chargement des événements...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.eventsTopBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('menu')}>
          <Text style={styles.backButtonTopText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.eventsScroll}
        contentContainerStyle={styles.eventsContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEvents(true)}
            tintColor="#ff7a1a"
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
          <TouchableOpacity
            key={event.id}
            style={styles.eventCard}
            activeOpacity={0.9}
            onPress={() => onNavigate('eventDetail', { eventId: event.id })}
          >
            <View style={styles.eventImageContainer}>
              <Image source={{ uri: event.image }} style={styles.eventImage} />
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>{event.price}€</Text>
              </View>
              <View style={styles.genreBadge}>
                <Text style={styles.genreText}>{event.genre}</Text>
              </View>
            </View>

            <View style={styles.eventContent}>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventDescription}>{event.description}</Text>

              <View style={styles.eventInfo}>
                <View style={styles.eventInfoRow}>
                  <Text style={styles.eventInfoIcon}>📅</Text>
                  <Text style={styles.eventInfoText}>
                    {event.date} à {event.time}
                  </Text>
                </View>
                <View style={styles.eventInfoRow}>
                  <Text style={styles.eventInfoIcon}>📍</Text>
                  <Text style={styles.eventInfoText}>{event.location}</Text>
                </View>
                <View style={styles.eventInfoRow}>
                  <Text style={styles.eventInfoIcon}>🎤</Text>
                  <Text style={styles.eventInfoText}>{event.djs.join(', ')}</Text>
                </View>
              </View>

              <View style={styles.availabilityContainer}>
                <View style={styles.availabilityHeader}>
                  <Text style={styles.availabilityLabel}>Places disponibles</Text>
                  <Text
                    style={[
                      styles.availabilityCount,
                      { color: getAvailabilityColor(event.sold, event.capacity) },
                    ]}
                  >
                    {event.capacity - event.sold} / {event.capacity}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${(event.sold / event.capacity) * 100}%`,
                        backgroundColor: getAvailabilityColor(event.sold, event.capacity),
                      },
                    ]}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => onNavigate('eventDetail', { eventId: event.id })}
              >
                <Text style={styles.detailsButtonText}>🎟️ Voir les Détails</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reserveButton}
                onPress={() => {
                  if (!onBuyTicket) {
                    return;
                  }
                  const ticket = onBuyTicket(event);
                  if (ticket) {
                    Alert.alert(
                      'Réservation confirmée',
                      `Votre ticket pour "${event.title}" est réservé.`,
                      [
                        {
                          text: 'Voir mes tickets',
                          onPress: () => onNavigate('tickets'),
                        },
                        {
                          text: 'Fermer',
                          style: 'cancel',
                        },
                      ],
                    );
                  }
                }}
              >
                <Text style={styles.reserveButtonText}>✅ Réserver ce ticket</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
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
    color: '#ff7a1a',
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
    borderColor: '#ff7a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
    color: '#ff7a1a',
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
    borderColor: 'rgba(255,122,26,0.3)',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#ff7a1a',
    borderColor: '#ff7a1a',
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
    borderColor: 'rgba(255,122,26,0.3)',
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
    backgroundColor: '#ff7a1a',
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
    borderTopColor: 'rgba(255,122,26,0.3)',
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
    backgroundColor: '#ff7a1a',
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

