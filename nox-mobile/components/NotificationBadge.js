import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '../constants/colors';

/**
 * Composant Badge pour afficher un compteur de notifications
 * @param {number} count - Le nombre de notifications non lues
 * @param {Object} style - Styles additionnels pour le conteneur
 * @param {Function} onPress - Callback appelé quand on clique sur le badge
 */
export default function NotificationBadge({ count = 0, style, onPress }) {
  if (count <= 0) {
    return null;
  }

  // Afficher "99+" si le nombre dépasse 99
  const displayCount = count > 99 ? '99+' : count.toString();

  const BadgeContent = (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );

  // Si onPress est fourni, rendre le badge cliquable
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {BadgeContent}
      </TouchableOpacity>
    );
  }

  return BadgeContent;
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
    zIndex: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});
