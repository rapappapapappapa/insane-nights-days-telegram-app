import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../constants/theme';

/** Carte / surface NOX — spec Figma : r25, bordure 0.5 #FEFEFD, ombre bleutée. */
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
    borderWidth: 0.5,
    borderColor: Colors.borderCard,
    // Figma : 2px 5px 8px rgba(114,194,244,0.5)
    shadowColor: Colors.cardShadow,
    shadowOffset: { width: 2, height: 5 },
    shadowRadius: 8,
    shadowOpacity: 0.5,
    elevation: 4,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: Colors.borderSubtle,
  },
  padded: {
    padding: Spacing.lg,
  },
});
