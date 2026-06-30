import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { Radius, Spacing } from '../../constants/theme';

/** Carte / surface NOX — fond élevé, bordure bleue légère. */
export default function NoxCard({ children, style, padded = true, variant = 'default' }) {
  return (
    <View
      style={[
        styles.card,
        variant === 'outline' && styles.outline,
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: primaryAlpha(0.2),
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.borderSubtle,
  },
  padded: {
    padding: Spacing.lg,
  },
});
