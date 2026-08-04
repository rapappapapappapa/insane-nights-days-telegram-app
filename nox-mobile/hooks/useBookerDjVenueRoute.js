import React, { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { api } from '../api/config';

/**
 * Retour SelectDj/SelectVenue + création d'événement legacy (wizard in-page).
 */
export function useBookerDjVenueRoute({
  user,
  language,
  showError,
  showSuccess,
  routeParams,
  formData,
  setFormData,
  eventDateTime,
  setEventDateTime,
  addDj,
  removeDj,
  setVenue,
  resetForm,
  setActiveSection,
  fetchMyEvents,
}) {
  const [availableDjs, setAvailableDjs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [creating, setCreating] = useState(false);
  const [djSlots, setDjSlots] = useState([null]);
  const [currentStep, setCurrentStep] = useState(1);
  const hasInitializedSlots = useRef(false);
  const [tempDate, setTempDate] = useState(eventDateTime);
  const [tempTime, setTempTime] = useState(eventDateTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

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

  const lastProcessedParams = useRef({
    selectedDjId: null,
    selectedVenueId: null,
    action: null,
    eventId: null,
    slotIndex: null,
  });
  const currentDjId = routeParams?.selectedDjId;
  const currentVenueId = routeParams?.selectedVenueId;
  const currentAction = routeParams?.action;
  const currentEventId = routeParams?.eventId || null;
  const currentSlotIndex = routeParams?.slotIndex;

  useEffect(() => {
    const isSlotUpdate = currentSlotIndex !== undefined && currentSlotIndex !== null && !currentEventId;

    if (!isSlotUpdate) {
      const paramsKey = `${currentDjId}-${currentVenueId}-${currentAction}-${currentEventId}-${currentSlotIndex}`;
      const lastParamsKey = `${lastProcessedParams.current.selectedDjId}-${lastProcessedParams.current.selectedVenueId}-${lastProcessedParams.current.action}-${lastProcessedParams.current.eventId}-${lastProcessedParams.current.slotIndex}`;

      if (paramsKey === lastParamsKey && paramsKey !== 'null-null-null-null-null') {
        return;
      }
    }

    lastProcessedParams.current = {
      selectedDjId: currentDjId,
      selectedVenueId: currentVenueId,
      action: currentAction,
      eventId: currentEventId,
      slotIndex: currentSlotIndex,
    };

    if (currentDjId && currentAction === 'add') {
      if (currentEventId) {
        (async () => {
          try {
            if (!user?.token) return;
            const response = await api.addDjToEvent(user.token, currentEventId, currentDjId);
            if (response && response.success) {
              fetchMyEvents();
            } else {
              showError(
                response?.message ||
                  (language === 'fr'
                    ? "Impossible d'ajouter ce DJ à l'événement."
                    : 'Unable to add this DJ to the event.')
              );
            }
          } catch (error) {
            console.error('Erreur ajout DJ à un événement existant:', error);
            showError(
              language === 'fr'
                ? "Erreur lors de l'ajout du DJ à l'événement."
                : 'Error while adding DJ to event.'
            );
          }
        })();
      } else if (currentSlotIndex !== undefined && currentSlotIndex !== null) {
        setDjSlots((prev) => {
          let currentSlots = prev && prev.length > 0 ? [...prev] : null;

          if (!currentSlots || currentSlots.length === 0 || currentSlots.every((id) => id === null)) {
            if (formData.djIds.length > 0) {
              if (djSlots.length > formData.djIds.length) {
                currentSlots = [...djSlots];
                formData.djIds.forEach((djId) => {
                  const existingIndex = currentSlots.findIndex((id) => id === djId);
                  if (existingIndex === -1) {
                    const firstEmptyIndex = currentSlots.findIndex((id) => id === null);
                    if (firstEmptyIndex !== -1) {
                      currentSlots[firstEmptyIndex] = djId;
                    } else {
                      currentSlots.push(djId);
                    }
                  }
                });
              } else {
                const maxLength = Math.max(formData.djIds.length + 1, djSlots.length);
                currentSlots = [...formData.djIds];
                while (currentSlots.length < maxLength) {
                  currentSlots.push(null);
                }
              }
            } else {
              currentSlots = djSlots.length > 0 ? [...djSlots] : [null];
            }
          } else if (djSlots.length > currentSlots.length) {
            currentSlots = [...djSlots];
          }

          if (formData.djIds.length > 0) {
            const currentDjIds = currentSlots.filter((id) => id !== null);
            const missingDjIds = formData.djIds.filter((id) => !currentDjIds.includes(id));
            missingDjIds.forEach((djId) => {
              const firstEmptyIndex = currentSlots.findIndex((id) => id === null);
              if (firstEmptyIndex !== -1) {
                currentSlots[firstEmptyIndex] = djId;
              } else {
                currentSlots.push(djId);
              }
            });
          }

          while (currentSlots.length <= currentSlotIndex) {
            currentSlots.push(null);
          }

          const newSlots = [...currentSlots];
          newSlots[currentSlotIndex] = currentDjId;
          const newDjIds = newSlots.filter((id) => id !== null);
          setFormData((prevForm) => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        hasInitializedSlots.current = true;
        if (currentStep !== 3) {
          setCurrentStep(3);
        }
      } else if (currentStep >= 3) {
        setDjSlots((prev) => {
          const newSlots = [...prev];
          const emptyIndex = newSlots.findIndex((id) => id === null);
          if (emptyIndex !== -1) {
            newSlots[emptyIndex] = currentDjId;
          } else {
            newSlots.push(currentDjId);
          }
          const newDjIds = newSlots.filter((id) => id !== null);
          setFormData((prevForm) => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        setCurrentStep(3);
      } else {
        addDj(currentDjId);
        setCurrentStep(4);
      }
    } else if (currentDjId && currentAction === 'remove') {
      if (currentSlotIndex !== undefined && currentSlotIndex !== null) {
        setDjSlots((prev) => {
          const newSlots = [...prev];
          newSlots[currentSlotIndex] = null;
          const newDjIds = newSlots.filter((id) => id !== null);
          setFormData((prevForm) => ({ ...prevForm, djIds: newDjIds }));
          return newSlots;
        });
        setCurrentStep(3);
      } else {
        removeDj(currentDjId);
      }
    }

    if (currentVenueId && currentAction === 'select') {
      setVenue(currentVenueId);
      setCurrentStep(3);
    } else if (currentVenueId && currentAction === 'remove') {
      setVenue('');
    } else if (currentVenueId && currentAction === 'replaceVenue' && currentEventId) {
      (async () => {
        try {
          if (!user?.token) return;
          const response = await api.addVenueToEvent(user.token, currentEventId, currentVenueId);
          if (response?.success) {
            fetchMyEvents();
            showSuccess(language === 'fr' ? "Lieu ajouté à l'événement." : 'Venue added to event.');
          } else {
            showError(
              response?.message ||
                (language === 'fr' ? "Impossible d'ajouter ce lieu." : 'Unable to add this venue.')
            );
          }
        } catch (error) {
          console.error('Erreur ajout lieu à un événement:', error);
          showError(language === 'fr' ? "Erreur lors de l'ajout du lieu." : 'Error while adding venue.');
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDjId, currentVenueId, currentAction, currentSlotIndex, currentEventId]);

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
      showError(
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
      showError(language === 'fr' ? 'Impossible de charger les lieux.' : 'Unable to load venues.');
    } finally {
      setLoadingVenues(false);
    }
  };

  const handleCreateEvent = async () => {
    if (creating) return;

    if (!formData.title || !formData.date || !formData.time || !formData.venueId || formData.djIds.length === 0) {
      showError(
        language === 'fr'
          ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).'
          : 'Please fill in all required fields (title, date, time, venue, DJ).'
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
          showError(
            language === 'fr'
              ? 'Vous ne pouvez pas créer un événement à une date déjà passée.'
              : 'You cannot create an event on a past date.'
          );
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
        } catch (_) {
          /* garde formData.date */
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
        capacity: formData.capacity ? parseInt(formData.capacity, 10) : 100,
        genre: formData.genre ? formData.genre.trim() : 'Mixed',
        description: formData.description ? formData.description.trim() : null,
      };

      const response = await api.createEvent(user.token, eventData);

      if (!response) {
        showError(
          language === 'fr'
            ? 'Impossible de joindre le serveur. Vérifie ta connexion.'
            : 'Unable to reach server. Check your connection.'
        );
        return;
      }

      if (!response.success) {
        if (
          response.status === 409 ||
          (response.message && (response.message.includes('déjà') || response.message.includes('existe déjà')))
        ) {
          let conflictMessage =
            response.message || (language === 'fr' ? 'Conflit de réservation' : 'Booking conflict');
          if (response.conflictingEvent) {
            const conflictDate = new Date(response.conflictingEvent.date).toLocaleDateString(
              language === 'fr' ? 'fr-FR' : 'en-US',
              { day: '2-digit', month: '2-digit', year: 'numeric' }
            );
            conflictMessage += `\n\n${language === 'fr' ? 'Événement en conflit' : 'Conflicting event'}: ${response.conflictingEvent.title} (${conflictDate}${response.conflictingEvent.time ? ' à ' + response.conflictingEvent.time : ''})`;
          }
          showError(conflictMessage);
        } else {
          showError(
            response.message ||
              (language === 'fr' ? "Erreur lors de la création de l'événement." : 'Error creating event.')
          );
        }
        return;
      }

      showSuccess(
        language === 'fr' ? "L'événement a été créé avec succès." : 'The event has been created successfully.'
      );
      setTimeout(() => {
        resetForm();
        fetchMyEvents();
        setActiveSection('events');
      }, 2000);
    } catch (error) {
      console.error('Erreur création événement:', error);
      showError(
        error.message ||
          (language === 'fr' ? "Erreur lors de la création de l'événement." : 'Error creating event.')
      );
    } finally {
      setCreating(false);
    }
  };

  const selectedVenue = venues.find((v) => v.id === formData.venueId);
  const selectedDjs = availableDjs.filter((dj) => formData.djIds.includes(dj.userId));

  return {
    showDatePicker,
    setShowDatePicker,
    showTimePicker,
    setShowTimePicker,
    tempDate,
    setTempDate,
    tempTime,
    setTempTime,
    openDatePicker,
    openTimePicker,
    handleChange,
    handleCreateEvent,
    fetchVenues,
    fetchAvailableDjs,
    selectedVenue,
    selectedDjs,
  };
}
