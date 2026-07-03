import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';
import Colors, { primaryAlpha } from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius } from '../../constants/theme';

/**
 * Bouton NOX — primary (bleu plein), secondary (outline), ghost.
 */
export default function NoxButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
  textStyle,
  iconLeft,
  iconRight,
}) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';

  return (
    <TouchableOpacity
      style={[
        styles.base,
        fullWidth && styles.fullWidth,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGhost && styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#000' : Colors.primary} />
      ) : (
        <View style={styles.row}>
          {iconLeft}
          <Text
            style={[
              styles.label,
              isPrimary && styles.labelPrimary,
              isSecondary && styles.labelSecondary,
              isGhost && styles.labelGhost,
              textStyle,
            ]}
          >
            {label}
          </Text>
          {iconRight}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: Layout.buttonHeight,
    borderRadius: Radius.button,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  ghost: {
    backgroundColor: primaryAlpha(0.12),
    borderWidth: 1,
    borderColor: primaryAlpha(0.35),
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
  },
  labelPrimary: {
    color: '#000000',
  },
  labelSecondary: {
    color: '#ffffff',
  },
  labelGhost: {
    color: Colors.primary,
  },
});
