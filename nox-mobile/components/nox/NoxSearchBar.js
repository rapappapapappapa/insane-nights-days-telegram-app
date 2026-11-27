import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

/** Barre de recherche NOX — saisie libre ou raccourci (onPress) vers une autre page. */
export default function NoxSearchBar({
  value,
  onChangeText,
  placeholder,
  onPress,
  editable = true,
  style,
  accessibilityLabel,
}) {
  const isShortcut = typeof onPress === 'function';

  const inner = (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={20} color={Colors.textTertiary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        editable={editable && !isShortcut}
        pointerEvents={isShortcut ? 'none' : 'auto'}
      />
      {isShortcut ? (
        <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={styles.chevron} />
      ) : null}
    </View>
  );

  if (isShortcut) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || placeholder}
      >
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: Colors.backgroundInput,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.lg,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
});
