import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/config';

const mockEvents = [
  {
    id: '1',
    title: 'Insane Night - Soirée Electro',
    date: '15 Janvier 2024',
    time: '22:00',
    location: 'Club Insane, Paris',
    price: 25,
    capacity: 200,
    sold: 45,
    genre: 'Electro',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    djs: ['DJ Neon', 'Mixmaster Nova'],
    description: 'Une soirée électro explosive avec les meilleurs DJs de la scène underground',
  },
  {
    id: '2',
    title: 'Bass Revolution - Drum & Bass',
    date: '20 Janvier 2024',
    time: '21:00',
    location: 'Warehouse Underground, Lyon',
    price: 30,
    capacity: 150,
    sold: 78,
    genre: 'Drum & Bass',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
    djs: ['Bass Storm', 'DJ Cyber'],
    description: 'Une révolution sonore avec les meilleurs artistes drum & bass',
  },
  {
    id: '3',
    title: 'Techno Underground Session',
    date: '25 Janvier 2024',
    time: '23:00',
    location: 'Le Bunker, Marseille',
    price: 20,
    capacity: 300,
    sold: 120,
    genre: 'Techno',
    image: 'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=400&h=300&fit=crop',
    djs: ['Techno Master', 'DJ Neon'],
    description: 'Session techno underground dans un lieu unique',
  },
];

