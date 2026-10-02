import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '../constants/colors';
import { FontFamily } from '../constants/typography';

/**
 * Composant pour afficher un état vide avec un message et une action optionnelle
 */
export default function EmptyState({ 
  emoji = '📭', 
  title, 
  message, 
  actionLabel, 
  onAction 
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      {title && <Text style={styles.title}>{title}</Text>}
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontFamily: FontFamily.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: FontFamily.regular,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  actionText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: FontFamily.bold,
  },
});

