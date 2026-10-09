import React from 'react';
import { View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import Colors from '../../constants/colors';
import { normalizeMediaUrl } from '../../api/config';
import { publicProfileStyles as styles } from './publicProfileStyles';

function formatEventBadge(iso, language) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = d
      .toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
    return `${day} ${month}.`;
  } catch {
    return '';
  }
}

/**
 * Carrousel événements profil public.
 * items: { id, title, date, location, image, tags?, onPress }
 */
export default function PublicProfileEventCarousel({
  language = 'fr',
  title,
  seeAllLabel,
  onSeeAll,
  items = [],
  emptyText,
}) {
  const fr = language === 'fr';
  return (
    <View>
      <View style={styles.sectionHeader}>
        <NoxText variant="titleSecondary" style={styles.sectionTitle}>
          {title || (fr ? 'Prochains événements' : 'Upcoming events')}
        </NoxText>
        {onSeeAll ? (
          <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
            <NoxText style={styles.seeAll}>
              {seeAllLabel || (fr ? 'Voir tout >' : 'See all >')}
            </NoxText>
          </TouchableOpacity>
        ) : null}
      </View>
      {items.length === 0 ? (
        <NoxText variant="secondary" style={styles.emptyHint}>
          {emptyText || (fr ? 'Aucun événement à venir.' : 'No upcoming events.')}
        </NoxText>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.eventsScroll}
        >
          {items.map((event) => {
            const badge = formatEventBadge(event.date, language);
            const imageUri = event.image ? normalizeMediaUrl(event.image) : null;
            return (
              <TouchableOpacity
                key={event.id}
                style={styles.eventCard}
                onPress={event.onPress}
                activeOpacity={0.9}
              >
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.eventImage} />
                ) : (
                  <View style={styles.eventImageFallback}>
                    <Ionicons name="calendar-outline" size={28} color={Colors.primary} />
                  </View>
                )}
                <View style={styles.eventOverlay} />
                {badge ? (
                  <View style={styles.eventBadge}>
                    <NoxText style={styles.eventBadgeText}>{badge}</NoxText>
                  </View>
                ) : null}
                <View style={styles.eventBottom}>
                  <View style={{ flex: 1 }}>
                    <NoxText style={styles.eventTitle} numberOfLines={1}>
                      {event.title || (fr ? 'Événement' : 'Event')}
                    </NoxText>
                    {event.location ? (
                      <NoxText variant="secondary" style={styles.eventLoc} numberOfLines={1}>
                        {event.location}
                      </NoxText>
                    ) : null}
                    {event.tags?.length ? (
                      <View style={styles.eventTags}>
                        {event.tags.slice(0, 2).map((tag) => (
                          <View key={tag} style={styles.eventTag}>
                            <NoxText style={styles.eventTagText}>{tag}</NoxText>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.eventArrow}>
                    <Ionicons name="arrow-forward" size={14} color={Colors.text} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
