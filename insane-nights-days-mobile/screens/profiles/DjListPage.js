import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  RefreshControl, // ✅ AJOUT: Import de RefreshControl pour le pull-to-refresh
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
// Audio migration: expo-av -> expo-audio (no direct replacement for setIsEnabledAsync)
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../api/config';
import StarRating from '../../components/StarRating';

export default function DjListPage() {
  const { language } = useLanguage();
  const { navigate, goBack } = useNavigation();
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ AJOUT: State pour gérer l'état de rafraîchissement (pull-to-refresh)
  const [searchQuery, setSearchQuery] = useState('');
  const [styleQuery, setStyleQuery] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    fetchDjs();
  }, []);

  /**
   * Fonction pour récupérer la liste des DJs depuis l'API
   * @param {boolean} isRefresh - Si true, utilise le state 'refreshing' au lieu de 'loading'
   *                              Cela permet d'afficher un indicateur différent lors du pull-to-refresh
   */
  const fetchDjs = async (isRefresh = false) => {
    // ✅ MODIFICATION: Utiliser 'refreshing' si c'est un rafraîchissement, sinon 'loading'
    // Cela permet d'avoir deux indicateurs différents : un pour le chargement initial, un pour le refresh
    if (isRefresh) {
      setRefreshing(true); // Indicateur de pull-to-refresh (en haut de la liste)
    } else {
      setLoading(true); // Indicateur de chargement initial (centré)
    }
    
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
      // ✅ MODIFICATION: Réinitialiser le bon state selon le type de chargement
      setLoading(false);
      setRefreshing(false);
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

  // Fonction pour arrêter l'audio et revenir en arrière
  const handleBack = async () => {
    try {
      // Couper tous les sons en cours
      // Note: expo-audio ne nécessite plus setIsEnabledAsync
    } catch (e) {
      console.error("Erreur lors de l'arrêt de l'audio au retour:", e);
    }
    goBack();
  };

  // Filtrer les DJs selon la recherche et la note minimale
  const filteredDjs = useMemo(() => {
    return djs.filter((dj) => {
      // Filtre par nom
      const matchesSearch =
        searchQuery === '' ||
        dj.artistName?.toLowerCase().includes(searchQuery.toLowerCase());

      // Filtre par style (genre)
      const djStyle = (dj.genre || dj.style || '').toString().toLowerCase();
      const matchesStyle =
        styleQuery === '' || djStyle.includes(styleQuery.toLowerCase());

      // Filtre par note minimale
      const matchesRating =
        minRating === 0 || (dj.averageRatingGlobal || 0) >= minRating;

      return matchesSearch && matchesStyle && matchesRating;
    });
  }, [djs, searchQuery, styleQuery, minRating]);

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
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Liste des DJs' : 'DJ List'}
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

        {/* Filtre style */}
        <View style={styles.searchContainer}>
          <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.5)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={language === 'fr' ? 'Rechercher par style (techno, afro, house...)' : 'Search by style (techno, afro, house...)'}
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={styleQuery}
            onChangeText={setStyleQuery}
          />
          {styleQuery.length > 0 && (
            <TouchableOpacity onPress={() => setStyleQuery('')} style={styles.clearButton}>
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

      {/* ✅ AJOUT: RefreshControl permet le pull-to-refresh (tirer vers le bas pour rafraîchir) */}
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing} // État de rafraîchissement
            onRefresh={() => fetchDjs(true)} // Fonction appelée quand l'utilisateur tire vers le bas
            tintColor="#FF1744" // Couleur de l'indicateur (iOS)
            colors={['#FF1744']} // Couleur de l'indicateur (Android)
          />
        }
      >
        {filteredDjs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {language === 'fr'
                ? djs.length === 0
                  ? 'Aucun DJ disponible'
                  : 'Aucun DJ ne correspond à vos critères'
                : djs.length === 0
                ? 'No DJs available'
                : 'No DJs match your criteria'}
            </Text>
          </View>
        ) : (
          filteredDjs.map((dj) => (
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
                  <View style={styles.styleRow}>
                    <View style={styles.stylePill}>
                      <Text style={styles.stylePillText}>
                        🎧 {(dj.genre || dj.style) ? (dj.genre || dj.style) : (language === 'fr' ? 'Style inconnu' : 'Unknown style')}
                      </Text>
                    </View>
                    {dj.availableStatus === false ? (
                      <View style={styles.unavailablePill}>
                        <Text style={styles.unavailablePillText}>
                          {language === 'fr' ? 'Indispo' : 'Unavailable'}
                        </Text>
                      </View>
                    ) : null}
                  </View>
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
  djCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
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
    backgroundColor: '#FF1744',
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
  styleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    marginTop: 2,
  },
  stylePill: {
    backgroundColor: 'rgba(255,23,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  stylePillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  unavailablePill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  unavailablePillText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '800',
  },
  djRating: {
    alignItems: 'flex-end',
  },
  ratingCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 4,
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
    marginBottom: 16,
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

