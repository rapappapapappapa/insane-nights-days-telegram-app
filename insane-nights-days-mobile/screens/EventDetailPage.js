import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
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
    image: 'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=400&h=300&fit=crop',
    djs: ['Techno Master', 'DJ Neon'],
    description: 'Session techno underground dans un lieu unique',
  },
];

export default function EventDetailPage({ onNavigate, routeParams, onBuyTicket }) {
  const eventId = useMemo(
    () => routeParams?.eventId ?? mockEvents[0].id,
    [routeParams?.eventId],
  );

  const defaultEvent = useMemo(
    () => mockEvents.find((item) => item.id === eventId) ?? mockEvents[0],
    [eventId],
  );

  const [event, setEvent] = useState(defaultEvent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchEvent = async () => {
      if (isMounted) {
        setLoading(true);
        setError(null);
        setEvent(defaultEvent);
      }
      try {
        const data = await api.getEventById(eventId);
        if (data?.success && data.event && isMounted) {
          setEvent(data.event);
        } else if (isMounted) {
          setEvent(defaultEvent);
        }
      } catch (err) {
        if (isMounted) {
          setEvent(defaultEvent);
          setError("Impossible de charger l'événement en ligne.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [eventId, defaultEvent]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#ff7a1a" />
        <Text style={styles.loadingText}>Chargement de l'événement...</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('events')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => onNavigate('events')}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.image} />
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{event.price}€</Text>
          </View>
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{event.genre}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {event.date} à {event.time}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎤</Text>
              <Text style={styles.infoText}>{event.djs?.join(', ')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎟️</Text>
              <Text style={styles.infoText}>
                {event.capacity - event.sold} places restantes / {event.capacity}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => {
              if (!onBuyTicket) {
                return;
              }
              const ticket = onBuyTicket(event);
              if (ticket) {
                Alert.alert(
                  'Réservation confirmée',
                  `Ticket réservé pour "${event.title}".`,
                  [
                    { text: 'Voir mes tickets', onPress: () => onNavigate('tickets') },
                    { text: 'Fermer', style: 'cancel' },
                  ],
                );
              }
            }}
          >
            <Text style={styles.buyButtonText}>Acheter un ticket ({event.price}€)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
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
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.4)',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageContainer: {
    position: 'relative',
    height: 280,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  priceBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#ff7a1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  priceText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '900',
  },
  genreBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(11,11,14,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  genreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    color: '#f97316',
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 26,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
});
