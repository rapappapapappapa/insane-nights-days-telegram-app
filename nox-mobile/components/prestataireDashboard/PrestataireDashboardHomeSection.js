import React from 'react';
import { View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from '../nox/NoxText';
import { Layout, Spacing } from '../../constants/theme';

export default function PrestataireDashboardHomeSection({
  language,
  styles,
  tiles,
  onSelectSection,
  displayName,
}) {
  const { width } = useWindowDimensions();
  const gap = Spacing.md;
  const tileSize = (width - Layout.screenPaddingHorizontal * 2 - gap) / 2;
  const fr = language === 'fr';
  const greeting = displayName
    ? fr
      ? `Salut ${displayName}`
      : `Hi ${displayName}`
    : fr
      ? 'Espace prestataire'
      : 'Provider hub';

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
          {fr
            ? 'Profil, invitations et contrats.'
            : 'Profile, invitations and contracts.'}
        </NoxText>
      </View>
      <View style={styles.hubGrid}>
        {tiles.map((tile, index) => {
          const isLeft = index % 2 === 0;
          return (
            <TouchableOpacity
              key={tile.id}
              style={[
                styles.hubTile,
                { width: tileSize, height: tileSize, marginRight: isLeft ? gap : 0 },
              ]}
              onPress={() => onSelectSection(tile.id)}
              activeOpacity={0.85}
            >
              <View style={[styles.hubTileIconWrap, { backgroundColor: tile.accentBg }]}>
                <Ionicons name={tile.icon} size={28} color={tile.accentColor} />
              </View>
              <NoxText variant="buttonSecondary" style={styles.hubTileLabel} numberOfLines={2}>
                {tile.label}
              </NoxText>
              <NoxText variant="secondary" style={styles.hubTileHint} numberOfLines={1}>
                {tile.hint}
              </NoxText>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}
