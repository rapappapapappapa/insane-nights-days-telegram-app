import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EVENT_CREATION_DRAFT_KEY,
  DRAFT_VERSION,
  emptyDjSlot,
  getEventMinLeadDaysFromEnv,
  getMinEventCalendarDate,
  buildDjSlotsFromFormData,
  mergeDjSlotsWithForm,
  isReturnFromVenueOrDjPicker,
} from '../utils/bookerEventWizardUtils';

/**
 * Brouillon AsyncStorage du wizard création événement booker.
 */
export function useBookerEventWizardDraft({
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
}) {
  const [draftGate, setDraftGate] = useState(true);

  useEffect(() => {
    if (draftGate) return;
    const leadDays = getEventMinLeadDaysFromEnv();
    if (leadDays <= 0) return;
    setEventDateTime((prev) => {
      if (!prev || isNaN(prev.getTime())) return prev;
      const min = getMinEventCalendarDate(leadDays);
      const prevDay = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate());
      if (prevDay < min) {
        const n = new Date(min);
        n.setHours(prev.getHours());
        n.setMinutes(prev.getMinutes());
        queueMicrotask(() => setFormData((fd) => ({ ...fd, date: n.toISOString() })));
        return n;
      }
      return prev;
    });
  }, [draftGate, setEventDateTime, setFormData]);

  const applyEventDraft = useCallback(
    (d) => {
      if (!d?.formData) return;
      const rp = routeParams;
      const resumeVenue =
        rp?.selectedVenueId &&
        (rp?.action === 'select' || rp?.action === 'replaceVenue');
      const resumeDj =
        rp?.selectedDjId && (rp?.action === 'add' || rp?.action === 'remove');
      const shouldResumeFromSelection = resumeVenue || resumeDj;

      setFormData((prev) => {
        const merged = { ...d.formData };
        if (resumeVenue && rp?.selectedVenueId) {
          merged.venueId = rp.selectedVenueId;
        } else if (prev?.venueId && !merged.venueId) {
          merged.venueId = prev.venueId;
        }
        return merged;
      });
      const ed = d.eventDateTime ? new Date(d.eventDateTime) : new Date();
      if (!isNaN(ed.getTime())) {
        setEventDateTime(ed);
        setTempDate(ed);
        setTempTime(ed);
      }
      if (!shouldResumeFromSelection) {
        setCurrentStep(Math.min(5, Math.max(1, d.currentStep || 1)));
      }
      if (d.coverImageUri) setCoverImageUri(d.coverImageUri);
      else setCoverImageUri(null);
      if (Array.isArray(d.djSlots) && d.djSlots.length > 0) {
        setDjSlots(d.djSlots);
        hasInitializedSlots.current = true;
      } else if (d.formData?.djIds?.length) {
        setDjSlots(buildDjSlotsFromFormData(d.formData));
        hasInitializedSlots.current = true;
      }
    },
    [setFormData, setEventDateTime, setCoverImageUri, routeParams, setCurrentStep, setDjSlots, setTempDate, setTempTime, hasInitializedSlots]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(EVENT_CREATION_DRAFT_KEY);
        if (cancelled) return;
        if (!raw) {
          setDraftGate(false);
          return;
        }
        const d = JSON.parse(raw);
        if (!d || d.version !== DRAFT_VERSION || !d.formData) {
          setDraftGate(false);
          return;
        }
        if (isReturnFromVenueOrDjPicker(routeParams)) {
          // Restaurer la grille de créneaux (y compris vides) avant le handler routeParams
          const baseSlots =
            Array.isArray(d.djSlots) && d.djSlots.length > 0
              ? d.djSlots
              : buildDjSlotsFromFormData(d.formData);
          setDjSlots(mergeDjSlotsWithForm(baseSlots, d.formData));
          if (!cancelled) setDraftGate(false);
          return;
        }
        applyEventDraft(d);
        if (!cancelled) setDraftGate(false);
      } catch (e) {
        console.warn('[EventDraft] load', e);
        if (!cancelled) setDraftGate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeParams, applyEventDraft]);

  const persistDraft = useCallback(async () => {
    try {
      const empty =
        !formData?.title?.trim() &&
        !formData?.date &&
        !formData?.venueId &&
        (!formData?.djIds || formData.djIds.length === 0) &&
        currentStep <= 1;
      if (empty) {
        await AsyncStorage.removeItem(EVENT_CREATION_DRAFT_KEY);
        return;
      }
      const payload = {
        version: DRAFT_VERSION,
        formData,
        eventDateTime:
          eventDateTime instanceof Date && !isNaN(eventDateTime.getTime())
            ? eventDateTime.toISOString()
            : new Date().toISOString(),
        currentStep,
        djSlots,
        coverImageUri: coverImageUri || null,
      };
      await AsyncStorage.setItem(EVENT_CREATION_DRAFT_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[EventDraft] persist', e);
    }
  }, [formData, eventDateTime, currentStep, djSlots, coverImageUri]);

  useEffect(() => {
    if (draftGate) return;
    const t = setTimeout(persistDraft, 700);
    return () => clearTimeout(t);
  }, [draftGate, persistDraft]);

  const clearDraftAndRestartWizard = useCallback(async () => {
    if (creating) return;
    try {
      await AsyncStorage.removeItem(EVENT_CREATION_DRAFT_KEY);
    } catch (e) {
      /* ignore */
    }
    resetForm();
    setCurrentStep(1);
    setDjSlots([emptyDjSlot()]);
    hasInitializedSlots.current = false;
    const now = new Date();
    setTempDate(now);
    setTempTime(now);
    showSuccess(
      language === 'fr'
        ? 'Brouillon effacé. Tu peux créer un nouvel événement.'
        : 'Draft cleared. You can create a new event.'
    );
  }, [creating, resetForm, language, showSuccess, setCurrentStep, setDjSlots, hasInitializedSlots, setTempDate, setTempTime]);

  return {
    draftGate,
    clearDraftAndRestartWizard,
  };
}
