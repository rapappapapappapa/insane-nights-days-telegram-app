import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';
import {
  EVENT_CREATION_DRAFT_KEY,
  DRAFT_VERSION,
  getEventMinLeadDaysFromEnv,
  getMinEventCalendarDate,
  hasBookerEventTitle,
  hasBookerEventPrice,
  getMergedInitialBookerWizardStep,
  parseResumeStepFromParams,
  parseHM,
  applyEqualDjSlotTimes,
  slotFitsEventWindow,
  djSlotsToFormDjFields,
} from '../utils/bookerEventWizardUtils';
import { useBookerEventWizardDraft } from './useBookerEventWizardDraft';
import { useBookerEventWizardRental } from './useBookerEventWizardRental';
import { parseSaleDateInput } from '../utils/ticketPricingUtils';

export function useBookerEventWizard({
  user,
  language,
  routeParams,
  navigate,
  goBack,
  showError,
  showSuccess,
  formData,
  setFormData,
  eventDateTime,
  setEventDateTime,
  resetForm,
  setVenue,
  coverImageUri,
  setCoverImageUri,
  bookerEventWizardStep,
  setBookerEventWizardStep,
  djSlots,
  setDjSlots,
}) {
    const [availableDjs, setAvailableDjs] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loadingDjs, setLoadingDjs] = useState(false);
    const [loadingVenues, setLoadingVenues] = useState(false);
    const [creating, setCreating] = useState(false);
    const [postCreateModal, setPostCreateModal] = useState(null);
  
    // Étape actuelle du formulaire (1: Date/Durée, 2: Lieu, 3: DJs, 4: Détails, 5: Récapitulatif)
    const [currentStep, setCurrentStep] = useState(() =>
      getMergedInitialBookerWizardStep(routeParams, bookerEventWizardStep)
    );
  
    useEffect(() => {
      setBookerEventWizardStep(currentStep);
    }, [currentStep, setBookerEventWizardStep]);
  
    // Slots DJ : state dans EventFormContext (survit au démontage selectDj / profil DJ)
    const [slotTimePicker, setSlotTimePicker] = useState(null);
    const [tempSlotTime, setTempSlotTime] = useState(() => new Date());
    
    // Date & heure avec sélecteurs stylés
    const [tempDate, setTempDate] = useState(eventDateTime || new Date());
    const [tempTime, setTempTime] = useState(eventDateTime || new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    
    // Gérer les sélections depuis routeParams
    const lastProcessedParams = useRef({ selectedVenueId: null, action: null });
    const hasInitializedSlots = useRef(false);

    const currentVenueId = routeParams?.selectedVenueId;
    const currentAction = routeParams?.action;

    const { draftGate, clearDraftAndRestartWizard, flushDraftNow } = useBookerEventWizardDraft({
      language,
      showSuccess,
      routeParams,
      formData,
      setFormData,
      eventDateTime,
      setEventDateTime,
      currentStep,
      setCurrentStep,
      djSlots,
      setDjSlots,
      coverImageUri,
      setCoverImageUri,
      hasInitializedSlots,
      creating,
      resetForm,
      setTempDate,
      setTempTime,
    });

    const rental = useBookerEventWizardRental({
      user,
      language,
      showError,
      showSuccess,
      setFormData,
      draftGate,
    });
  
    // Ouvrir le sélecteur de date
    const openDatePicker = () => {
      const leadDays = getEventMinLeadDaysFromEnv();
      const minDate = leadDays > 0 ? getMinEventCalendarDate(leadDays) : undefined;
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: eventDateTime || new Date(),
          mode: 'date',
          minimumDate: minDate,
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
      {
        const lead = getEventMinLeadDaysFromEnv();
        const base = eventDateTime || new Date();
        if (lead > 0) {
          const min = getMinEventCalendarDate(lead);
          const baseDay = new Date(base.getFullYear(), base.getMonth(), base.getDate());
          if (baseDay < min) {
            const n = new Date(min);
            n.setHours(base.getHours());
            n.setMinutes(base.getMinutes());
            setTempDate(n);
          } else {
            setTempDate(base);
          }
        } else {
          setTempDate(base);
        }
      }
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
  
    // Gérer les sélections depuis routeParams (après réhydratation brouillon)
    React.useLayoutEffect(() => {
      if (draftGate) return;

      const paramsKey = `${currentVenueId}-${currentAction}`;
      const lastParamsKey = `${lastProcessedParams.current.selectedVenueId}-${lastProcessedParams.current.action}`;

      if (paramsKey === lastParamsKey && paramsKey !== 'null-null') {
        return;
      }

      lastProcessedParams.current = {
        selectedVenueId: currentVenueId,
        action: currentAction,
      };

      // Sélection de lieu (replaceVenue = remplacement depuis un événement existant)
      if (
        currentVenueId &&
        (currentAction === 'select' || currentAction === 'replaceVenue')
      ) {
        setVenue(currentVenueId);
        const rs = parseResumeStepFromParams(routeParams);
        setCurrentStep(rs ?? 2);
      } else if (currentVenueId && currentAction === 'remove') {
        setVenue('');
      }
    }, [currentVenueId, currentAction, draftGate, setVenue, setCurrentStep, routeParams]);
  
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
  
    /** Si le lieu a une capacité max déclarée, pré-remplir le champ événement quand il est encore vide */
    useEffect(() => {
      if (!formData.venueId || !venues.length) return;
      const v = venues.find((x) => x.id === formData.venueId);
      if (!v || v.maxCapacity == null) return;
      const cur = String(formData.capacity ?? '').trim();
      if (cur !== '') return;
      setFormData((prev) => ({ ...prev, capacity: String(v.maxCapacity) }));
    }, [formData.venueId, venues, setFormData]);
  
    const pickCoverImage = async () => {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          showError(
            language === 'fr' ? 'Accès à la galerie refusé.' : 'Photo library access denied.'
          );
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsEditing: true,
          aspect: [16, 9],
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setCoverImageUri(res.assets[0].uri);
        }
      } catch (e) {
        showError(String(e?.message || e));
      }
    };
  
    const updateSlotTimeFromPicker = React.useCallback(
      (slotIndex, field, date) => {
        const h = date.getHours().toString().padStart(2, '0');
        const mi = date.getMinutes().toString().padStart(2, '0');
        const hhmm = `${h}:${mi}`;
        const timeTrim = (formData.time || '').trim();
        const dur = parseFloat(formData.durationHours);
  
        setDjSlots((prev) => {
          const slot = prev[slotIndex];
          if (!slot) return prev;
          const nextStart = field === 'start' ? hhmm : slot.slotStart;
          const nextEnd = field === 'end' ? hhmm : slot.slotEnd;
          if (nextStart && nextEnd) {
            if (!slotFitsEventWindow(nextStart, nextEnd, timeTrim, dur)) {
              setTimeout(() => {
                showError(
                  language === 'fr'
                    ? 'Cette heure sort du créneau de l’événement (début + durée).'
                    : 'This time is outside the event window (start + duration).'
                );
              }, 0);
              return prev;
            }
          }
          const next = prev.map((s, i) => {
            if (i !== slotIndex) return s;
            if (field === 'start') return { ...s, slotStart: hhmm };
            return { ...s, slotEnd: hhmm };
          });
          return next;
        });
      },
      [formData.time, formData.durationHours, showError, language, setDjSlots]
    );
  
    const openSlotTimeField = (slotIndex, field) => {
      const slot = djSlots[slotIndex];
      if (!slot?.djId) return;
      const str = field === 'start' ? slot.slotStart : slot.slotEnd;
      const base = eventDateTime || new Date();
      const d = new Date(base);
      if (str && parseHM(str) != null) {
        const mins = parseHM(str);
        d.setHours(Math.floor(mins / 60) % 24);
        d.setMinutes(mins % 60);
        d.setSeconds(0);
        d.setMilliseconds(0);
      }
      if (Platform.OS === 'android') {
        DateTimePickerAndroid.open({
          value: d,
          mode: 'time',
          is24Hour: true,
          onChange: (_, selectedTime) => {
            if (selectedTime) {
              updateSlotTimeFromPicker(slotIndex, field, selectedTime);
            }
          },
        });
        return;
      }
      setTempSlotTime(d);
      setSlotTimePicker({ index: slotIndex, field });
    };
  
    const handleCreateEvent = async () => {
      if (creating) return;
  
      if (!user?.token) {
        showError(
          language === 'fr'
            ? 'Session expirée. Reconnecte-toi pour créer un événement.'
            : 'Session expired. Sign in again to create an event.'
        );
        return;
      }
  
      const djPayload = djSlotsToFormDjFields(djSlots);

      if (
        !hasBookerEventTitle(formData) ||
        !formData.date ||
        !formData.time ||
        !formData.venueId ||
        djPayload.djIds.length === 0
      ) {
        showError(language === 'fr' ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).' : 'Please fill in all required fields (title, date, time, venue, DJ).');
        return;
      }

      const durCheck = parseFloat(formData.durationHours);
      const assign = djPayload.djSlotAssignments || [];
      for (let i = 0; i < djPayload.djIds.length; i++) {
        const a = assign[i] || {};
        if (!a.slotStart || !a.slotEnd) {
          showError(
            language === 'fr'
              ? 'Renseigne un créneau (début et fin) pour chaque DJ.'
              : 'Set a time slot (start and end) for each DJ.'
          );
          return;
        }
        if (!slotFitsEventWindow(a.slotStart, a.slotEnd, formData.time.trim(), durCheck)) {
          showError(
            language === 'fr'
              ? `Le créneau de ${a.slotStart} à ${a.slotEnd} dépasse l'horaire ou la durée de l'événement.`
              : `The slot ${a.slotStart}–${a.slotEnd} is outside the event time window.`
          );
          return;
        }
      }
  
      const selectedVenForCap = venues.find((v) => v.id === formData.venueId);
      const capRaw = formData.capacity
        ? parseInt(String(formData.capacity).replace(/\s/g, ''), 10)
        : NaN;
      const eventCap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : 100;
      if (
        selectedVenForCap?.maxCapacity != null &&
        eventCap > selectedVenForCap.maxCapacity
      ) {
        showError(
          language === 'fr'
            ? `La capacité (${eventCap}) dépasse le plafond du lieu (${selectedVenForCap.maxCapacity} places). Réduis-la ou change de lieu.`
            : `Capacity (${eventCap}) exceeds this venue (${selectedVenForCap.maxCapacity} guests). Reduce it or pick another venue.`
        );
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
  
          const leadDays = getEventMinLeadDaysFromEnv();
          if (leadDays > 0) {
            const minEventDay = getMinEventCalendarDate(leadDays);
            if (eventDay < minEventDay) {
              showError(
                language === 'fr'
                  ? `Choisis une date au moins ${leadDays} jour(s) après aujourd'hui.`
                  : `Pick a date at least ${leadDays} day(s) from today.`
              );
              return;
            }
          }
        }
      } catch (e) {
        console.warn('Erreur vérification date passée côté app:', e);
      }
  
      const extras = formData.extraTicketTiers || [];
      let ticketTiersPayload = null;
      if (extras.length > 0) {
        const basePriceNum = parseFloat(String(formData.price || '').replace(',', '.'));
        if (!Number.isFinite(basePriceNum) || basePriceNum <= 0) {
          showError(
            language === 'fr'
              ? 'Indique un « prix de la place » valide avant d\'ajouter d\'autres tarifs.'
              : 'Enter a valid ticket price before adding other tiers.'
          );
          return;
        }
        ticketTiersPayload = [
          {
            id: 'general',
            label: language === 'fr' ? 'Tarif standard' : 'General admission',
            price: basePriceNum,
          },
        ];
        const usedIds = new Set(['general']);
        for (let i = 0; i < extras.length; i++) {
          const row = extras[i] || {};
          const label = String(row.label || '').trim();
          const pNum = parseFloat(String(row.price || '').replace(',', '.'));
          let tid = String(row.id || '')
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, '')
            .slice(0, 32);
          if (!tid) tid = `tier_${i + 1}`;
          while (usedIds.has(tid)) tid = `${tid}_x`;
          usedIds.add(tid);
          if (!label || !Number.isFinite(pNum) || pNum <= 0) {
            showError(
              language === 'fr'
                ? `Autre tarif ${i + 1} : libellé et prix (nombre positif) requis.`
                : `Extra tier ${i + 1}: label and positive price required.`
            );
            return;
          }
          const entry = { id: tid, label: label.slice(0, 96), price: pNum };
          const maxStr = String(row.maxSold || '').trim();
          if (maxStr) {
            const mx = parseInt(maxStr, 10);
            if (!Number.isFinite(mx) || mx < 1) {
              showError(
                language === 'fr'
                  ? `Quota (places max) ligne ${i + 1} : entier positif ou laisser vide.`
                  : `Row ${i + 1} max quota: positive integer or leave empty.`
              );
              return;
            }
            entry.maxSold = mx;
          }
          // Phases de vente : fenêtre optionnelle par tarif (JJ/MM/AAAA)
          const saleStartIso = parseSaleDateInput(row.saleStart);
          if (saleStartIso === undefined) {
            showError(
              language === 'fr'
                ? `Tarif ${i + 1} : date de début de vente invalide (format JJ/MM/AAAA).`
                : `Tier ${i + 1}: invalid sale start date (DD/MM/YYYY).`
            );
            return;
          }
          const saleEndIso = parseSaleDateInput(row.saleEnd, { endOfDay: true });
          if (saleEndIso === undefined) {
            showError(
              language === 'fr'
                ? `Tarif ${i + 1} : date de fin de vente invalide (format JJ/MM/AAAA).`
                : `Tier ${i + 1}: invalid sale end date (DD/MM/YYYY).`
            );
            return;
          }
          if (saleStartIso && saleEndIso && saleStartIso >= saleEndIso) {
            showError(
              language === 'fr'
                ? `Tarif ${i + 1} : la fin de vente doit être après le début.`
                : `Tier ${i + 1}: sale end must be after sale start.`
            );
            return;
          }
          if (saleStartIso) entry.saleStart = saleStartIso;
          if (saleEndIso) entry.saleEnd = saleEndIso;
          ticketTiersPayload.push(entry);
        }
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
          djIds: djPayload.djIds,
          djSlotAssignments: djPayload.djSlotAssignments,
          price: formData.price ? parseFloat(formData.price) : 0,
          durationHours: formData.durationHours ? parseFloat(formData.durationHours) : null,
          capacity: formData.capacity ? parseInt(formData.capacity) : 100,
          genre: formData.genre ? formData.genre.trim() : 'Mixed',
          description: formData.description ? formData.description.trim() : null,
          ...(formData.equipmentRentalEnabled
            ? {
                equipmentRental: {
                  enabled: true,
                  presetIds: formData.equipmentRentalPresetIds || [],
                  organizerLines: formData.equipmentRentalOrganizerLines || [],
                  notes: (formData.equipmentRentalNotes || '').trim() || undefined,
                },
              }
            : {}),
          ...(ticketTiersPayload ? { ticketTiers: ticketTiersPayload } : {}),
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
  
        const createdTitle = formData.title.trim();
        const localCover = coverImageUri;
        const newEventId = response.event?.id;
  
        // Création réussie : toujours supprimer le brouillon local (ne pas le rouvrir au prochain accès).
        try {
          await AsyncStorage.removeItem(EVENT_CREATION_DRAFT_KEY);
          await AsyncStorage.removeItem('@nox_booker_event_creation_draft_v1');
        } catch (e) {
          /* ignore */
        }
  
        if (localCover && newEventId && user?.token) {
          try {
            await api.uploadEventImage(user.token, newEventId, localCover);
          } catch (upErr) {
            console.warn('[BookerEvent] upload cover after create', upErr);
          }
        }
  
        resetForm();
        setCurrentStep(1);
        hasInitializedSlots.current = false;
        setPostCreateModal({ eventId: newEventId || null, title: createdTitle });
      } catch (error) {
        console.error('Erreur création événement:', error);
        showError(error.message || (language === 'fr' ? 'Erreur lors de la création de l\'événement.' : 'Error creating event.'));
      } finally {
        setCreating(false);
      }
    };
  
    const selectedVenue = venues.find((v) => v.id === formData.venueId);

  return {
    availableDjs,
    venues,
    loadingDjs,
    loadingVenues,
    creating,
    draftGate,
    postCreateModal,
    setPostCreateModal,
    currentStep,
    setCurrentStep,
    eventDateTime,
    setEventDateTime,
    djSlots,
    setDjSlots,
    slotTimePicker,
    setSlotTimePicker,
    tempSlotTime,
    setTempSlotTime,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    ...rental,
    openDatePicker,
    openTimePicker,
    openSlotTimeField,
    updateSlotTimeFromPicker,
    handleChange,
    pickCoverImage,
    clearDraftAndRestartWizard,
    flushDraftNow,
    handleCreateEvent,
    selectedVenue,
    fetchAvailableDjs,
    fetchVenues,
    hasBookerEventTitle,
    hasBookerEventPrice,
    formData,
    coverImageUri,
    setCoverImageUri,
    navigate,
  };
}
