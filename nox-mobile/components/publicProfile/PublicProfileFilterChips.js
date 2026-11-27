import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import NoxText from '../nox/NoxText';
import { publicProfileStyles as styles } from './publicProfileStyles';

/**
 * Pills de filtre sous les onglets profil public.
 * chips: [{ id, label }]
 */
export default function PublicProfileFilterChips({ chips = [], activeId, onChange }) {
  if (!chips.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChipsRow}
    >
      {chips.map((chip) => {
        const active = activeId === chip.id;
        return (
          <TouchableOpacity
            key={chip.id}
            style={[styles.filterChip, active && styles.filterChipActive]}
            onPress={() => onChange?.(chip.id)}
            activeOpacity={0.85}
          >
            <NoxText style={[styles.filterChipText, active && styles.filterChipTextActive]}>
              {chip.label}
            </NoxText>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
