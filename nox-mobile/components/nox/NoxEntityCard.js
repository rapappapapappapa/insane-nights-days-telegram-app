import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from './NoxText';
import NoxCard from './NoxCard';
import NoxButton from './NoxButton';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Spacing, Radius } from '../../constants/theme';

/**
 * Carte profil entité (organisateur, lieu…) — alignée maquette Figma event detail.
 */
export default function NoxEntityCard({
  title,
  subtitle,
  rating,
  meta,
  description,
  actionLabel,
  onPress,
  icon = 'person-outline',
}) {
  return (
    <NoxCard style={styles.card} padded={false}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Ionicons name={icon} size={22} color={primaryAlpha(0.7)} />
        </View>
        <View style={styles.body}>
          <NoxText variant="form" style={styles.name}>
            {title}
          </NoxText>
          {subtitle ? (
            <NoxText variant="secondary" style={styles.sub}>
              {subtitle}
            </NoxText>
          ) : null}
          {rating != null ? (
            <View style={styles.ratingRow}>
              <NoxText variant="form" style={styles.rating}>
                {rating}
              </NoxText>
              <Ionicons name="star" size={14} color={Colors.primary} />
            </View>
          ) : null}
          {meta ? (
            <NoxText variant="secondary" style={styles.meta}>
              {meta}
            </NoxText>
          ) : null}
        </View>
      </View>
      {description ? (
        <NoxText variant="description" style={styles.description}>
          {description}
        </NoxText>
      ) : null}
      {actionLabel && onPress ? (
        <NoxButton label={actionLabel} variant="ghost" onPress={onPress} style={styles.btn} />
      ) : null}
    </NoxCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, marginBottom: Spacing.md },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: primaryAlpha(0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: { fontWeight: '700' },
  sub: { marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rating: { color: Colors.primary },
  meta: { fontSize: 12, marginTop: 2 },
  description: { marginTop: Spacing.md },
  btn: { marginTop: Spacing.md },
});
