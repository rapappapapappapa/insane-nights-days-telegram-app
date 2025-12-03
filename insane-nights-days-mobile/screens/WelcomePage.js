import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import { api } from '../api/config';

export default function WelcomePage() {
  const { language, t } = useLanguage();
  const { user, logout, updateUser } = useAuth();
  const { navigate } = useNavigation();
  const [loadingUserData, setLoadingUserData] = useState(false);

  useEffect(() => {
    // Charger les données utilisateur complètes si connecté
    // Recharger aussi si on arrive sur la page pour s'assurer que activeProfileType est à jour
    if (user?.isAuthenticated && user?.token) {
      loadUserData();
    }
  }, [user?.isAuthenticated, user?.token]);

  const loadUserData = async () => {
    if (!user?.token) return;
    setLoadingUserData(true);
    try {
      const response = await api.getCurrentUser(user.token);
      if (response && response.success && response.user) {
        updateUser({
          activeProfileType: response.user.activeProfileType,
          score: response.user.score,
          level: response.user.level,
        });
      }
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    } finally {
      setLoadingUserData(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>I</Text>
          </View>
          <Text style={styles.welcomeText}>
            {language === 'fr' ? 'Bienvenue' : 'Welcome'}
          </Text>
          <Text style={styles.usernameText}>{user?.username || 'Utilisateur'}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            {language === 'fr'
              ? 'Que souhaitez-vous faire ?'
              : 'What would you like to do?'}
          </Text>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigate('events')}
            >
              <Text style={styles.actionEmoji}>🎵</Text>
              <Text style={styles.actionText}>
                {language === 'fr' ? 'Événements' : 'Events'}
              </Text>
            </TouchableOpacity>

            {/* Afficher "Mes Tickets" uniquement pour le profil COMMUNITY */}
            {user?.activeProfileType === 'COMMUNITY' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigate('tickets')}
            >
              <Text style={styles.actionEmoji}>🎟️</Text>
              <Text style={styles.actionText}>
                {language === 'fr' ? 'Mes Tickets' : 'My Tickets'}
              </Text>
            </TouchableOpacity>
            )}

            {/* Afficher "Dashboard DJ" pour les DJs */}
            {user?.activeProfileType === 'DJ' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigate('djDashboard')}
              >
                <Text style={styles.actionEmoji}>🎧</Text>
                <Text style={styles.actionText}>
                  {language === 'fr' ? 'Dashboard DJ' : 'DJ Dashboard'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Afficher "Dashboard Booker" et les listes DJ / Lieux pour les Bookers */}
            {user?.activeProfileType === 'BOOKER' && (
              <>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigate('bookerDashboard')}
                >
                  <Text style={styles.actionEmoji}>📅</Text>
                  <Text style={styles.actionText}>
                    {language === 'fr' ? 'Dashboard Booker' : 'Booker Dashboard'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => navigate('venueList')}
                >
                  <Text style={styles.actionEmoji}>🏢</Text>
                  <Text style={styles.actionText}>
                    {language === 'fr' ? 'Liste des lieux' : 'Venue List'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigate('djList')}
            >
              <Text style={styles.actionEmoji}>🎧</Text>
              <Text style={styles.actionText}>
                {language === 'fr' ? 'Liste des DJs' : 'DJ List'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigate('profile')}
            >
              <Text style={styles.actionEmoji}>👤</Text>
              <Text style={styles.actionText}>
                {language === 'fr' ? 'Mon Profil' : 'My Profile'}
              </Text>
            </TouchableOpacity>

            {user?.isAuthenticated && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigate('switchProfile')}
              >
                <Text style={styles.actionEmoji}>🔄</Text>
                <Text style={styles.actionText}>
                  {language === 'fr' ? 'Changer de profil' : 'Switch Profile'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            logout();
            navigate('home');
          }}
        >
          <Text style={styles.logoutButtonText}>
            {language === 'fr' ? 'Déconnexion' : 'Logout'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#ff7a1a',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    color: '#0b0b0e',
    fontSize: 42,
    fontWeight: '900',
  },
  welcomeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 8,
  },
  usernameText: {
    color: '#ff7a1a',
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    width: '45%',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  actionEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,122,26,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.5)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});

