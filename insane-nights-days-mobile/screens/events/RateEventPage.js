import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Colors from '../../constants/colors';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/config';
import RatingModal from '../../components/RatingModal';
import StarRating from '../../components/StarRating';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

export default function RateEventPage() {
  const { language } = useLanguage();
  const { routeParams, goBack } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const { eventId, eventTitle, eventDate, venueId, venueName, djIds = [] } = routeParams || {};

  const [loading, setLoading] = useState(false);
  const [djNames, setDjNames] = useState({}); // Map des IDs vers les noms
  const [ratingDjModal, setRatingDjModal] = useState({ visible: false, djUserId: null, djName: null });
  const [ratingVenueModal, setRatingVenueModal] = useState({ visible: false });
  const [ratedDjIds, setRatedDjIds] = useState([]); // IDs des DJs déjà notés
  const [ratedVenueId, setRatedVenueId] = useState(null); // ID du lieu déjà noté
  const [checkingRatings, setCheckingRatings] = useState(true);

  // Debug: afficher les djIds reçus
  useEffect(() => {
  }, [eventId, djIds]);

  // Récupérer les noms des DJs depuis leurs IDs
  useEffect(() => {
    const fetchDjNames = async () => {
      if (!djIds || djIds.length === 0) return;
      
      try {
        const djs = await api.getDjs();
        if (djs && djs.success && Array.isArray(djs.djs)) {
          const namesMap = {};
          djs.djs.forEach((dj) => {
            if (djIds.includes(dj.userId)) {
              namesMap[dj.userId] = dj.artistName || dj.userId;
            }
          });
          setDjNames(namesMap);
        }
      } catch (error) {
        console.error('Erreur récupération noms DJs:', error);
      }
    };

    fetchDjNames();
  }, [djIds]);

  // Vérifier les notes existantes
  useEffect(() => {
    const checkExistingRatings = async () => {
      if (!user?.token || !eventId) {
        setCheckingRatings(false);
        return;
      }

      try {
        const response = await api.checkRatings(user.token, eventId);
        if (response && response.success) {
          setRatedDjIds(response.ratedDjIds || []);
          setRatedVenueId(response.ratedVenueId || null);
        }
      } catch (error) {
        console.error('Erreur vérification notes:', error);
      } finally {
        setCheckingRatings(false);
      }
    };

    checkExistingRatings();
  }, [user?.token, eventId]);

  // Utiliser le statut de l'événement plutôt que de calculer depuis la date
  const isEventPast = () => {
    // Si on a le statut dans les routeParams, l'utiliser
    if (routeParams?.eventStatus) {
      return routeParams.eventStatus === 'FINISHED';
    }
    // Sinon, fallback sur la date (pour compatibilité)
    if (!eventDate) return false;
    const eventDateTime = new Date(eventDate);
    return eventDateTime < new Date();
  };

  const handleRateDj = async ({ rating, comment }) => {
    if (!user?.token || !ratingDjModal.djUserId) {
      console.error('[RATE DJ] Données manquantes:', { 
        hasToken: !!user?.token, 
        djUserId: ratingDjModal.djUserId 
      });
      return;
    }


    setLoading(true);
    try {
      const response = await api.rateDj({
        token: user.token,
        djUserId: ratingDjModal.djUserId, // User.id du DJ
        eventId: eventId,
        rating: rating,
        comment: comment,
      });

      if (response && response.success) {
        // Mettre à jour la liste des DJs notés
        if (!ratedDjIds.includes(ratingDjModal.djUserId)) {
          setRatedDjIds([...ratedDjIds, ratingDjModal.djUserId]);
        }
        showSuccess(language === 'fr' ? 'Merci pour votre avis !' : 'Thank you for your review!');
        setTimeout(() => setRatingDjModal({ visible: false, djUserId: null, djName: null }), 1500);
      } else {
        showError(response?.message || (language === 'fr' ? 'Erreur lors de l\'enregistrement.' : 'Error saving rating.'));
      }
    } catch (error) {
      console.error('Erreur notation DJ:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de l\'enregistrement.' : 'Error saving rating.'));
    } finally {
      setLoading(false);
    }
  };

  const handleRateVenue = async ({ rating, comment }) => {
    if (!user?.token || !venueId) return;

    setLoading(true);
    try {
      const response = await api.rateVenue({
        token: user.token,
        venueId: venueId,
        eventId: eventId,
        rating: rating,
        comment: comment,
      });

      if (response && response.success) {
        // Mettre à jour le lieu noté
        setRatedVenueId(venueId);
        showSuccess(language === 'fr' ? 'Merci pour votre avis !' : 'Thank you for your review!');
        setTimeout(() => setRatingVenueModal({ visible: false }), 1500);
      } else {
        showError(response?.message || (language === 'fr' ? 'Erreur lors de l\'enregistrement.' : 'Error saving rating.'));
      }
    } catch (error) {
      console.error('Erreur notation Lieu:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de l\'enregistrement.' : 'Error saving rating.'));
    } finally {
      setLoading(false);
    }
  };

  // TEMPORAIRE: Permettre de noter même si l'événement n'est pas passé (pour les tests)
  // if (!isEventPast()) {
  //   return (
  //     <View style={styles.container}>
  //       <StatusBar style="light" />
  //       <View style={styles.header}>
  //         <TouchableOpacity style={styles.backButton} onPress={goBack}>
  //           <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
  //         </TouchableOpacity>
  //       </View>
  //       <View style={styles.errorContainer}>
  //         <Text style={styles.errorText}>
  //           {language === 'fr'
  //             ? 'Vous ne pouvez noter qu\'après la date de l\'événement.'
  //             : 'You can only rate after the event date.'}
  //         </Text>
  //       </View>
  //     </View>
  //   );
  // }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'fr' ? 'Noter l\'événement' : 'Rate Event'}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.eventDate}>
            {eventDate ? new Date(eventDate).toLocaleDateString() : ''}
          </Text>
        </View>

        {/* Section Noter les DJs */}
        {djIds && djIds.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'Noter les DJs' : 'Rate DJs'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {language === 'fr'
                ? 'Donnez votre avis sur les performances des DJs'
                : 'Share your opinion on the DJs\' performances'}
            </Text>
            {djIds.map((djId) => {
              const djName = djNames[djId] || `DJ ${djId.slice(0, 8)}`;
              const isRated = ratedDjIds.includes(djId);
              return (
                <View
                  key={djId}
                  style={[styles.rateButton, isRated && styles.rateButtonRated]}
                >
                  <Text style={[styles.rateButtonText, isRated && styles.rateButtonTextRated]}>
                    {isRated ? '✓ ' : ''}{isRated ? (language === 'fr' ? 'Noté' : 'Rated') : (language === 'fr' ? 'Noter' : 'Rate')} {djName}
                  </Text>
                  {!isRated && (
                    <TouchableOpacity
                      onPress={() => {
                        setRatingDjModal({ visible: true, djUserId: djId, djName });
                      }}
                    >
                      <Text style={styles.rateButtonArrow}>→</Text>
                    </TouchableOpacity>
                  )}
                  {isRated && <Text style={styles.rateButtonCheck}>✓</Text>}
                </View>
              );
            })}
          </View>
        )}

        {/* Section Noter le lieu */}
        {venueId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'Noter le lieu' : 'Rate Venue'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {language === 'fr'
                ? 'Donnez votre avis sur le lieu de l\'événement'
                : 'Share your opinion on the event venue'}
            </Text>
            <View
              style={[styles.rateButton, ratedVenueId && styles.rateButtonRated]}
            >
              <Text style={[styles.rateButtonText, ratedVenueId && styles.rateButtonTextRated]}>
                {ratedVenueId ? '✓ ' : ''}{ratedVenueId ? (language === 'fr' ? 'Noté' : 'Rated') : (language === 'fr' ? 'Noter' : 'Rate')} {venueName || language === 'fr' ? 'le lieu' : 'venue'}
              </Text>
              {!ratedVenueId && (
                <TouchableOpacity
                  onPress={() => setRatingVenueModal({ visible: true })}
                >
                  <Text style={styles.rateButtonArrow}>→</Text>
                </TouchableOpacity>
              )}
              {ratedVenueId && <Text style={styles.rateButtonCheck}>✓</Text>}
            </View>
          </View>
        )}

        {(!djIds || djIds.length === 0) && !venueId && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {language === 'fr'
                ? 'Aucun élément à noter pour cet événement.'
                : 'Nothing to rate for this event.'}
            </Text>
          </View>
        )        }
      </ScrollView>

      {/* Toast pour les notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />

      {/* Modal pour noter un DJ */}
      <RatingModal
        visible={ratingDjModal.visible}
        onClose={() => setRatingDjModal({ visible: false, djUserId: null, djName: null })}
        onSubmit={handleRateDj}
        title={language === 'fr' ? `Noter ${ratingDjModal.djName || 'le DJ'}` : `Rate ${ratingDjModal.djName || 'DJ'}`}
        loading={loading}
      />

      {/* Modal pour noter un lieu */}
      <RatingModal
        visible={ratingVenueModal.visible}
        onClose={() => setRatingVenueModal({ visible: false })}
        onSubmit={handleRateVenue}
        title={language === 'fr' ? `Noter ${venueName || 'le lieu'}` : `Rate ${venueName || 'venue'}`}
        loading={loading}
      />
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  eventTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  eventDate: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 16,
  },
  rateButton: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateButtonRated: {
    backgroundColor: '#1a2a1a',
    borderColor: 'rgba(76,175,80,0.5)',
    opacity: 0.8,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  rateButtonTextRated: {
    color: 'rgba(255,255,255,0.7)',
  },
  rateButtonArrow: {
    color: Colors.primary,
    fontSize: 20,
    fontWeight: '700',
  },
  rateButtonCheck: {
    color: '#4caf50',
    fontSize: 24,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
  },
});

