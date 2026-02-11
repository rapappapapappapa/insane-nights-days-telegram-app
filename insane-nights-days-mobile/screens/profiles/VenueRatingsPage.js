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
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { api } from '../../api/config';
import StarRating from '../../components/StarRating';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function VenueRatingsPage() {
  const { language } = useLanguage();
  const { routeParams, goBack } = useNavigation();
  const { toast, showError, hideToast } = useToast();
  const { venueId, venueName } = routeParams || {};
  
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (venueId) {
      fetchRatings();
    }
  }, [venueId]);

  const fetchRatings = async () => {
    setLoading(true);
    try {
      const response = await api.getVenueRatings(venueId);
      if (response && response.success) {
        setRatings(response.ratings);
      } else {
        showError(language === 'fr' ? 'Impossible de charger les notes.' : 'Unable to load ratings.');
      }
    } catch (error) {
      console.error('Erreur récupération notes:', error);
      showError(language === 'fr' ? 'Erreur lors du chargement des notes.' : 'Error loading ratings.');
    } finally {
      setLoading(false);
    }
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

  if (!ratings) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === 'fr' ? 'Aucune note disponible' : 'No ratings available'}
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
          {language === 'fr' ? 'Notes' : 'Ratings'} {venueName ? `- ${venueName}` : ''}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Note Globale */}
        <View style={styles.globalRatingCard}>
          <Text style={styles.globalRatingTitle}>
            {language === 'fr' ? 'Note Globale' : 'Global Rating'}
          </Text>
          <StarRating rating={ratings.averageRatingGlobal} size={40} showStars={false} />
          <Text style={styles.globalRatingSubtitle}>
            {ratings.totalRatingsCommunity + ratings.totalRatingsBooker + ratings.totalRatingsDj}{' '}
            {language === 'fr' ? 'avis' : 'reviews'}
          </Text>
        </View>

        {/* Notes par type */}
        <View style={styles.ratingsGrid}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingCardTitle}>
              {language === 'fr' ? 'Communauté' : 'Community'}
            </Text>
            <StarRating rating={ratings.averageRatingCommunity} size={28} showStars={false} />
            <Text style={styles.ratingCardCount}>
              {ratings.totalRatingsCommunity} {language === 'fr' ? 'avis' : 'reviews'}
            </Text>
          </View>

          <View style={styles.ratingCard}>
            <Text style={styles.ratingCardTitle}>
              {language === 'fr' ? 'Booker' : 'Booker'}
            </Text>
            <StarRating rating={ratings.averageRatingBooker} size={28} />
            <Text style={styles.ratingCardCount}>
              {ratings.totalRatingsBooker} {language === 'fr' ? 'avis' : 'reviews'}
            </Text>
          </View>

          <View style={styles.ratingCard}>
            <Text style={styles.ratingCardTitle}>
              {language === 'fr' ? 'DJ' : 'DJ'}
            </Text>
            <StarRating rating={ratings.averageRatingDj} size={28} />
            <Text style={styles.ratingCardCount}>
              {ratings.totalRatingsDj} {language === 'fr' ? 'avis' : 'reviews'}
            </Text>
          </View>
        </View>

        {/* Liste des avis */}
        {ratings.allRatings && ratings.allRatings.length > 0 && (
          <View style={styles.reviewsSection}>
            <Text style={styles.reviewsSectionTitle}>
              {language === 'fr' ? 'Tous les avis' : 'All Reviews'}
            </Text>
            {ratings.allRatings.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewType}>
                    {review.raterType === 'COMMUNITY'
                      ? language === 'fr' ? '👥 Communauté' : '👥 Community'
                      : review.raterType === 'BOOKER'
                      ? language === 'fr' ? '📅 Booker' : '📅 Booker'
                      : language === 'fr' ? '🎧 DJ' : '🎧 DJ'}
                  </Text>
                  <StarRating rating={review.rating} size={18} showStars={false} />
                </View>
                {review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewEvent}>
                  {review.eventTitle} - {new Date(review.eventDate).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  globalRatingCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  globalRatingTitle: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  globalRatingSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 12,
  },
  ratingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  ratingCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  ratingCardTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  ratingCardCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  reviewsSection: {
    marginTop: 8,
  },
  reviewsSectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewType: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
  },
  reviewComment: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewEvent: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});

