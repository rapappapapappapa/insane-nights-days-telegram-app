import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import { FontFamily } from '../../constants/typography';
import { Layout, Radius, Spacing } from '../../constants/theme';

/** Barre de recherche NOX (Figma feed / discover). */
export default function NoxSearchBar({
  value,
  onChangeText,
  placeholder,
  onPress,
  editable = true,
  style,
}) {
  const inner = (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={20} color={Colors.textTertiary} style={styles.icon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        editable={editable && !onPress}
        pointerEvents={onPress ? 'none' : 'auto'}
      />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="search">
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
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: Spacing.sm,
  },
});
