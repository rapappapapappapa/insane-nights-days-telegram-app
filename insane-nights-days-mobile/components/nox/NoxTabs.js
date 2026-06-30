import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import NoxText from './NoxText';
import { FontFamily } from '../../constants/typography';
import Colors from '../../constants/colors';
import { Layout, Spacing } from '../../constants/theme';

/**
 * Onglets horizontaux NOX (Figma feed) — alignés à gauche, indicateur bleu sous l’onglet actif.
 */
export default function NoxTabs({ tabs, activeId, onChange, style }) {
  return (
    <View style={[styles.row, style]}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tab}
            onPress={() => onChange(tab.id)}
            activeOpacity={0.75}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.accessibilityLabel || tab.label}
          >
            <NoxText style={[styles.label, active && styles.labelActive]}>{tab.label}</NoxText>
            {active ? <View style={styles.indicator} /> : null}
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
  tab: {
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  label: {
    fontSize: 15,
    color: Colors.textTertiary,
  },
  labelActive: {
    color: Colors.text,
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
