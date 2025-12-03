import React, { createContext, useContext, useState, useCallback } from 'react';

const EventFormContext = createContext();

export function EventFormProvider({ children }) {
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    time: '',
    venueId: '',
    djIds: [],
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
        djIds: [...prev.djIds, djId]
      };
    });
  }, []);

  const removeDj = useCallback((djId) => {
    setFormData(prev => ({
      ...prev,
      djIds: prev.djIds.filter(id => id !== djId)
    }));
  }, []);

  const setVenue = useCallback((venueId) => {
    setFormData(prev => ({
      ...prev,
      venueId: venueId
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      date: '',
      time: '',
      venueId: '',
      djIds: [],
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

