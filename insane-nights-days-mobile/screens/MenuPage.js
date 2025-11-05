import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';

const menuItems = [
  {
    title: '🎵 Événements',
    description: 'Découvrir les événements',
    screen: 'Events',
    emoji: '🎵',
  },
  {
    title: '🎟️ Mes Tickets',
    description: 'Gérer mes tickets',
    screen: 'Tickets',
    emoji: '🎟️',
  },
  {
    title: '🏆 Mon Profil',
    description: 'Voir mon profil',
    screen: 'Profile',
    emoji: '🏆',
  },
];

export default function MenuPage({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>I</Text>
        </View>
        <Text style={styles.title}>Menu Principal</Text>
        <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => navigation.navigate(item.screen)}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.iconEmoji}>{item.emoji}</Text>
            </View>
            <Text style={styles.menuTitle}>{item.title.split(' ').slice(1).join(' ')}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.disconnectButton}>
        <Text style={styles.disconnectText}>🔌 Déconnecter Wallet</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 20,
  },
  logo: {
    width: 64,
    height: 64,
    backgroundColor: '#ff7a1a',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#0b0b0e',
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    gap: 16,
  },
  menuItem: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconEmoji: {
    fontSize: 32,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  menuDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  disconnectButton: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 32,
  },
  disconnectText: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '600',
  },
});
