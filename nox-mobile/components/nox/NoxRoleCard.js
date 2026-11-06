import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from './NoxText';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/theme';

/** Motifs décoratifs simulant la photo Figma (en attendant les assets exportés). */
function RoleArtwork({ tintColor, icon, wide }) {
  return (
    <View style={[styles.artwork, wide && styles.artworkWide]}>
      <View style={[styles.artBg, { backgroundColor: tintColor }]} />
      <View style={[styles.artOrb, styles.artOrbA, { backgroundColor: tintColor }]} />
      <View style={[styles.artOrb, styles.artOrbB, { backgroundColor: Colors.primary }]} />
      <View style={styles.artIconWrap}>
        <Ionicons name={icon} size={wide ? 34 : 40} color="rgba(255,255,255,0.92)" />
      </View>
    </View>
  );
}

/**
 * Carte rôle NOX — zone visuelle type Figma + bloc texte en bas.
 */
export default function NoxRoleCard({
  title,
  description,
  icon,
  tintColor = Colors.primary,
  wide = false,
  onPress,
  accessibilityLabel,
}) {
  return (
    <TouchableOpacity
      style={[styles.card, wide && styles.cardWide]}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <RoleArtwork tintColor={tintColor} icon={icon} wide={wide} />
      <View style={[styles.textBlock, wide && styles.textBlockWide]}>
        <NoxText style={styles.title}>{title}</NoxText>
        <NoxText variant="secondary" style={styles.desc} numberOfLines={2}>
          {description}
        </NoxText>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47.5%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: primaryAlpha(0.22),
    backgroundColor: Colors.backgroundCard,
  },
  cardWide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  artwork: {
    height: 108,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundElevated,
  },
  artworkWide: {
    width: 120,
    height: 'auto',
    minHeight: 112,
  },
  artBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  artOrb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.45,
  },
  artOrbA: {
    width: 90,
    height: 90,
    top: -20,
    right: -10,
  },
  artOrbB: {
    width: 56,
    height: 56,
    bottom: -12,
    left: 12,
    opacity: 0.25,
  },
  artIconWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  textBlockWide: {
    flex: 1,
    justifyContent: 'center',
    borderTopWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: Colors.borderSubtle,
  },
  title: {
    fontSize: 17,
    marginBottom: 4,
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textSecondary,
  },
});
