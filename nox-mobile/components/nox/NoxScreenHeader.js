import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import NoxText from './NoxText';
import Colors from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';

/** En-tête d'écran NOX — retour + titre + slot droit optionnel. */
export default function NoxScreenHeader({
  title,
  subtitle,
  onBack,
  rightSlot,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>
      <View style={styles.center}>
        <NoxText variant="titleSecondary" style={styles.title} numberOfLines={2}>
          {title}
        </NoxText>
        {subtitle ? (
          <NoxText variant="secondary" style={styles.subtitle} numberOfLines={2}>
            {subtitle}
          </NoxText>
        ) : null}
      </View>
      <View style={styles.right}>{rightSlot || <View style={styles.backPlaceholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: Layout.headerHeight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  left: {
    width: 44,
    alignItems: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
  },
  right: {
    width: 44,
    alignItems: 'flex-end',
  },
  backBtn: {
    padding: Spacing.xs,
  },
  backPlaceholder: {
    width: 32,
  },
  title: {
    textAlign: 'center',
    fontSize: 18,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 2,
  },
});
