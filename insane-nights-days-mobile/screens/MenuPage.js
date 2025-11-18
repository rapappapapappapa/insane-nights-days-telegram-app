import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';

const menuItems = [
  {
    id: 'events',
    emoji: '🎵',
    title: 'Événements',
    description: 'Découvrir les événements',
  },
  {
    id: 'ranking',
    emoji: '🏅',
    title: 'Classement DJs',
    description: 'Consulter le top artistes',
  },
  {
    id: 'tickets',
    emoji: '🎟️',
    title: 'Mes Tickets',
    description: 'Gérer mes tickets',
  },
  {
    id: 'register',
    emoji: '✨',
    title: 'Créer un compte',
    description: 'Inscription & progression',
  },
  {
    id: 'profile',
    emoji: '👤',
    title: 'Mon Profil',
    description: 'Personnaliser mon profil',
  },
];

export default function MenuPage({ onNavigate }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>I</Text>
        </View>
        <Text style={styles.title}>Menu Principal</Text>
        <Text style={styles.subtitle}>Que voulez-vous faire ?</Text>
      </View>

      <View style={styles.menuGrid}>
        {menuItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => onNavigate(item.id, item.params)}
              activeOpacity={0.85}
            >
            <Text style={styles.menuEmoji}>{item.emoji}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuDescription}>{item.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => onNavigate('home')}>
        <Text style={styles.backButtonText}>← Retour</Text>
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
    alignItems: 'stretch',
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  logo: {
    width: 72,
    height: 72,
    backgroundColor: '#ff7a1a',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: '#0b0b0e',
    fontSize: 32,
    fontWeight: '900',
  },
  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 6,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 420,
  },
  menuItem: {
    width: '48%',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.35)',
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  menuEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  menuTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  menuDescription: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 6,
  },
  backButton: {
    marginTop: 32,
    padding: 12,
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});
