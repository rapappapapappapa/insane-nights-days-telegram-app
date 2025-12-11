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

export default function SelectVenuePage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { selectedVenueId } = routeParams || {}; // ID déjà sélectionné
  
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.token) {
      fetchVenues();
    }
  }, [user?.token]);

  const fetchVenues = async () => {
    setLoading(true);
    try {
      const response = await api.getVenues(user.token);
      if (response && response.success && Array.isArray(response.venues)) {
        setVenues(response.venues);
      } else {
        setVenues([]);
      }
    } catch (error) {
      console.error('Erreur récupération lieux:', error);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVenuePress = (venue) => {
    // Naviguer vers le profil du lieu en mode sélection
    navigate('venueProfile', {
      venueId: venue.id,
      venueName: venue.venueName,
      selectionMode: true, // Mode sélection
      selectedVenueId: selectedVenueId, // Passer l'ID déjà sélectionné
      returnTo: 'selectVenue', // Retourner ici après sélection
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF1744" />
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
          {language === 'fr' ? 'Sélectionner un lieu' : 'Select a venue'}
        </Text>
        <Text style={styles.headerSubtitle}>
          {language === 'fr' 
            ? 'Appuyez sur un lieu pour voir son profil et le sélectionner'
            : 'Tap on a venue to view their profile and select it'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {venues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {language === 'fr' ? 'Aucun lieu disponible' : 'No venues available'}
            </Text>
          </View>
        ) : (
          venues.map((venue) => {
            const isSelected = selectedVenueId === venue.id;
            return (
              <TouchableOpacity
                key={venue.id}
                style={[styles.venueCard, isSelected && styles.venueCardSelected]}
                onPress={() => handleVenuePress(venue)}
                activeOpacity={0.85}
              >
                <View style={styles.venueCardHeader}>
                  <View style={styles.venueIcon}>
                    <Text style={styles.venueIconText}>🏢</Text>
                  </View>
                  <View style={styles.venueInfo}>
                    <Text style={styles.venueName}>{venue.venueName}</Text>
                    <Text style={styles.venueAddress}>
                      📍 {venue.address}
                    </Text>
                    {venue.averageRatingGlobal > 0 && (
                      <View style={styles.venueRating}>
                        <StarRating rating={venue.averageRatingGlobal} size={16} showStars={false} />
                        <Text style={styles.ratingText}>
                          {venue.averageRatingGlobal.toFixed(1)}
                        </Text>
                      </View>
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
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#FF1744',
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
  venueCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  venueCardSelected: {
    borderColor: '#FF1744',
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  venueCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  venueIconText: {
    fontSize: 28,
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  venueAddress: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 8,
  },
  venueRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  selectedBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '700',
  },
});

