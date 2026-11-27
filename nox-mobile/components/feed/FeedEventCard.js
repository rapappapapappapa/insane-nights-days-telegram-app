import React from 'react';
import { Text, View, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { formatEventPriceBadge } from '../../utils/eventPriceUtils';
import { styles } from '../../screens/feed/FeedPage.styles';

export default function FeedEventCard({ item, language, onEventPress }) {
  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => onEventPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={
        `${item.title || 'Événement'}. ${
          item.price != null
            ? `${item.hasMultipleTicketPrices ? (language === 'fr' ? 'dès ' : 'from ') : ''}${item.price} €. `
            : ''
        }` + (language === 'fr' ? 'Ouvrir le détail' : 'Open details')
      }
    >
      <View style={styles.eventHeader}>
        <Ionicons name="musical-notes" size={24} color={Colors.primary} />
        <Text style={styles.eventBadge}>{language === 'fr' ? 'Événement' : 'Event'}</Text>
      </View>

      {item.image && (
        <Image source={{ uri: item.image }} style={styles.eventImage} resizeMode="cover" />
      )}

      <Text style={styles.eventTitle}>{item.title}</Text>
      {item.description && (
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.eventInfo}>
        <View style={styles.eventInfoRow}>
          <Ionicons name="calendar" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.eventInfoText}>
            {new Date(item.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.eventInfoRow}>
          <Ionicons name="location" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.eventInfoText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>
        <View style={styles.eventInfoRow}>
          <Ionicons name="cash" size={16} color="rgba(255,255,255,0.6)" />
          <Text style={styles.eventInfoText}>{formatEventPriceBadge(item, language)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
