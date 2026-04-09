/**
 * Composant EventCard optimisé avec React.memo
 * Réduit les re-renders inutiles en mémorisant le composant
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Colors from '../constants/colors';

const EventCard = React.memo(({ event, onPress }) => {
  const getAvailabilityColor = (sold, capacity) => {
    const percentage = (sold / capacity) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const availabilityColor = getAvailabilityColor(event.sold, event.capacity);
  const availabilityPercentage = (event.sold / event.capacity) * 100;

  return (
    <TouchableOpacity
      style={styles.eventCard}
      activeOpacity={0.9}
      onPress={() => onPress(event.id)}
    >
      <View style={styles.eventImageContainer}>
        <Image source={{ uri: event.image }} style={styles.eventImage} />
        <View style={styles.priceBadge}>
          <Text style={styles.priceText}>{event.price}€</Text>
        </View>
        <View style={styles.genreBadge}>
          <Text style={styles.genreText}>{event.genre}</Text>
        </View>
        {event.status && (
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  event.status === 'UPCOMING'
                    ? '#10b98120'
                    : event.status === 'ONGOING'
                    ? '#f59e0b20'
                    : '#6b728020',
                borderColor:
                  event.status === 'UPCOMING'
                    ? '#10b981'
                    : event.status === 'ONGOING'
                    ? '#f59e0b'
                    : '#6b7280',
              },
            ]}
          >
            <Text
              style={[
                styles.statusBadgeText,
                {
                  color:
                    event.status === 'UPCOMING'
                      ? '#10b981'
                      : event.status === 'ONGOING'
                      ? '#f59e0b'
                      : '#6b7280',
                },
              ]}
            >
              {event.status === 'UPCOMING'
                ? 'À venir'
                : event.status === 'ONGOING'
                ? 'En cours'
                : 'Terminé'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventDescription} numberOfLines={2}>
          {event.description}
        </Text>

        <View style={styles.eventInfo}>
          <View style={styles.eventInfoRow}>
            <Text style={styles.eventInfoIcon}>📅</Text>
            <Text style={styles.eventInfoText}>
              {event.date} {event.time && `à ${event.time}`}
            </Text>
          </View>
          <View style={styles.eventInfoRow}>
            <Text style={styles.eventInfoIcon}>📍</Text>
            <Text style={styles.eventInfoText}>{event.location}</Text>
          </View>
          {event.djs && event.djs.length > 0 && (
            <View style={styles.eventInfoRow}>
              <Text style={styles.eventInfoIcon}>🎧</Text>
              <Text style={styles.eventInfoText}>
                {event.djs.map(dj => typeof dj === 'object' && dj?.artistName ? dj.artistName : String(dj)).join(', ')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.availabilityContainer}>
          <View style={styles.availabilityHeader}>
            <Text style={styles.availabilityLabel}>Places disponibles</Text>
            <Text style={[styles.availabilityCount, { color: availabilityColor }]}>
              {event.capacity - event.sold} / {event.capacity}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${availabilityPercentage}%`,
                  backgroundColor: availabilityColor,
                },
              ]}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => onPress(event.id)}
        >
          <Text style={styles.detailsButtonText}>🎟️ Voir les Détails</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}, (prevProps, nextProps) => {
  // Comparaison personnalisée pour éviter les re-renders inutiles
  // Ne re-rendre que si l'ID, le nombre de places vendues, ou le statut change
  return (
    prevProps.event.id === nextProps.event.id &&
    prevProps.event.sold === nextProps.event.sold &&
    prevProps.event.status === nextProps.event.status &&
    prevProps.onPress === nextProps.onPress
  );
});

EventCard.displayName = 'EventCard';

const styles = StyleSheet.create({
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  priceText: {
    color: Colors.background,
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
    fontWeight: '600',
  },
  availabilityCount: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  detailsButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
});

export default EventCard;
