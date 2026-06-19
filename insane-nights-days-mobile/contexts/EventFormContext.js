import React, { createContext, useContext, useState, useCallback } from 'react';
import { emptyDjSlot, syncDjSlotsToFormData } from '../utils/bookerEventWizardUtils';

const EventFormContext = createContext();

export function EventFormProvider({ children }) {
  /** URI locale (expo-image-picker) pour la couverture ; upload après création de l’événement. */
  const [coverImageUri, setCoverImageUri] = useState(null);

  /**
   * Étape du wizard « Créer un événement » (1–5). Persistée dans le provider pour survivre
   * au démontage de l’écran (navigation vers sélection lieu/DJ) quand routeParams ne sont pas
   * encore fiables au premier rendu.
   */
  const [bookerEventWizardStep, setBookerEventWizardStep] = useState(1);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    venueId: '',
    djIds: [],
    /// Même ordre que djIds : { slotStart, slotEnd } en « HH:mm »
    djSlotAssignments: [],
    /// Grille complète des créneaux DJ (y compris vides) — survit à la navigation vers selectDj
    djSlotsLayout: null,
    price: '',
    durationHours: '4',
    capacity: '',
    genre: '',
    description: '',
    equipmentRentalEnabled: false,
    equipmentRentalPresetIds: [],
    equipmentRentalOrganizerLines: [],
    equipmentRentalNotes: '',
    extraTicketTiers: [],
  });

  const [eventDateTime, setEventDateTime] = useState(new Date());

  /** Grille créneaux DJ (y compris vides) — survit au démontage navigation selectDj / profil DJ. */
  const [djSlots, setDjSlotsRaw] = useState(() => [emptyDjSlot()]);

  const setDjSlots = useCallback(
    (updater) => {
      setDjSlotsRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        syncDjSlotsToFormData(setFormData, next);
        return next;
      });
    },
    [setFormData]
  );

  // Fonctions helpers pour éviter les re-renders inutiles
  const addDj = useCallback((djId) => {
    setFormData(prev => {
      if (prev.djIds.includes(djId)) {
        return prev; // Pas de changement, pas de re-render
      }
      return {
        ...prev,
        djIds: [...prev.djIds, djId],
        djSlotAssignments: [
          ...(prev.djSlotAssignments || []),
          { slotStart: '', slotEnd: '' },
        ],
      };
    });
  }, []);

  const removeDj = useCallback((djId) => {
    setFormData(prev => {
      const idx = prev.djIds.indexOf(djId);
      if (idx === -1) return prev;
      return {
        ...prev,
        djIds: prev.djIds.filter((id) => id !== djId),
        djSlotAssignments: (prev.djSlotAssignments || []).filter((_, i) => i !== idx),
      };
    });
  }, []);

  const setVenue = useCallback((venueId) => {
    setFormData(prev => ({
      ...prev,
      venueId: venueId
    }));
  }, []);

  const resetForm = useCallback(() => {
    setCoverImageUri(null);
    setBookerEventWizardStep(1);
    setFormData({
      title: '',
      date: '',
      time: '',
      venueId: '',
      djIds: [],
      djSlotAssignments: [],
      djSlotsLayout: null,
      price: '',
      durationHours: '4',
      capacity: '',
      genre: '',
      description: '',
      equipmentRentalEnabled: false,
      equipmentRentalPresetIds: [],
      equipmentRentalOrganizerLines: [],
      equipmentRentalNotes: '',
      extraTicketTiers: [],
    });
    setEventDateTime(new Date());
    setDjSlotsRaw([emptyDjSlot()]);
  }, []);

  return (
    <EventFormContext.Provider
      value={{
        formData,
        setFormData,
        eventDateTime,
        setEventDateTime,
        coverImageUri,
        setCoverImageUri,
        bookerEventWizardStep,
        setBookerEventWizardStep,
        addDj,
        removeDj,
        setVenue,
        resetForm,
        djSlots,
        setDjSlots,
      }}
    >
      {children}
    </EventFormContext.Provider>
  );
}

export function useEventForm() {
  const context = useContext(EventFormContext);
  if (!context) {
    throw new Error('useEventForm must be used within EventFormProvider');
  }
  return context;
}

