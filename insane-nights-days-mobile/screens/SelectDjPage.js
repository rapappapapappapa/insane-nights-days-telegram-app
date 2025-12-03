import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import StarRating from '../components/StarRating';

export default function SelectDjPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { selectedDjIds = [] } = routeParams || {}; // IDs déjà sélectionnés
  
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.token) {
      fetchAvailableDjs();
    }
  }, [user?.token]);

  const fetchAvailableDjs = async () => {
    setLoading(true);
    try {
      const response = await api.getAvailableDjs(user.token);
      if (response && response.success && Array.isArray(response.djs)) {
        setDjs(response.djs);
      } else {
        setDjs([]);
      }
    } catch (error) {
      console.error('Erreur récupération DJs disponibles:', error);
      setDjs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDjPress = (dj) => {
    // Naviguer vers le profil DJ en mode sélection
    navigate('djProfile', {
      djId: dj.id,
      djUserId: dj.userId,
      djName: dj.artistName,
      selectionMode: true, // Mode sélection
      selectedDjIds: selectedDjIds, // Passer les IDs déjà sélectionnés
      returnTo: 'selectDj', // Retourner ici après sélection
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff7a1a" />
          <Text style={styles.loadingText}>
            {language === 'fr' ? 'Chargement...' : 'Loading...'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Sélectionner des DJs' : 'Select DJs'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {language === 'fr' 
            ? 'Appuyez sur un DJ pour voir son profil et le sélectionner'
            : 'Tap on a DJ to view their profile and select them'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {djs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {language === 'fr' ? 'Aucun DJ disponible' : 'No DJs available'}
            </Text>
          </View>
        ) : (
          djs.map((dj) => {
            const isSelected = selectedDjIds.includes(dj.userId);
            return (
              <TouchableOpacity
                key={dj.userId}
                style={[styles.djCard, isSelected && styles.djCardSelected]}
                onPress={() => handleDjPress(dj)}
                activeOpacity={0.85}
              >
                <View style={styles.djCardHeader}>
                  <View style={styles.djAvatar}>
                    <Text style={styles.djAvatarText}>
                      {dj.artistName?.charAt(0) || 'DJ'}
                    </Text>
                  </View>
                  <View style={styles.djInfo}>
                    <Text style={styles.djName}>{dj.artistName || 'DJ'}</Text>
                    {dj.hourlyRate && (
                      <Text style={styles.djRate}>
                        💰 {dj.hourlyRate} €/h
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>✓</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.2)',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  djCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  djCardSelected: {
    borderColor: '#ff7a1a',
    backgroundColor: 'rgba(255,122,26,0.1)',
  },
  djCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  djAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff7a1a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  djAvatarText: {
    color: '#0b0b0e',
    fontSize: 24,
    fontWeight: '800',
  },
  djInfo: {
    flex: 1,
  },
  djName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  djRate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  selectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff7a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '700',
  },
});

