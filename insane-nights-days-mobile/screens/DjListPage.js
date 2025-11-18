import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { api } from '../api/config';
import StarRating from '../components/StarRating';

export default function DjListPage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDjs();
  }, []);

  const fetchDjs = async () => {
    setLoading(true);
    try {
      const response = await api.getDjs();
      if (response && response.success && Array.isArray(response.djs)) {
        setDjs(response.djs);
      } else {
        setDjs([]);
      }
    } catch (error) {
      console.error('Erreur récupération DJs:', error);
      setDjs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDjPress = (dj) => {
    // Naviguer vers la page de profil DJ
    navigate('djProfile', {
      djId: dj.id,
      djUserId: dj.userId,
      djName: dj.artistName,
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
          {language === 'fr' ? 'Liste des DJs' : 'DJ List'}
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
          djs.map((dj) => (
            <TouchableOpacity
              key={dj.id || dj.userId}
              style={styles.djCard}
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
                  <Text style={styles.djCity}>
                    📍 {dj.city || language === 'fr' ? 'Ville inconnue' : 'Unknown city'}
                  </Text>
                </View>
                <View style={styles.djRating}>
                  <StarRating rating={dj.averageRatingGlobal || 0} size={20} showStars={false} />
                  <Text style={styles.ratingCount}>
                    ({dj.totalRatingsGlobal || 0} {language === 'fr' ? 'avis' : 'reviews'})
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
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
  djCity: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  djRating: {
    alignItems: 'flex-end',
  },
  ratingCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
  },
});

