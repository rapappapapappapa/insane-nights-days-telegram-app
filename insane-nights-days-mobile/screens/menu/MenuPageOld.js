import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  {
    id: 'feed',
    emoji: '📰',
    title: 'Feed',
    description: 'Actualités et posts',
  },
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
  {
    id: 'switchProfile',
    emoji: '🔄',
    title: 'Changer de profil',
    description: 'Basculer entre tes profils',
  },
];

export default function MenuPage() {
  const { navigate } = useNavigation();
  const { user } = useAuth();

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
        {menuItems.map(item => {
          // Masquer "Changer de profil" si l'utilisateur n'est pas connecté
          if (item.id === 'switchProfile' && !user?.isAuthenticated) {
            return null;
          }
          
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => navigate(item.id, item.params)}
              activeOpacity={0.85}
            >
              <Text style={styles.menuEmoji}>{item.emoji}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigate('home')}>
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
    backgroundColor: '#FF1744',
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
    borderColor: 'rgba(255,23,68,0.35)',
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
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
});
