import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';
import StarRating from '../components/StarRating';

export default function VenueListPage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [minRating, setMinRating] = useState(0);

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
    navigate('venueProfile', {
      venueId: venue.id,
      venueName: venue.venueName,
      selectionMode: false,
    });
  };

  // Filtrer les lieux selon la recherche, la localisation et la note minimale
  const filteredVenues = useMemo(() => {
    return venues.filter((venue) => {
      // Filtre par nom
      const matchesSearch =
        searchQuery === '' ||
        venue.venueName?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtre par localisation (adresse)
      const matchesLocation =
        locationQuery === '' ||
        venue.address?.toLowerCase().includes(locationQuery.toLowerCase());

      // Filtre par note minimale
      const matchesRating =
        minRating === 0 || (venue.averageRatingGlobal || 0) >= minRating;

      return matchesSearch && matchesLocation && matchesRating;
    });
  }, [venues, searchQuery, locationQuery, minRating]);

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
          <Text style={styles.backButtonText}>
            ← {language === 'fr' ? 'Retour' : 'Back'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Liste des lieux' : 'Venue List'}
        </Text>
      </View>

      {/* Barre de recherche et filtres */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'fr' ? 'Rechercher un lieu...' : 'Search a venue...'}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="location" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'fr' ? 'Rechercher par localisation...' : 'Search by location...'}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={locationQuery}
            onChangeText={setLocationQuery}
          />
          {locationQuery.length > 0 && (
            <TouchableOpacity onPress={() => setLocationQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtre par note */}
        <View style={styles.ratingFilterContainer}>
          <Text style={styles.filterLabel}>
            {language === 'fr' ? 'Note minimale:' : 'Min rating:'}
          </Text>
          <View style={styles.ratingButtons}>
            {[0, 3, 4, 4.5].map((rating) => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  minRating === rating && styles.ratingButtonActive,
                ]}
                onPress={() => setMinRating(rating)}
              >
                <Text
                  style={[
                    styles.ratingButtonText,
                    minRating === rating && styles.ratingButtonTextActive,
                  ]}
                >
                  {rating === 0
                    ? language === 'fr'
                      ? 'Toutes'
                      : 'All'
                    : `${rating}+`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {filteredVenues.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {language === 'fr'
                ? venues.length === 0
                  ? 'Aucun lieu disponible'
                  : 'Aucun lieu ne correspond à vos critères'
                : venues.length === 0
                ? 'No venues available'
                : 'No venues match your criteria'}
            </Text>
          </View>
        ) : (
          filteredVenues.map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={styles.venueCard}
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
                      <StarRating
                        rating={venue.averageRatingGlobal}
                        size={16}
                        showStars={false}
                      />
                      <Text style={styles.ratingText}>
                        {venue.averageRatingGlobal.toFixed(1)}
                      </Text>
                    </View>
                  )}
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0b0b0e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  ratingFilterContainer: {
    marginTop: 8,
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  ratingButtonActive: {
    backgroundColor: '#FF1744',
    borderColor: '#FF1744',
  },
  ratingButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingButtonTextActive: {
    color: '#0b0b0e',
  },
});


