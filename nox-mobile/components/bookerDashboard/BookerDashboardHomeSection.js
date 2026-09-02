import React from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import NotificationBadge from '../NotificationBadge';
import { Layout, Spacing } from '../../constants/theme';

export default function BookerDashboardHomeSection({
  language,
  styles,
  tiles,
  onSelectSection,
  unreadCount = 0,
  displayName,
}) {
  const { width } = useWindowDimensions();
  const horizontalPad = Layout.screenPaddingHorizontal;
  const gap = Spacing.md;
  const tileSize = (width - horizontalPad * 2 - gap) / 2;
  const fr = language === 'fr';

  const greeting = displayName
    ? fr
      ? `Salut ${displayName}`
      : `Hi ${displayName}`
    : fr
      ? 'Espace organisateur'
      : 'Organizer hub';

  const subtitle = fr
    ? 'Gère ton profil, tes événements et tes bookings.'
    : 'Manage your profile, events and bookings.';

  return (
    <ScrollView
      style={styles.hubScroll}
      contentContainerStyle={styles.hubScrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hubHero}>
        <NoxText variant="title" style={styles.hubGreeting}>
          {greeting}
        </NoxText>
        <NoxText variant="secondary" style={styles.hubSubtitle}>
          {subtitle}
        </NoxText>
      </View>

      <View style={styles.hubGrid}>
        {tiles.map((tile, index) => {
          const isLeftColumn = index % 2 === 0;
          return (
            <TouchableOpacity
              key={tile.id}
              style={[
                styles.hubTile,
                {
                  width: tileSize,
                  height: tileSize,
                  marginRight: isLeftColumn ? gap : 0,
                },
              ]}
              onPress={() => onSelectSection(tile.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.hubTileIconWrap, { backgroundColor: tile.accentBg }]}>
                <Ionicons name={tile.icon} size={28} color={tile.accentColor} />
                {tile.id === 'events' && unreadCount > 0 ? (
                  <View style={styles.hubTileBadge}>
                    <NotificationBadge count={unreadCount} />
                  </View>
                ) : null}
              </View>
              <NoxText variant="buttonSecondary" style={styles.hubTileLabel} numberOfLines={2}>
                {tile.label}
              </NoxText>
              {tile.hint ? (
                <NoxText variant="secondary" style={styles.hubTileHint} numberOfLines={1}>
                  {tile.hint}
                </NoxText>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