export default function EventDetailPage() {
  const { language } = useLanguage();
  const { routeParams, navigate } = useNavigation();
  const { user } = useAuth();
  const [userProfiles, setUserProfiles] = useState(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  
  const eventId = useMemo(
    () => routeParams?.eventId ?? mockEvents[0].id,
    [routeParams?.eventId],
  );

  const defaultEvent = useMemo(
    () => mockEvents.find((item) => item.id === eventId) ?? mockEvents[0],
    [eventId],
  );

  const [event, setEvent] = useState(defaultEvent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [buyingTicket, setBuyingTicket] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  // Utiliser le statut de l'événement plutôt que de calculer depuis la date
  const isEventPast = () => {
    return event.status === 'FINISHED';
  };

  const isEventUpcoming = () => {
    return event.status === 'UPCOMING';
  };

  const getStatusLabel = () => {
    switch (event.status) {
      case 'UPCOMING':
        return language === 'fr' ? 'À venir' : 'Upcoming';
      case 'ONGOING':
        return language === 'fr' ? 'En cours' : 'Ongoing';
      case 'FINISHED':
        return language === 'fr' ? 'Terminé' : 'Finished';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (event.status) {
      case 'UPCOMING':
        return '#10b981'; // Vert
      case 'ONGOING':
        return '#f59e0b'; // Orange
      case 'FINISHED':
        return '#6b7280'; // Gris
      default:
        return '#6b7280';
    }
  };

  const handleBuyTicket = async () => {
    if (!user?.isAuthenticated) {
      Alert.alert(
        language === 'fr' ? 'Connexion requise' : 'Login required',
        language === 'fr' ? 'Vous devez être connecté pour acheter un ticket.' : 'You must be logged in to buy a ticket.',
        [{ text: 'OK' }],
      );
      return;
    }

    if (!user?.token) {
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Token d\'authentification manquant.' : 'Authentication token missing.',
      );
      return;
    }

    setBuyingTicket(true);
    try {
      const response = await api.buyTicket(user.token, eventId, 1);
      if (response && response.success) {
        Alert.alert(
          language === 'fr' ? 'Ticket acheté' : 'Ticket purchased',
          response.message || (language === 'fr' ? 'Ticket acheté avec succès !' : 'Ticket purchased successfully!'),
          [
            {
              text: language === 'fr' ? 'Voir mes tickets' : 'View my tickets',
              onPress: () => navigate('tickets'),
            },
            { text: 'OK' },
          ],
        );
        // Rafraîchir les données de l'événement
        fetchEvent();
      } else {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          response?.message || (language === 'fr' ? 'Erreur lors de l\'achat.' : 'Error purchasing ticket.'),
        );
      }
    } catch (error) {
      console.error('Erreur achat ticket:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Erreur lors de l\'achat.' : 'Error purchasing ticket.'),
      );
    } finally {
      setBuyingTicket(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!user?.token) {
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Vous devez être connecté.' : 'You must be logged in.',
      );
      return;
    }

    // Basculer entre UPCOMING et FINISHED
    const newStatus = event.status === 'UPCOMING' ? 'FINISHED' : 'UPCOMING';

    setChangingStatus(true);
    try {
      const response = await api.updateEventStatus(user.token, eventId, newStatus);
      if (response && response.success) {
        Alert.alert(
          language === 'fr' ? 'Statut modifié' : 'Status updated',
          language === 'fr' 
            ? `Statut changé: ${newStatus === 'UPCOMING' ? 'À venir' : 'Terminé'}`
            : `Status changed: ${newStatus === 'UPCOMING' ? 'Upcoming' : 'Finished'}`,
        );
        fetchEvent();
      } else {
        Alert.alert(
          language === 'fr' ? 'Erreur' : 'Error',
          response?.message || (language === 'fr' ? 'Erreur lors de la modification.' : 'Error updating status.'),
        );
      }
    } catch (error) {
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Erreur lors de la modification.' : 'Error updating status.'),
      );
    } finally {
      setChangingStatus(false);
    }
  };

  const fetchEvent = async () => {
    setLoading(true);
    setError(null);
    setEvent(defaultEvent);
    try {
      const data = await api.getEventById(eventId);
      if (data?.success && data.event) {
        setEvent(data.event);
      } else {
        setEvent(defaultEvent);
      }
    } catch (err) {
      setEvent(defaultEvent);
      setError(language === 'fr' ? "Impossible de charger l'événement en ligne." : "Unable to load event online.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (user?.isAuthenticated && user?.token) {
      loadUserProfiles();
    }
  }, [user?.isAuthenticated, user?.token]);

  const loadUserProfiles = async () => {
    if (!user?.token) return;
    setLoadingProfiles(true);
    try {
      const response = await api.getUserProfiles(user.token);
      if (response && response.success) {
        setUserProfiles(response);
      }
    } catch (error) {
      console.error('Erreur récupération profils:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const hasActiveCommunityProfile = () => {
    return userProfiles?.activeProfileType === 'COMMUNITY' && 
           userProfiles?.profiles?.community && 
           userProfiles.profiles.community.length > 0;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#FF1744" />
        <Text style={styles.loadingText}>Chargement de l'événement...</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigate('events')}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButtonTop} onPress={() => navigate('events')}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: event.image }} style={styles.image} />
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{event.price}€</Text>
          </View>
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{event.genre}</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>{event.title}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Text style={styles.description}>{event.description}</Text>

          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {event.date} à {event.time}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>{event.location}</Text>
            </View>
            {event.djs && event.djs.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>🎤</Text>
                <Text style={styles.infoText}>
                  {Array.isArray(event.djs) ? event.djs.join(', ') : event.djs}
                </Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🎟️</Text>
              <Text style={styles.infoText}>
                {event.capacity - event.sold} places restantes / {event.capacity}
              </Text>
            </View>
          </View>

          {/* Badge de statut */}
          {event.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20', borderColor: getStatusColor() }]}>
              <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
                {getStatusLabel()}
              </Text>
            </View>
          )}

          {isEventUpcoming() ? (
            user?.isAuthenticated && !hasActiveCommunityProfile() ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>
                  {language === 'fr' 
                    ? '⚠️ Seuls les profils Community peuvent acheter des tickets. Basculez sur votre profil Community depuis votre profil.' 
                    : '⚠️ Only Community profiles can buy tickets. Switch to your Community profile from your profile.'}
                </Text>
                <TouchableOpacity
                  style={styles.profileButton}
                  onPress={() => navigate('profile')}
                >
                  <Text style={styles.profileButtonText}>
                    {language === 'fr' ? 'Aller au profil' : 'Go to profile'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.buyButton, buyingTicket && styles.buyButtonDisabled]}
                onPress={handleBuyTicket}
                disabled={buyingTicket || (user?.isAuthenticated && !hasActiveCommunityProfile())}
              >
                {buyingTicket ? (
                  <ActivityIndicator color="#0b0b0e" />
                ) : (
                  <Text style={styles.buyButtonText}>
                    {language === 'fr' ? 'Acheter un ticket' : 'Buy ticket'} ({event.price}€)
                  </Text>
                )}
              </TouchableOpacity>
            )
          ) : isEventPast() ? (
            <View style={styles.pastEventSection}>
              <Text style={styles.pastEventText}>
                {language === 'fr' ? 'Cet événement est terminé' : 'This event has ended'}
              </Text>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => {
                  navigate('rateEvent', {
                    eventId: event.id,
                    eventTitle: event.title,
                    eventDate: event.date,
                    eventStatus: event.status, // Passer le statut
                    venueId: event.venueId,
                    venueName: event.venueName,
                    djIds: event.djIds || [],
                  });
                }}
              >
                <Text style={styles.rateButtonText}>
                  {language === 'fr' ? 'Noter cet événement' : 'Rate this event'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pastEventSection}>
              <Text style={styles.pastEventText}>
                {language === 'fr' ? 'Cet événement est en cours' : 'This event is ongoing'}
              </Text>
            </View>
          )}

          {/* Bouton TEMPORAIRE pour changer le statut */}
          {user?.isAuthenticated && (
            <TouchableOpacity
              style={[styles.tempDateButton, changingStatus && styles.tempDateButtonDisabled]}
              onPress={handleChangeStatus}
              disabled={changingStatus}
            >
              {changingStatus ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.tempDateButtonText}>
                  {language === 'fr' 
                    ? `⚙️ Changer statut: ${event.status === 'UPCOMING' ? 'UPCOMING → FINISHED' : 'FINISHED → UPCOMING'} (TEMPORAIRE)`
                    : `⚙️ Change status: ${event.status === 'UPCOMING' ? 'UPCOMING → FINISHED' : 'FINISHED → UPCOMING'} (TEMPORARY)`}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0b0e',
  },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#0b0b0e',
  },
  backButtonTop: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0b0b0e',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.4)',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: 'relative',
    height: 280,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  priceBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF1744',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
  },
  priceText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '900',
  },
  genreBadge: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(11,11,14,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  genreText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    lineHeight: 24,
  },
  errorText: {
    color: '#f97316',
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    gap: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 26,
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  buyButton: {
    backgroundColor: '#FF1744',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  pastEventSection: {
    gap: 16,
  },
  pastEventText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  rateButton: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.5)',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  rateButtonText: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: '700',
  },
  tempDateButton: {
    marginTop: 16,
    backgroundColor: 'rgba(255,23,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tempDateButtonText: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
  },
  tempDateButtonDisabled: {
    opacity: 0.5,
  },
  dateEditor: {
    marginTop: 16,
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 12,
    padding: 16,
  },
  dateEditorLabel: {
    color: '#FF1744',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateEditorInput: {
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12,
  },
  dateEditorButton: {
    backgroundColor: '#FF1744',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dateEditorButtonText: {
    color: '#0b0b0e',
    fontSize: 14,
    fontWeight: '700',
  },
  warningCard: {
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.4)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  warningText: {
    color: '#facc15',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  profileButton: {
    backgroundColor: '#FF1744',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  profileButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '700',
  },
});
