import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import NoxText from './NoxText';
import { FontFamily } from '../../constants/typography';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Layout, Spacing, Radius } from '../../constants/theme';

/**
 * Onglets horizontaux NOX (Figma feed) — alignés à gauche, indicateur bleu sous l’onglet actif.
 */
export default function NoxTabs({ tabs, activeId, onChange, style, variant = 'default' }) {
  const subtle = variant === 'subtle';
  return (
    <View style={[styles.row, subtle && styles.rowSubtle, style]}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              subtle && styles.tabSubtle,
              subtle && active && styles.tabSubtleActive,
            ]}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.accessibilityLabel || tab.label}
          >
            <NoxText
              style={[
                styles.label,
                subtle && styles.labelSubtle,
                active && (subtle ? styles.labelSubtleActive : styles.labelActive),
              ]}
            >
              {tab.label}
            </NoxText>
            {active && !subtle ? <View style={styles.indicator} /> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xxl,
    paddingHorizontal: Layout.screenPaddingHorizontal,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
  },
  rowSubtle: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0,
  },
  tab: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  tabSubtle: {
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.backgroundElevated,
  },
  tabSubtleActive: {
    backgroundColor: primaryAlpha(0.18),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  label: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  labelActive: {
    color: Colors.text,
    fontFamily: FontFamily.bold,
  },
  labelSubtle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  labelSubtleActive: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
  },
});
