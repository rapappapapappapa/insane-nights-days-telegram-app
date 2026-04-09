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
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import StarRating from '../../components/StarRating';
import { Ionicons } from '@expo/vector-icons';

export default function SelectDjPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const {
    selectedDjIds = [],
    eventId = null,
    slotIndex = null,
    isSlotMode = false,
    returnTo,
  } = routeParams || {}; // returnTo : écran après sélection (ex. bookerEventDashboard)
  
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState(0);

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
    console.log('[SelectDj] Navigation vers djProfile:', { 
      djId: dj.id, 
      slotIndex, 
      isSlotMode,
      selectedDjIds 
    });
    navigate('djProfile', {
      djId: dj.id,
      djUserId: dj.userId,
      djName: dj.artistName,
      selectionMode: true, // Mode sélection
      selectedDjIds: selectedDjIds, // Passer les IDs déjà sélectionnés
      returnTo: returnTo || 'bookerDashboard', // Même logique que lieu (VenueProfilePage)
      eventId: eventId || undefined, // Propager l'eventId si présent
      slotIndex: slotIndex, // Passer l'index du slot si en mode slot
      isSlotMode: isSlotMode, // Indiquer qu'on est en mode slot
    });
  };

  // Filtrage (recherche + note minimale) comme dans DjListPage
  const filteredDjs = useMemo(() => {
    return djs.filter((dj) => {
      const matchesSearch =
        searchQuery === '' ||
        dj.artistName?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRating =
        minRating === 0 || (dj.averageRatingGlobal || 0) >= minRating;

      return matchesSearch && matchesRating;
    });
  }, [djs, searchQuery, minRating]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
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

      {/* Barre de recherche et filtres */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'fr' ? 'Rechercher un DJ...' : 'Search a DJ...'}
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

        <View style={styles.ratingFilterContainer}>
          <Text style={styles.filterLabel}>
            {language === 'fr' ? 'Note minimale :' : 'Min rating:'}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {filteredDjs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {language === 'fr' ? 'Aucun DJ disponible' : 'No DJs available'}
            </Text>
          </View>
        ) : (
          filteredDjs.map((dj) => {
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
                    <Text style={styles.djRate}>
                      🤝 {language === 'fr' ? 'Prix à convenir' : 'Price to agree'}
                    </Text>
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
    backgroundColor: Colors.background,
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
    color: Colors.primary,
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    paddingTop: 8,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  clearButton: {
    paddingLeft: 8,
  },
  ratingFilterContainer: {
    backgroundColor: '#1a1a1f',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    padding: 12,
  },
  filterLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  ratingButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#111116',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
  },
  ratingButtonActive: {
    backgroundColor: 'rgba(255,23,68,0.15)',
    borderColor: Colors.primary,
  },
  ratingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ratingButtonTextActive: {
    color: Colors.primary,
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
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  djCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(255,23,68,0.1)',
  },
  djCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  djAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  djAvatarText: {
    color: Colors.background,
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
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedBadgeText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '700',
  },
});

