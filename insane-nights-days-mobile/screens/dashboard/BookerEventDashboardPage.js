import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import { api } from '../../api/config';
import { useToast } from '../../hooks/useToast';

export default function BookerEventDashboardPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const { formData, setFormData, eventDateTime, setEventDateTime, resetForm, addDj, removeDj, setVenue } = useEventForm();

  const [availableDjs, setAvailableDjs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Étape actuelle du formulaire (1: Date/Durée, 2: Lieu, 3: DJs, 4: Détails, 5: Récapitulatif/Paiement)
  const [currentStep, setCurrentStep] = useState(1);
  
  // Slots DJ pour la création d'événement
  const [djSlots, setDjSlots] = useState([null]);
  
  // Date & heure avec sélecteurs stylés
  const [tempDate, setTempDate] = useState(eventDateTime || new Date());
  const [tempTime, setTempTime] = useState(eventDateTime || new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Gérer les sélections depuis routeParams
  const lastProcessedParams = useRef({ selectedDjId: null, selectedVenueId: null, action: null, slotIndex: null });
  const hasInitializedSlots = useRef(false);
  
  const currentDjId = routeParams?.selectedDjId;
  const currentVenueId = routeParams?.selectedVenueId;
  const currentAction = routeParams?.action;
  const currentSlotIndex = routeParams?.slotIndex;

  // Ouvrir le sélecteur de date
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

  // Ouvrir le sélecteur d'heure
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

  useEffect(() => {
    if (user?.token) {
      fetchVenues();
      if (formData.date) {
        fetchAvailableDjs();
      }
    }
  }, [user?.token]);

  useEffect(() => {
    if (user?.token && formData.date && currentStep >= 3) {
      fetchAvailableDjs();
    }
  }, [formData.date, currentStep, user?.token]);

  // Initialiser les slots seulement la première fois qu'on arrive à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && !hasInitializedSlots.current) {
      if (formData.djIds.length > 0) {
        setDjSlots([...formData.djIds, null]);
      } else if (djSlots.length === 0) {
        setDjSlots([null]);
      }
      hasInitializedSlots.current = true;
    } else if (currentStep !== 3) {
      hasInitializedSlots.current = false;
    }
  }, [currentStep]);

  // Gérer les sélections depuis routeParams
  React.useLayoutEffect(() => {
    const isSlotUpdate = currentSlotIndex !== undefined && currentSlotIndex !== null;
    
    if (!isSlotUpdate) {
      const paramsKey = `${currentDjId}-${currentVenueId}-${currentAction}-${currentSlotIndex}`;
      const lastParamsKey = `${lastProcessedParams.current.selectedDjId}-${lastProcessedParams.current.selectedVenueId}-${lastProcessedParams.current.action}-${lastProcessedParams.current.slotIndex}`;
      
      if (paramsKey === lastParamsKey && paramsKey !== 'null-null-null-null') {
        return;
      }
    }
    
    lastProcessedParams.current = {
      selectedDjId: currentDjId,
      selectedVenueId: currentVenueId,
      action: currentAction,
      slotIndex: currentSlotIndex,
    };
    
    // Sélection de DJ
    if (currentDjId && currentAction === 'add') {
      if (currentSlotIndex !== undefined && currentSlotIndex !== null) {
        setDjSlots(prev => {
          const newSlots = [...prev];
          while (newSlots.length <= currentSlotIndex) {
            newSlots.push(null);
          }
          newSlots[currentSlotIndex] = currentDjId;
          const newDjIds = newSlots.filter(id => id !== null);
          setFormData(prevForm => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        if (currentStep !== 3) {
          setCurrentStep(3);
        }
      } else if (currentStep >= 3) {
        setDjSlots(prev => {
          const newSlots = [...prev];
          const emptyIndex = newSlots.findIndex(id => id === null);
          if (emptyIndex !== -1) {
            newSlots[emptyIndex] = currentDjId;
          } else {
            newSlots.push(currentDjId);
          }
          const newDjIds = newSlots.filter(id => id !== null);
          setFormData(prevForm => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        setCurrentStep(3);
      } else {
        addDj(currentDjId);
        setCurrentStep(4);
      }
    } else if (currentDjId && currentAction === 'remove') {
      if (currentSlotIndex !== undefined && currentSlotIndex !== null) {
        setDjSlots(prev => {
          const newSlots = [...prev];
          newSlots[currentSlotIndex] = null;
          const newDjIds = newSlots.filter(id => id !== null);
          setFormData(prevForm => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        setCurrentStep(3);
      } else {
        removeDj(currentDjId);
      }
    }
    
    // Sélection de lieu
    if (currentVenueId && currentAction === 'select') {
      setVenue(currentVenueId);
      setCurrentStep(2); // Rester sur l'étape Lieu pour voir la sélection
    } else if (currentVenueId && currentAction === 'remove') {
      setVenue('');
    }
  }, [currentDjId, currentVenueId, currentAction, currentSlotIndex]);

  const fetchAvailableDjs = async () => {
    if (!user?.token || loadingDjs) return;
    setLoadingDjs(true);
    try {
      const dateToSend = formData.date || (eventDateTime ? eventDateTime.toISOString() : null);
      const response = await api.getAvailableDjs(user.token, dateToSend);
      if (response && response.success) {
        setAvailableDjs(response.djs || []);
      }
    } catch (error) {
      console.error('Erreur récupération DJs disponibles:', error);
      showError(language === 'fr' ? 'Impossible de charger les DJs disponibles.' : 'Unable to load available DJs.');
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
      showError(language === 'fr' ? 'Impossible de charger les lieux.' : 'Unable to load venues.');
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateEvent = async () => {
    if (creating) return;

    if (!formData.title || !formData.date || !formData.time || !formData.venueId || formData.djIds.length === 0) {
      showError(language === 'fr' ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).' : 'Please fill in all required fields (title, date, time, venue, DJ).');
      return;
    }

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
          showError(language === 'fr'
            ? 'Vous ne pouvez pas créer un événement à une date déjà passée.'
            : 'You cannot create an event on a past date.');
          return;
        }
      }
    } catch (e) {
      console.warn('Erreur vérification date passée côté app:', e);
    }

    setCreating(true);
    try {
      let formattedDate = formData.date;
      if (eventDateTime && !formData.date) {
        formattedDate = eventDateTime.toISOString();
      } else if (formData.date && typeof formData.date === 'string') {
        try {
          const dateObj = new Date(formData.date);
          if (!isNaN(dateObj.getTime())) {
            formattedDate = dateObj.toISOString();
          }
        } catch (e) {
          // Ignore
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
        durationHours: formData.durationHours ? parseFloat(formData.durationHours) : null,
        capacity: formData.capacity ? parseInt(formData.capacity) : 100,
        genre: formData.genre ? formData.genre.trim() : 'Mixed',
        description: formData.description ? formData.description.trim() : null,
      };

      const response = await api.createEvent(user.token, eventData);

      if (!response) {
        showError(language === 'fr' ? 'Impossible de joindre le serveur. Vérifie ta connexion.' : 'Unable to reach server. Check your connection.');
        return;
      }

      if (!response.success) {
        if (response.status === 409 || (response.message && (response.message.includes('déjà') || response.message.includes('existe déjà')))) {
          let conflictMessage = response.message || (language === 'fr' ? 'Conflit de réservation' : 'Booking conflict');
          if (response.conflictingEvent) {
            const conflictDate = new Date(response.conflictingEvent.date).toLocaleDateString(
              language === 'fr' ? 'fr-FR' : 'en-US',
              { day: '2-digit', month: '2-digit', year: 'numeric' }
            );
            conflictMessage += `\n\n${language === 'fr' ? 'Événement en conflit' : 'Conflicting event'}: ${response.conflictingEvent.title} (${conflictDate}${response.conflictingEvent.time ? ' à ' + response.conflictingEvent.time : ''})`;
          }
          showError(conflictMessage);
        } else {
          showError(response.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.'));
        }
        return;
      }

      showSuccess(language === 'fr'
        ? 'L\'événement a été créé avec succès.'
        : 'The event has been created successfully.');
      setTimeout(() => {
        resetForm();
        goBack();
      }, 2000);
    } catch (error) {
      console.error('Erreur création événement:', error);
      showError(error.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.'));
    } finally {
      setCreating(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === formData.venueId);
  const selectedDjs = availableDjs.filter((dj) => formData.djIds.includes(dj.userId));

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
        <Text style={styles.title}>{language === 'fr' ? 'Créer un événement' : 'Create Event'}</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
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
                    returnTo: 'bookerEventDashboard',
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
                  ? 'Ajoutez des slots et sélectionnez un DJ pour chaque slot.'
                  : 'Add slots and select a DJ for each slot.'}
              </Text>

              {/* Liste des slots DJ */}
              {djSlots.map((djId, index) => {
                const selectedDj = djId ? availableDjs.find(dj => dj.userId === djId) : null;
                return (
                  <View key={index} style={styles.djSlotContainer}>
                    <View style={styles.djSlotHeader}>
                      <Text style={styles.djSlotLabel}>
                        {language === 'fr' ? `Slot ${index + 1}` : `Slot ${index + 1}`}
                      </Text>
                      {djSlots.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeSlotButton}
                          onPress={() => {
                            const newSlots = djSlots.filter((_, i) => i !== index);
                            setDjSlots(newSlots);
                            const newDjIds = newSlots.filter(id => id !== null);
                            setFormData(prev => ({ ...prev, djIds: newDjIds }));
                          }}
                        >
                          <Text style={styles.removeSlotButtonText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        const currentSlotDjId = djSlots[index];
                        const otherSelectedDjIds = formData.djIds.filter(id => id !== currentSlotDjId);
                        navigate('selectDj', {
                          selectedDjIds: otherSelectedDjIds,
                          slotIndex: index,
                          isSlotMode: true,
                        });
                      }}
                    >
                      <Text style={[styles.selectButtonText, !selectedDj && styles.placeholderText]}>
                        {selectedDj
                          ? `${selectedDj.artistName} • ${language === 'fr' ? 'prix à convenir' : 'price to agree'}`
                          : language === 'fr' ? 'Sélectionner un DJ' : 'Select a DJ'}
                      </Text>
                      <Text style={styles.chevron}>▼</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Bouton pour ajouter un slot */}
              <TouchableOpacity
                style={styles.addSlotButton}
                onPress={() => {
                  setDjSlots([...djSlots, null]);
                }}
              >
                <Text style={styles.addSlotButtonText}>
                  + {language === 'fr' ? 'Ajouter un slot DJ' : 'Add DJ slot'}
                </Text>
              </TouchableOpacity>

              {djSlots.filter(id => id !== null).length > 0 && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedInfoText}>
                    ✓ {language === 'fr' ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}: {djSlots.filter(id => id !== null).length}
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
                  style={[styles.nextButton, djSlots.filter(id => id !== null).length === 0 && styles.nextButtonDisabled]}
                  onPress={() => {
                    const selectedDjIds = djSlots.filter(id => id !== null);
                    if (selectedDjIds.length > 0) {
                      setFormData(prev => ({ ...prev, djIds: selectedDjIds }));
                      setCurrentStep(4);
                    }
                  }}
                  disabled={djSlots.filter(id => id !== null).length === 0}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ÉTAPE 4: Détails */}
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
                  {language === 'fr' ? 'prix de la place' : 'price of the place'} (€)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  keyboardType="numeric"
                  value={formData.price}
                  onChangeText={(value) => handleChange('price', value)}
                />
                <Text style={styles.helperText}>
                  {language === 'fr'
                    ? 'Le prix DJ sera fixé via un contrat (chat privé).'
                    : 'DJ price will be set via a contract (private chat).'}
                </Text>
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

                <View style={styles.costBreakdown}>
                  <Text style={styles.costTitle}>
                    {language === 'fr' ? 'Détail des coûts' : 'Cost Breakdown'}
                  </Text>

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

                  <View style={styles.costRow}>
                    <Text style={styles.costLabel}>
                      {language === 'fr' ? 'DJs' : 'DJs'}
                    </Text>
                    <Text style={styles.costValue}>
                      {language === 'fr' ? 'Prix à convenir (contrat)' : 'Price to agree (contract)'}
                    </Text>
                  </View>

                  <View style={styles.costTotal}>
                    <Text style={styles.costTotalLabel}>
                      {language === 'fr' ? 'Total' : 'Total'}
                    </Text>
                    <Text style={styles.costTotalValue}>
                      {formData.price ? `${formData.price} €` : (language === 'fr' ? 'À définir' : 'To define')}
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
                  onChange={(_, selectedDate) => {
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
                  onChange={(_, selectedTime) => {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,23,68,0.2)',
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  stepsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  step: {
    alignItems: 'center',
    width: 50,
  },
  stepActive: {
    opacity: 1,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 30,
  },
  stepNumberActive: {
    backgroundColor: '#FF1744',
    color: '#fff',
  },
  stepLabel: {
    marginTop: 5,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#FF1744',
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: '#FF1744',
  },
  form: {
    gap: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  selectButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
  },
  chevron: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  nextButton: {
    backgroundColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '800',
  },
  stepButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  backButtonStep: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  backButtonStepText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 20,
  },
  selectedInfo: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  selectedInfoText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  warningText: {
    color: '#FF9800',
    fontSize: 14,
  },
  infoBox: {
    backgroundColor: 'rgba(33,150,243,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: '#2196F3',
    fontSize: 14,
  },
  djSlotContainer: {
    marginBottom: 15,
  },
  djSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  djSlotLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeSlotButton: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeSlotButtonText: {
    color: '#F44336',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addSlotButton: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  addSlotButtonText: {
    color: '#FF1744',
    fontSize: 16,
    fontWeight: '600',
  },
  helperText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 5,
  },
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.3)',
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  costTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  costLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  costValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  costTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  costTotalLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  costTotalValue: {
    color: '#FF1744',
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 2,
    backgroundColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#0b0b0e',
    fontSize: 16,
    fontWeight: '800',
  },
  datePickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  datePickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  datePickerCloseButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerCloseButtonText: {
    fontSize: 24,
    color: '#000',
  },
  datePickerContainer: {
    padding: 20,
  },
  datePicker: {
    width: '100%',
  },
  datePickerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 10,
  },
  datePickerCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickerCancelButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerConfirmButton: {
    flex: 1,
    backgroundColor: '#FF1744',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  datePickerConfirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
