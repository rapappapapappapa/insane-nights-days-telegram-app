import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  emptyDjSlot,
  assignDjToSlotAtIndex,
  applyEqualDjSlotTimes,
  syncDjSlotsToFormData,
} from '../utils/bookerEventWizardUtils';

const EventFormContext = createContext();

function parseDurationHours(raw) {
  const dur = parseFloat(raw);
  return Number.isFinite(dur) && dur > 0 ? dur : null;
}

export function EventFormProvider({ children }) {
  const [coverImageUri, setCoverImageUri] = useState(null);
  const [bookerEventWizardStep, setBookerEventWizardStep] = useState(1);

  const [formData, setFormData] = useState({
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

  const [eventDateTime, setEventDateTime] = useState(new Date());
  const [djSlots, setDjSlotsRaw] = useState(() => [emptyDjSlot()]);

  const setDjSlots = useCallback((updater) => {
    setDjSlotsRaw((prev) => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  /** formData suit djSlots après commit (évite setState imbriqué dans l'updater). */
  useEffect(() => {
    syncDjSlotsToFormData(setFormData, djSlots);
  }, [djSlots]);

  /** Assignation directe depuis le modal étape 3 — source de vérité unique. */
  const assignDjToWizardSlot = useCallback((slotIndex, djUserId, intent, timeStr, durationHours) => {
    if (!djUserId || slotIndex == null || slotIndex < 0) return;
    const durOk = parseDurationHours(durationHours);
    setDjSlotsRaw((prev) => {
      const assigned = assignDjToSlotAtIndex(prev, slotIndex, djUserId, intent);
      return applyEqualDjSlotTimes(assigned, timeStr, durOk);
    });
  }, []);

  const appendWizardDjSlot = useCallback(() => {
    setDjSlotsRaw((prev) => [...prev, emptyDjSlot()]);
  }, []);

  const removeWizardDjSlotAt = useCallback((index, timeStr, durationHours) => {
    const durOk = parseDurationHours(durationHours);
    setDjSlotsRaw((prev) => {
      let next = prev.filter((_, i) => i !== index);
      if (next.length === 0) next = [emptyDjSlot()];
      return applyEqualDjSlotTimes(next, timeStr, durOk);
    });
  }, []);

  const clearWizardDjSlotAt = useCallback((index, timeStr, durationHours) => {
    const durOk = parseDurationHours(durationHours);
    setDjSlotsRaw((prev) => {
      if (!prev[index]) return prev;
      const next = prev.map((s, i) => (i === index ? emptyDjSlot() : { ...s }));
      return applyEqualDjSlotTimes(next, timeStr, durOk);
    });
  }, []);

  const addDj = useCallback((djId) => {
    setFormData((prev) => {
      if (prev.djIds.includes(djId)) return prev;
      return {
        ...prev,
        djIds: [...prev.djIds, djId],
        djSlotAssignments: [...(prev.djSlotAssignments || []), { slotStart: '', slotEnd: '' }],
      };
    });
  }, []);

  const removeDj = useCallback((djId) => {
    setFormData((prev) => {
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
    setFormData((prev) => ({ ...prev, venueId }));
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
        assignDjToWizardSlot,
        appendWizardDjSlot,
        removeWizardDjSlotAt,
        clearWizardDjSlotAt,
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
