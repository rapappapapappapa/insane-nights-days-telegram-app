import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useEventForm } from '../contexts/EventFormContext';
import { api } from '../api/config';

export default function BookerDashboardPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { formData, setFormData, eventDateTime, setEventDateTime, resetForm, addDj, removeDj, setVenue } = useEventForm();

  const [loading, setLoading] = useState(false);
  const [availableDjs, setAvailableDjs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [creating, setCreating] = useState(false);
  const [myEvents, setMyEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);

  // Date & heure avec sélecteurs stylés
  const [tempDate, setTempDate] = useState(eventDateTime);
  const [tempTime, setTempTime] = useState(eventDateTime);
  // Ouvrir le sélecteur de date (native sur Android, modal sur iOS)
  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDateTime || new Date(),
        mode: 'date',
        onChange: (_, selectedDate) => {
          if (selectedDate) {
            setEventDateTime((prev) => {
              const base = prev ? new Date(prev) : new Date();
              const merged = new Date(selectedDate);
              merged.setHours(base.getHours());
              merged.setMinutes(base.getMinutes());
              return merged;
            });
            handleChange('date', selectedDate.toISOString());
          }
        },
      });
      return;
    }
    setTempDate(eventDateTime || new Date());
    setShowDatePicker(true);
  };

  // Ouvrir le sélecteur d'heure (native sur Android, modal sur iOS)
  const openTimePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: eventDateTime || new Date(),
        mode: 'time',
        is24Hour: true,
        onChange: (_, selectedTime) => {
          if (selectedTime) {
            setEventDateTime((prev) => {
              const base = prev ? new Date(prev) : new Date();
              const merged = new Date(base);
              merged.setHours(selectedTime.getHours());
              merged.setMinutes(selectedTime.getMinutes());
              return merged;
            });
            const hours = selectedTime.getHours().toString().padStart(2, '0');
            const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
            handleChange('time', `${hours}:${minutes}`);
          }
        },
      });
      return;
    }
    setTempTime(eventDateTime || new Date());
    setShowTimePicker(true);
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Étape actuelle du formulaire (1: Date/Durée, 2: Lieu, 3: DJs, 4: Détails, 5: Récapitulatif/Paiement)
  const [currentStep, setCurrentStep] = useState(1);
  
  // Gérer les sélections depuis routeParams - avec comparaison pour éviter les doublons
  const lastProcessedParams = useRef({ selectedDjId: null, selectedVenueId: null, action: null });
  
  // Extraire les valeurs primitives pour éviter les re-renders
  const currentDjId = routeParams?.selectedDjId;
  const currentVenueId = routeParams?.selectedVenueId;
  const currentAction = routeParams?.action;
  
  React.useLayoutEffect(() => {
    // Vérifier si on a déjà traité ces paramètres
    if (
      currentDjId === lastProcessedParams.current.selectedDjId &&
      currentVenueId === lastProcessedParams.current.selectedVenueId &&
      currentAction === lastProcessedParams.current.action
    ) {
      return; // Déjà traité, ne rien faire
    }
    
    // Mettre à jour la référence
    lastProcessedParams.current = {
      selectedDjId: currentDjId,
      selectedVenueId: currentVenueId,
      action: currentAction,
    };
    
    // Sélection de DJ
    if (currentDjId && currentAction === 'add') {
      addDj(currentDjId);
      setCurrentStep(4);
    } else if (currentDjId && currentAction === 'remove') {
      removeDj(currentDjId);
    }
    
    // Sélection de lieu
    if (currentVenueId && currentAction === 'select') {
      setVenue(currentVenueId);
      setCurrentStep(3);
    } else if (currentVenueId && currentAction === 'remove') {
      setVenue('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDjId, currentVenueId, currentAction]); // Seulement les valeurs primitives

  useEffect(() => {
    if (user?.token) {
      fetchVenues();
      fetchMyEvents();
      // Ne pas charger les DJs ici, on les chargera quand la date sera sélectionnée
    }
  }, [user?.token]);

  // Rafraîchir la liste des DJs quand la date change
  useEffect(() => {
    if (user?.token && formData.date && currentStep >= 3) {
      // Charger les DJs disponibles seulement si on a une date et qu'on est à l'étape 3 ou plus
      fetchAvailableDjs();
    }
  }, [formData.date, currentStep, user?.token]);

  const fetchMyEvents = async () => {
    if (!user?.token || loadingEvents) return;
    setLoadingEvents(true);
    try {
      const response = await api.getBookerEvents(user.token);
      if (response && response.success) {
        setMyEvents(response.events || []);
      }
    } catch (error) {
      console.error('Erreur récupération mes événements:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchAvailableDjs = async () => {
    if (!user?.token || loadingDjs) return;
    setLoadingDjs(true);
    try {
      // Envoyer la date si elle est disponible
      const dateToSend = formData.date || (eventDateTime ? eventDateTime.toISOString() : null);
      const response = await api.getAvailableDjs(user.token, dateToSend);
      if (response && response.success) {
        setAvailableDjs(response.djs || []);
      }
    } catch (error) {
      console.error('Erreur récupération DJs disponibles:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Impossible de charger les DJs disponibles.' : 'Unable to load available DJs.'
      );
    } finally {
      setLoadingDjs(false);
    }
  };

  const fetchVenues = async () => {
    if (!user?.token || loadingVenues) return;
    setLoadingVenues(true);
    try {
      const response = await api.getVenues(user.token);
      if (response && response.success) {
        setVenues(response.venues || []);
      }
    } catch (error) {
      console.error('Erreur récupération lieux:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        language === 'fr' ? 'Impossible de charger les lieux.' : 'Unable to load venues.'
      );
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    Alert.alert(
      language === 'fr' ? 'Supprimer l\'événement' : 'Delete event',
      language === 'fr'
        ? 'Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.'
        : 'Are you sure you want to delete this event? This action is irreversible.',
      [
        {
          text: language === 'fr' ? 'Annuler' : 'Cancel',
          style: 'cancel',
        },
        {
          text: language === 'fr' ? 'Supprimer' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!user?.token) return;
            setDeletingEventId(eventId);
            try {
              const response = await api.deleteEvent(user.token, eventId);
              if (response && response.success) {
                Alert.alert(
                  language === 'fr' ? 'Événement supprimé' : 'Event deleted',
                  language === 'fr'
                    ? 'L\'événement a été supprimé avec succès.'
                    : 'The event has been deleted successfully.'
                );
                fetchMyEvents(); // Rafraîchir la liste
              } else {
                Alert.alert(
                  language === 'fr' ? 'Erreur' : 'Error',
                  response?.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting event.')
                );
              }
            } catch (error) {
              console.error('Erreur suppression événement:', error);
              Alert.alert(
                language === 'fr' ? 'Erreur' : 'Error',
                error.message || (language === 'fr' ? 'Erreur lors de la suppression.' : 'Error deleting event.')
              );
            } finally {
              setDeletingEventId(null);
            }
          },
        },
      ]
    );
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };


  const handleCreateEvent = async () => {
    if (creating) return;

    // Validation
    if (!formData.title || !formData.date || !formData.time || !formData.venueId || formData.djIds.length === 0) {
      Alert.alert(
        language === 'fr' ? 'Champs manquants' : 'Missing fields',
        language === 'fr' 
          ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).'
          : 'Please fill in all required fields (title, date, time, venue, DJ).'
      );
      return;
    }

    // Vérifier que la date n'est pas passée (côté app, pour UX)
    try {
      const eventDateObj = eventDateTime || (formData.date ? new Date(formData.date) : null);
      if (eventDateObj && !isNaN(eventDateObj.getTime())) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const eventDay = new Date(
          eventDateObj.getFullYear(),
          eventDateObj.getMonth(),
          eventDateObj.getDate()
        );

        if (eventDay < today) {
          Alert.alert(
            language === 'fr' ? 'Date invalide' : 'Invalid date',
            language === 'fr'
              ? 'Vous ne pouvez pas créer un événement à une date déjà passée.'
              : 'You cannot create an event on a past date.'
          );
          return;
        }
      }
    } catch (e) {
      // En cas d'erreur de parsing, on laisse aussi le backend valider
      console.warn('Erreur vérification date passée côté app:', e);
    }

    setCreating(true);
    try {
      // Formater la date correctement pour le backend (ISO string)
      let formattedDate = formData.date;
      if (eventDateTime && !formData.date) {
        // Si on a eventDateTime mais pas formData.date, utiliser eventDateTime
        formattedDate = eventDateTime.toISOString();
      } else if (formData.date && typeof formData.date === 'string') {
        // Si c'est déjà une string, vérifier le format
        try {
          const dateObj = new Date(formData.date);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString();
          }
        } catch (e) {
          // Si la conversion échoue, utiliser la date telle quelle
        }
      } else if (eventDateTime) {
        formattedDate = eventDateTime.toISOString();
      }

      const eventData = {
        title: formData.title.trim(),
        date: formattedDate,
        time: formData.time.trim(),
        venueId: formData.venueId,
        djIds: formData.djIds,
        price: formData.price ? parseFloat(formData.price) : 0,
        // La durée sert uniquement au calcul du prix pour l'instant
        durationHours: formData.durationHours ? parseFloat(formData.durationHours) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : 100,
        genre: formData.genre ? formData.genre.trim() : 'Mixed',
        description: formData.description ? formData.description.trim() : null,
      };

      const response = await api.createEvent(user.token, eventData);

      if (!response) {
        Alert.alert(
          language === 'fr' ? 'Erreur de connexion' : 'Connection error',
          language === 'fr'
            ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
            : 'Unable to reach server. Check your connection.'
        );
        return;
      }

      if (!response.success) {
        // Gérer les conflits spécifiques
        if (response.status === 409 || (response.message && (response.message.includes('déjà') || response.message.includes('existe déjà')))) {
          let conflictMessage = response.message || (language === 'fr' ? 'Conflit de réservation' : 'Booking conflict');
          
          // Ajouter des détails sur l'événement en conflit si disponibles
          if (response.conflictingEvent) {
            const conflictDate = new Date(response.conflictingEvent.date).toLocaleDateString(
              language === 'fr' ? 'fr-FR' : 'en-US',
              { day: '2-digit', month: '2-digit', year: 'numeric' }
            );
            conflictMessage += `\n\n${language === 'fr' ? 'Événement en conflit' : 'Conflicting event'}: ${response.conflictingEvent.title} (${conflictDate}${response.conflictingEvent.time ? ' à ' + response.conflictingEvent.time : ''})`;
          }
          
          Alert.alert(
            language === 'fr' ? 'Conflit de réservation' : 'Booking conflict',
            conflictMessage
          );
        } else {
          Alert.alert(
            language === 'fr' ? 'Erreur' : 'Error',
            response.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.')
          );
        }
        return;
      }

      // Succès
      Alert.alert(
        language === 'fr' ? 'Événement créé !' : 'Event created!',
        language === 'fr'
          ? 'L\'événement a été créé avec succès.'
          : 'The event has been created successfully.',
        [
          {
            text: language === 'fr' ? 'OK' : 'OK',
            onPress: () => {
              // Réinitialiser le formulaire et rafraîchir la liste
              resetForm();
              fetchMyEvents();
              setShowMyEvents(true);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Erreur création événement:', error);
      Alert.alert(
        language === 'fr' ? 'Erreur' : 'Error',
        error.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.')
      );
    } finally {
      setCreating(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === formData.venueId);
  const selectedDjs = availableDjs.filter((dj) => formData.djIds.includes(dj.userId));

  // Calcul automatique du prix - seulement quand nécessaire, sans useEffect
  const calculatePrice = () => {
    const duration = formData.durationHours
      ? parseFloat(formData.durationHours.replace(',', '.'))
      : 0;

    if (!selectedVenue || selectedDjs.length === 0 || !duration || duration <= 0) {
      return '';
    }

    // Base simple pour le lieu
    const venueBase =
      typeof selectedVenue.averageRatingGlobal === 'number'
        ? 50 + selectedVenue.averageRatingGlobal * 10
        : 50;

    // Somme des tarifs horaires / prestation des DJs
    const djsTotal = selectedDjs.reduce((sum, dj) => {
      const rate = dj.hourlyRate ?? dj.performanceRate ?? 0;
      return sum + rate;
    }, 0);

    const total = venueBase + djsTotal * duration;
    return String(Math.max(0, Math.round(total)));
  };

  const autoPrice = calculatePrice();
  
  // Mettre à jour le prix seulement si calculé et différent
  const lastAutoPrice = useRef('');
  React.useLayoutEffect(() => {
    if (autoPrice && autoPrice !== lastAutoPrice.current) {
      lastAutoPrice.current = autoPrice;
      setFormData(prev => {
        // Ne mettre à jour que si différent pour éviter les re-renders
        if (prev.price !== autoPrice) {
          return { ...prev, price: autoPrice };
        }
        return prev;
      });
    }
  }, [autoPrice]); // Seulement autoPrice

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Text style={styles.backButtonText}>← {language === 'fr' ? 'Retour' : 'Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{language === 'fr' ? 'Dashboard Booker' : 'Booker Dashboard'}</Text>
      </View>

      {/* Boutons de navigation */}
      <View style={styles.tabButtons}>
        <TouchableOpacity
          style={[styles.tabButton, !showMyEvents && styles.tabButtonActive]}
          onPress={() => setShowMyEvents(false)}
        >
          <Text style={[styles.tabButtonText, !showMyEvents && styles.tabButtonTextActive]}>
            {language === 'fr' ? 'Créer un événement' : 'Create Event'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, showMyEvents && styles.tabButtonActive]}
          onPress={() => {
            setShowMyEvents(true);
            fetchMyEvents();
          }}
        >
          <Text style={[styles.tabButtonText, showMyEvents && styles.tabButtonTextActive]}>
            {language === 'fr' ? 'Mes événements' : 'My Events'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 180 }]}
        keyboardShouldPersistTaps="handled"
      >
        {showMyEvents ? (
          // Section "Mes événements"
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>
              {language === 'fr' ? 'Mes événements' : 'My Events'} ({myEvents.length})
            </Text>
            {loadingEvents ? (
              <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />
            ) : myEvents.length === 0 ? (
              <Text style={styles.emptyText}>
                {language === 'fr' ? 'Aucun événement créé pour le moment.' : 'No events created yet.'}
              </Text>
            ) : (
              myEvents.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventInfo}>
                    📅 {new Date(event.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.eventInfo}>⏰ {event.time}</Text>
                  {event.venue && (
                    <Text style={styles.eventInfo}>📍 {event.venue.venueName}</Text>
                  )}
                  {event.djs && event.djs.length > 0 && (
                    <Text style={styles.eventInfo}>
                      🎧 {event.djs.map((dj) => dj.artistName).join(', ')}
                    </Text>
                  )}
                  <Text style={styles.eventInfo}>💰 {event.price} €</Text>
                  <Text style={styles.eventInfo}>
                    {language === 'fr' ? 'Statut' : 'Status'}: {event.status}
                  </Text>
                  <Text style={styles.eventInfo}>
                    {event.sold} / {event.capacity} {language === 'fr' ? 'places vendues' : 'tickets sold'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.deleteButton, deletingEventId === event.id && styles.deleteButtonDisabled]}
                    onPress={() => handleDeleteEvent(event.id)}
                    disabled={deletingEventId === event.id}
                  >
                    {deletingEventId === event.id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.deleteButtonText}>
                        {language === 'fr' ? '🗑️ Supprimer' : '🗑️ Delete'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            {/* Indicateur d'étapes */}
            <View style={styles.stepsIndicator}>
              <View style={[styles.step, currentStep >= 1 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 1 && styles.stepNumberActive]}>1</Text>
                <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Date' : 'Date'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 2 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 2 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 2 && styles.stepNumberActive]}>2</Text>
                <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Lieu' : 'Venue'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 3 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 3 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 3 && styles.stepNumberActive]}>3</Text>
                <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'DJs' : 'DJs'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 4 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 4 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 4 && styles.stepNumberActive]}>4</Text>
                <Text style={[styles.stepLabel, currentStep >= 4 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Détails' : 'Details'}
                </Text>
              </View>
              <View style={[styles.stepLine, currentStep >= 5 && styles.stepLineActive]} />
              <View style={[styles.step, currentStep >= 5 && styles.stepActive]}>
                <Text style={[styles.stepNumber, currentStep >= 5 && styles.stepNumberActive]}>5</Text>
                <Text style={[styles.stepLabel, currentStep >= 5 && styles.stepLabelActive]}>
                  {language === 'fr' ? 'Paiement' : 'Payment'}
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              {/* ÉTAPE 1: Date et Durée */}
              {currentStep === 1 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 1 : Date et durée' : 'Step 1: Date and duration'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Date' : 'Date'} *
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={openDatePicker}
                >
                  <Text style={[styles.selectButtonText, !formData.date && styles.placeholderText]}>
                    {formData.date
                      ? new Date(eventDateTime).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                          { day: '2-digit', month: '2-digit', year: 'numeric' }
                        )
                      : language === 'fr'
                      ? 'Choisir une date'
                      : 'Choose a date'}
                  </Text>
                  <Text style={styles.chevron}>📅</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Heure de début' : 'Start time'} *
                </Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={openTimePicker}
                >
                  <Text style={[styles.selectButtonText, !formData.time && styles.placeholderText]}>
                    {formData.time
                      ? formData.time
                      : language === 'fr'
                      ? 'Choisir une heure'
                      : 'Choose a time'}
                  </Text>
                  <Text style={styles.chevron}>⏰</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Durée de la soirée (heures)' : 'Event duration (hours)'} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ex: 4' : 'Ex: 4'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.durationHours}
                  onChangeText={(value) => handleChange('durationHours', value)}
                />
              </View>

              <TouchableOpacity
                style={[styles.nextButton, (!formData.date || !formData.time || !formData.durationHours) && styles.nextButtonDisabled]}
                onPress={() => {
                  if (formData.date && formData.time && formData.durationHours) {
                    setCurrentStep(2);
                  }
                }}
                disabled={!formData.date || !formData.time || !formData.durationHours}
              >
                <Text style={styles.nextButtonText}>
                  {language === 'fr' ? 'Suivant →' : 'Next →'}
                </Text>
              </TouchableOpacity>
            </>
              )}

              {/* ÉTAPE 2: Sélection du lieu */}
              {currentStep === 2 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 2 : Choisir un lieu' : 'Step 2: Choose a venue'}
              </Text>

              <Text style={styles.stepDescription}>
                {language === 'fr' 
                  ? 'Sélectionne un lieu disponible pour cette date et cette durée.'
                  : 'Select a venue available for this date and duration.'}
              </Text>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  navigate('selectVenue', {
                    selectedVenueId: formData.venueId,
                  });
                }}
              >
                <Text style={[styles.selectButtonText, !selectedVenue && styles.placeholderText]}>
                  {selectedVenue
                    ? `${selectedVenue.venueName} - ${selectedVenue.address}`
                    : language === 'fr' ? 'Sélectionner un lieu' : 'Select a venue'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>

              {selectedVenue && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedInfoText}>
                    ✓ {language === 'fr' ? 'Lieu sélectionné' : 'Venue selected'}: {selectedVenue.venueName}
                  </Text>
                </View>
              )}

              <View style={styles.stepButtons}>
                <TouchableOpacity
                  style={styles.backButtonStep}
                  onPress={() => setCurrentStep(1)}
                >
                  <Text style={styles.backButtonStepText}>
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, !selectedVenue && styles.nextButtonDisabled]}
                  onPress={() => {
                    if (selectedVenue) {
                      setCurrentStep(3);
                    }
                  }}
                  disabled={!selectedVenue}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
              )}

              {/* ÉTAPE 3: Sélection des DJs */}
              {currentStep === 3 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 3 : Choisir des DJs' : 'Step 3: Choose DJs'}
              </Text>

              {!formData.date && (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    {language === 'fr' 
                      ? '⚠️ Veuillez d\'abord sélectionner une date à l\'étape 1 pour voir les DJs disponibles.'
                      : '⚠️ Please select a date in step 1 first to see available DJs.'}
                  </Text>
                </View>
              )}

              {formData.date && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    {language === 'fr' 
                      ? `📅 DJs disponibles le ${new Date(eventDateTime).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                      : `📅 DJs available on ${new Date(eventDateTime).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                  </Text>
                </View>
              )}

              <Text style={styles.stepDescription}>
                {language === 'fr' 
                  ? 'Sélectionne un ou plusieurs DJs disponibles pour cette date.'
                  : 'Select one or more DJs available for this date.'}
              </Text>

              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  navigate('selectDj', {
                    selectedDjIds: formData.djIds,
                  });
                }}
              >
                <Text style={[styles.selectButtonText, selectedDjs.length === 0 && styles.placeholderText]}>
                  {selectedDjs.length > 0
                    ? selectedDjs.map((dj) => dj.artistName).join(', ')
                    : language === 'fr' ? 'Sélectionner un ou plusieurs DJs' : 'Select one or more DJs'}
                </Text>
                <Text style={styles.chevron}>▼</Text>
              </TouchableOpacity>

              {selectedDjs.length > 0 && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedInfoText}>
                    ✓ {language === 'fr' ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}: {selectedDjs.length}
                  </Text>
                </View>
              )}

              <View style={styles.stepButtons}>
                <TouchableOpacity
                  style={styles.backButtonStep}
                  onPress={() => setCurrentStep(2)}
                >
                  <Text style={styles.backButtonStepText}>
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, selectedDjs.length === 0 && styles.nextButtonDisabled]}
                  onPress={() => {
                    if (selectedDjs.length > 0) {
                      setCurrentStep(4);
                    }
                  }}
                  disabled={selectedDjs.length === 0}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
              )}

              {/* ÉTAPE 4: Détails et paiement */}
              {currentStep === 4 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 4 : Détails' : 'Step 4: Details'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Titre de l\'événement' : 'Event title'} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ex: Soirée Techno Underground' : 'Ex: Underground Techno Night'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.title}
                  onChangeText={(value) => handleChange('title', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Prix estimé' : 'Estimated price'} (€) *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.price}
                  onChangeText={(value) => handleChange('price', value)}
                />
                {autoPrice ? (
                  <Text style={styles.helperText}>
                    {language === 'fr'
                      ? `Calculé automatiquement : ~${autoPrice} € (modifiable)`
                      : `Automatically computed: ~${autoPrice} € (editable)`}
                  </Text>
                ) : (
                  <Text style={styles.helperText}>
                    {language === 'fr'
                      ? 'Le prix sera calculé automatiquement selon le lieu, les DJs et la durée.'
                      : 'Price will be automatically computed from venue, DJs and duration.'}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Capacité' : 'Capacity'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="200"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.capacity}
                  onChangeText={(value) => handleChange('capacity', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Genre musical' : 'Music genre'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={language === 'fr' ? 'Ex: Techno, House, Electro' : 'Ex: Techno, House, Electro'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  value={formData.genre}
                  onChangeText={(value) => handleChange('genre', value)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Description' : 'Description'}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={language === 'fr' ? 'Description de l\'événement...' : 'Event description...'}
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  multiline
                  numberOfLines={4}
                  value={formData.description}
                  onChangeText={(value) => handleChange('description', value)}
                />
              </View>

              <View style={styles.stepButtons}>
                <TouchableOpacity
                  style={styles.backButtonStep}
                  onPress={() => setCurrentStep(3)}
                >
                  <Text style={styles.backButtonStepText}>
                    ← {language === 'fr' ? 'Précédent' : 'Previous'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, (!formData.title || !formData.price) && styles.nextButtonDisabled]}
                  onPress={() => {
                    if (formData.title && formData.price) {
                      setCurrentStep(5);
                    }
                  }}
                  disabled={!formData.title || !formData.price}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
              )}

              {/* ÉTAPE 5: Récapitulatif et Paiement */}
              {currentStep === 5 && (
                <>
                  <Text style={styles.sectionTitle}>
                    {language === 'fr' ? 'Étape 5 : Récapitulatif et Paiement' : 'Step 5: Summary and Payment'}
                  </Text>

                  <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>
                      {language === 'fr' ? 'Récapitulatif de l\'événement' : 'Event Summary'}
                    </Text>

                    {/* Informations de base */}
                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Titre' : 'Title'}
                      </Text>
                      <Text style={styles.summaryValue}>{formData.title}</Text>
                    </View>

                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Date et heure' : 'Date and time'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formData.date && new Date(eventDateTime).toLocaleDateString(
                          language === 'fr' ? 'fr-FR' : 'en-US',
                          { day: '2-digit', month: '2-digit', year: 'numeric' }
                        )} {formData.time}
                      </Text>
                    </View>

                    <View style={styles.summarySection}>
                      <Text style={styles.summaryLabel}>
                        {language === 'fr' ? 'Durée' : 'Duration'}
                      </Text>
                      <Text style={styles.summaryValue}>
                        {formData.durationHours} {language === 'fr' ? 'heures' : 'hours'}
                      </Text>
                    </View>

                    {selectedVenue && (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'Lieu' : 'Venue'}
                        </Text>
                        <Text style={styles.summaryValue}>{selectedVenue.venueName}</Text>
                        <Text style={styles.summarySubValue}>{selectedVenue.address}</Text>
                      </View>
                    )}

                    {selectedDjs.length > 0 && (
                      <View style={styles.summarySection}>
                        <Text style={styles.summaryLabel}>
                          {language === 'fr' ? 'DJs sélectionnés' : 'Selected DJs'}
                        </Text>
                        {selectedDjs.map((dj) => (
                          <Text key={dj.userId} style={styles.summaryValue}>
                            • {dj.artistName}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Détail des coûts */}
                    <View style={styles.costBreakdown}>
                      <Text style={styles.costTitle}>
                        {language === 'fr' ? 'Détail des coûts' : 'Cost Breakdown'}
                      </Text>

                      {/* Coût du lieu */}
                      {selectedVenue && (
                        <View style={styles.costRow}>
                          <Text style={styles.costLabel}>
                            {language === 'fr' ? 'Lieu' : 'Venue'} ({selectedVenue.venueName})
                          </Text>
                          <Text style={styles.costValue}>
                            {(() => {
                              const venueBase = typeof selectedVenue.averageRatingGlobal === 'number'
                                ? 50 + selectedVenue.averageRatingGlobal * 10
                                : 50;
                              return `${Math.round(venueBase)} €`;
                            })()}
                          </Text>
                        </View>
                      )}

                      {/* Coût des DJs */}
                      {selectedDjs.map((dj) => {
                        const duration = formData.durationHours
                          ? parseFloat(formData.durationHours.replace(',', '.'))
                          : 0;
                        const rate = dj.hourlyRate ?? dj.performanceRate ?? 0;
                        const djCost = rate * duration;
                        return (
                          <View key={dj.userId} style={styles.costRow}>
                            <Text style={styles.costLabel}>
                              {dj.artistName} ({duration}h × {rate}€/h)
                            </Text>
                            <Text style={styles.costValue}>{Math.round(djCost)} €</Text>
                          </View>
                        );
                      })}

                      {/* Total */}
                      <View style={styles.costTotal}>
                        <Text style={styles.costTotalLabel}>
                          {language === 'fr' ? 'Total estimé' : 'Estimated Total'}
                        </Text>
                        <Text style={styles.costTotalValue}>
                          {autoPrice || formData.price} €
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.stepButtons}>
                    <TouchableOpacity
                      style={styles.backButtonStep}
                      onPress={() => setCurrentStep(4)}
                    >
                      <Text style={styles.backButtonStepText}>
                        ← {language === 'fr' ? 'Précédent' : 'Previous'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.createButton, creating && styles.createButtonDisabled]}
                      onPress={handleCreateEvent}
                      disabled={creating || !formData.title || !formData.price}
                    >
                      {creating ? (
                        <ActivityIndicator color="#0b0b0e" />
                      ) : (
                        <Text style={styles.createButtonText}>
                          {language === 'fr' ? 'Confirmer et créer l\'événement' : 'Confirm and create event'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal pour le sélecteur de date */}
      {Platform.OS === 'ios' && (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerModalContent}
          >
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {language === 'fr' ? 'Sélectionner une date' : 'Select a date'}
              </Text>
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="light"
                textColor={Platform.OS === 'android' ? '#000000' : undefined}
                onChange={(_, selectedDate) => {
                  // On met juste à jour la date temporaire sans fermer
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerCancelButtonText}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  setEventDateTime((prev) => {
                    const newDate = new Date(tempDate);
                    newDate.setHours(prev.getHours());
                    newDate.setMinutes(prev.getMinutes());
                    return newDate;
                  });
                  handleChange('date', tempDate.toISOString());
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmButtonText}>
                  {language === 'fr' ? 'Valider' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      )}

      {/* Modal pour le sélecteur d'heure */}
      {Platform.OS === 'ios' && (
      <Modal
        visible={showTimePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <TouchableOpacity
          style={styles.datePickerModalOverlay}
          activeOpacity={1}
          onPress={() => setShowTimePicker(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerModalContent}
          >
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>
                {language === 'fr' ? 'Sélectionner une heure' : 'Select a time'}
              </Text>
              <TouchableOpacity
                style={styles.datePickerCloseButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.datePickerCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={tempTime}
                mode="time"
                is24Hour={true}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="light"
                textColor={Platform.OS === 'android' ? '#000000' : undefined}
                onChange={(_, selectedTime) => {
                  // On met juste à jour l'heure temporaire sans fermer
                  if (selectedTime) {
                    setTempTime(selectedTime);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
            <View style={styles.datePickerFooter}>
              <TouchableOpacity
                style={styles.datePickerCancelButton}
                onPress={() => setShowTimePicker(false)}
              >
                <Text style={styles.datePickerCancelButtonText}>
                  {language === 'fr' ? 'Annuler' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.datePickerConfirmButton}
                onPress={() => {
                  setEventDateTime((prev) => {
                    const newDate = new Date(prev);
                    newDate.setHours(tempTime.getHours());
                    newDate.setMinutes(tempTime.getMinutes());
                    return newDate;
                  });
                  const hours = tempTime.getHours().toString().padStart(2, '0');
                  const minutes = tempTime.getMinutes().toString().padStart(2, '0');
                  handleChange('time', `${hours}:${minutes}`);
                  setShowTimePicker(false);
                }}
              >
                <Text style={styles.datePickerConfirmButtonText}>
                  {language === 'fr' ? 'Valider' : 'Confirm'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
      )}
    </KeyboardAvoidingView>
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
    marginBottom: 10,
  },
  backButtonText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  form: {
    marginTop: 20,
    gap: 18,
  },
  sectionTitle: {
    color: '#ff7a1a',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#ffffff',
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: '#1a1a1f',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
  },
  chevron: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginLeft: 8,
  },
  createButton: {
    backgroundColor: '#ff7a1a',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '800',
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  step: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    opacity: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,122,26,0.2)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 4,
  },
  stepNumberActive: {
    backgroundColor: '#ff7a1a',
    color: '#0b0b0e',
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#ff7a1a',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,122,26,0.2)',
    marginHorizontal: 8,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: '#ff7a1a',
  },
  stepDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  selectedInfo: {
    backgroundColor: 'rgba(255,122,26,0.2)',
    borderWidth: 1,
    borderColor: '#ff7a1a',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  selectedInfoText: {
    color: '#ff7a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 12,
  },
  backButtonStep: {
    flex: 1,
    backgroundColor: 'rgba(255,122,26,0.2)',
    borderWidth: 1,
    borderColor: '#ff7a1a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonStepText: {
    color: '#ff7a1a',
    fontSize: 16,
    fontWeight: '700',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#ff7a1a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1f',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    borderTopWidth: 2,
    borderTopColor: '#ff7a1a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.3)',
  },
  modalTitle: {
    color: '#ff7a1a',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,122,26,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#ff7a1a',
    fontSize: 24,
    fontWeight: '300',
  },
  modalOptions: {
    padding: 10,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#0b0b0e',
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.2)',
  },
  modalOptionSelected: {
    backgroundColor: 'rgba(255,122,26,0.2)',
    borderColor: '#ff7a1a',
  },
  modalOptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#ff7a1a',
    fontWeight: '700',
  },
  modalOptionCheck: {
    color: '#ff7a1a',
    fontSize: 18,
    fontWeight: '700',
  },
  djOptionContent: {
    flex: 1,
  },
  djOptionSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  venueOptionContent: {
    flex: 1,
  },
  venueOptionSubtext: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  helperText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 4,
  },
  loadingIndicator: {
    marginVertical: 40,
  },
  noOptionsText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 40,
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderTopWidth: 2,
    borderTopColor: '#ff7a1a',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  datePickerTitle: {
    color: '#0b0b0e',
    fontSize: 18,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  datePickerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ff7a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCloseButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  datePickerContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  datePicker: {
    width: '100%',
    backgroundColor: '#ffffff',
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  datePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ff7a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  tabButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,122,26,0.2)',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FF7A1A',
  },
  tabButtonText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  eventsSection: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  eventInfo: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 6,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  loader: {
    marginTop: 40,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,122,26,0.3)',
  },
  summaryTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summarySubValue: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  costBreakdown: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,122,26,0.5)',
  },
  costTitle: {
    color: '#FF7A1A',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
  },
  costLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    flex: 1,
  },
  costValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,122,26,0.5)',
  },
  costTotalLabel: {
    color: '#FF7A1A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  costTotalValue: {
    color: '#FF7A1A',
    fontSize: 24,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  warningText: {
    color: '#FFC107',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.5)',
  },
  infoText: {
    color: '#2196F3',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
});

