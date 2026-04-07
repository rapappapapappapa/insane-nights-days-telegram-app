import React, { createContext, useContext, useState, useCallback } from 'react';

const EventFormContext = createContext();

export function EventFormProvider({ children }) {
  /** URI locale (expo-image-picker) pour la couverture ; upload après création de l’événement. */
  const [coverImageUri, setCoverImageUri] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    venueId: '',
    djIds: [],
    /// Même ordre que djIds : { slotStart, slotEnd } en « HH:mm »
    djSlotAssignments: [],
    price: '',
    durationHours: '4',
    capacity: '',
    genre: '',
    description: '',
  });

  const [eventDateTime, setEventDateTime] = useState(new Date());

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
    setFormData({
      title: '',
      date: '',
      time: '',
      venueId: '',
      djIds: [],
      djSlotAssignments: [],
      price: '',
      durationHours: '4',
      capacity: '',
      genre: '',
      description: '',
    });
    setEventDateTime(new Date());
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
        addDj,
        removeDj,
        setVenue,
        resetForm,
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

