import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../api/config';
import {
  EVENT_CREATION_DRAFT_KEY,
  DRAFT_VERSION,
  emptyDjSlot,
  getEventMinLeadDaysFromEnv,
  getMinEventCalendarDate,
  hasBookerEventTitle,
  hasBookerEventPrice,
  buildDjSlotsFromFormData,
  mergeDjSlotsWithForm,
  getMergedInitialBookerWizardStep,
  isReturnFromVenueOrDjPicker,
  parseHM,
  applyEqualDjSlotTimes,
  slotFitsEventWindow,
} from '../utils/bookerEventWizardUtils';

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
  addDj,
  removeDj,
  setVenue,
  coverImageUri,
  setCoverImageUri,
  bookerEventWizardStep,
  setBookerEventWizardStep,
}) {
    const [availableDjs, setAvailableDjs] = useState([]);
    const [venues, setVenues] = useState([]);
    const [loadingDjs, setLoadingDjs] = useState(false);
    const [loadingVenues, setLoadingVenues] = useState(false);
    const [creating, setCreating] = useState(false);
    /** Bloque la persistance auto jusqu’à la lecture AsyncStorage (évite d’écraser le brouillon au premier rendu). */
    const [draftGate, setDraftGate] = useState(true);
    const [postCreateModal, setPostCreateModal] = useState(null);
  
    // Étape actuelle du formulaire (1: Date/Durée, 2: Lieu, 3: DJs, 4: Détails, 5: Récapitulatif)
    const [currentStep, setCurrentStep] = useState(() =>
      getMergedInitialBookerWizardStep(routeParams, bookerEventWizardStep)
    );
  
    useEffect(() => {
      setBookerEventWizardStep(currentStep);
    }, [currentStep, setBookerEventWizardStep]);
  
    // Slots DJ pour la création d'événement (créneau horaire par ligne)
    const [djSlots, setDjSlots] = useState(() => buildDjSlotsFromFormData(formData));
    const [slotTimePicker, setSlotTimePicker] = useState(null);
    const [tempSlotTime, setTempSlotTime] = useState(() => new Date());
    
    // Date & heure avec sélecteurs stylés
    const [tempDate, setTempDate] = useState(eventDateTime || new Date());
    const [tempTime, setTempTime] = useState(eventDateTime || new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
  
    const [rentalPresets, setRentalPresets] = useState([]);
    const [rentalCatalogItems, setRentalCatalogItems] = useState([]);
    const [rentalCatalogLabel, setRentalCatalogLabel] = useState('');
    const [rentalCatalogQty, setRentalCatalogQty] = useState('1');
    const [eventRentalExtraLabel, setEventRentalExtraLabel] = useState('');
    const [eventRentalExtraQty, setEventRentalExtraQty] = useState('1');
    const [savingRentalCatalog, setSavingRentalCatalog] = useState(false);
    
    // Gérer les sélections depuis routeParams
    const lastProcessedParams = useRef({ selectedDjId: null, selectedVenueId: null, action: null, slotIndex: null });
    const hasInitializedSlots = useRef(false);
    
    const currentDjId = routeParams?.selectedDjId;
    const currentVenueId = routeParams?.selectedVenueId;
    const currentAction = routeParams?.action;
    /** Android / bridge : slotIndex peut arriver en string ; 0 doit rester 0 (sinon 2e DJ écrase le 1er). */
    const rawSlot = routeParams?.slotIndex;
    const safeSlotIndex =
      rawSlot === undefined || rawSlot === null
        ? undefined
        : Number.isFinite(Number(rawSlot)) && Number(rawSlot) >= 0
          ? Math.floor(Number(rawSlot))
          : undefined;
  
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
  
    // Initialiser les slots au premier passage à l’étape 3 (jamais depuis formData périmé si retour profil DJ/lieu).
    useEffect(() => {
      if (currentStep !== 3) {
        hasInitializedSlots.current = false;
        return;
      }
      if (hasInitializedSlots.current) return;
      if (isReturnFromVenueOrDjPicker(routeParams)) {
        return;
      }
      if (formData.djIds.length > 0) {
        setDjSlots(buildDjSlotsFromFormData(formData));
      }
      hasInitializedSlots.current = true;
    }, [currentStep, formData.djIds, formData.djSlotAssignments, routeParams]);
  
    // Gérer les sélections depuis routeParams
    React.useLayoutEffect(() => {
      const isSlotUpdate = safeSlotIndex !== undefined && safeSlotIndex !== null;
      
      if (!isSlotUpdate) {
        const paramsKey = `${currentDjId}-${currentVenueId}-${currentAction}-${safeSlotIndex}`;
        const lastParamsKey = `${lastProcessedParams.current.selectedDjId}-${lastProcessedParams.current.selectedVenueId}-${lastProcessedParams.current.action}-${lastProcessedParams.current.slotIndex}`;
        
        if (paramsKey === lastParamsKey && paramsKey !== 'null-null-null-null') {
          return;
        }
      }
      
      lastProcessedParams.current = {
        selectedDjId: currentDjId,
        selectedVenueId: currentVenueId,
        action: currentAction,
        slotIndex: safeSlotIndex,
      };
      
      const syncSlotsToForm = (slotsAfter /* applyEqual déjà fait */) => {
        const filled = slotsAfter.filter((s) => s.djId);
        setFormData((prevForm) => ({
          ...prevForm,
          djIds: filled.map((s) => s.djId),
          djSlotAssignments: filled.map((s) => ({ slotStart: s.slotStart, slotEnd: s.slotEnd })),
        }));
      };
  
      let appliedDjFromRoute = false;
  
      // Sélection de DJ
      if (currentDjId && currentAction === 'add') {
        const dur = parseFloat(formData.durationHours);
        const durOk = Number.isFinite(dur) && dur > 0 ? dur : null;
        if (safeSlotIndex !== undefined && safeSlotIndex !== null) {
          setDjSlots((prev) => {
            const newSlots = mergeDjSlotsWithForm(prev, formData);
            while (newSlots.length <= safeSlotIndex) {
              newSlots.push(emptyDjSlot());
            }
            const cur = newSlots[safeSlotIndex] || emptyDjSlot();
            newSlots[safeSlotIndex] = { ...cur, djId: currentDjId };
            const timed = applyEqualDjSlotTimes(newSlots, formData.time, durOk);
            syncSlotsToForm(timed);
            return timed;
          });
          if (currentStep !== 3) {
            setCurrentStep(3);
          }
        } else if (currentStep >= 3) {
          setDjSlots((prev) => {
            const newSlots = mergeDjSlotsWithForm(prev, formData);
            const emptyIndex = newSlots.findIndex((s) => !s.djId);
            if (emptyIndex !== -1) {
              newSlots[emptyIndex] = { ...newSlots[emptyIndex], djId: currentDjId };
            } else {
              newSlots.push({ ...emptyDjSlot(), djId: currentDjId });
            }
            const timed = applyEqualDjSlotTimes(newSlots, formData.time, durOk);
            syncSlotsToForm(timed);
            return timed;
          });
          setCurrentStep(3);
        } else {
          addDj(currentDjId);
          const evS = parseHM(formData.time);
          if (evS != null && durOk != null) {
            setFormData((prev) => ({
              ...prev,
              djSlotAssignments: [
                { slotStart: formatHM(evS), slotEnd: formatHM(evS + durOk * 60) },
              ],
            }));
          }
          setCurrentStep(4);
        }
        appliedDjFromRoute = true;
      } else if (currentDjId && currentAction === 'remove') {
        const dur = parseFloat(formData.durationHours);
        const durOk = Number.isFinite(dur) && dur > 0 ? dur : null;
        if (safeSlotIndex !== undefined && safeSlotIndex !== null) {
          setDjSlots((prev) => {
            const newSlots = mergeDjSlotsWithForm(prev, formData);
            if (newSlots[safeSlotIndex]) {
              newSlots[safeSlotIndex] = emptyDjSlot();
            }
            const timed = applyEqualDjSlotTimes(newSlots, formData.time, durOk);
            syncSlotsToForm(timed);
            return timed;
          });
          setCurrentStep(3);
        } else {
          removeDj(currentDjId);
        }
        appliedDjFromRoute = true;
      }
  
      if (appliedDjFromRoute) {
        hasInitializedSlots.current = true;
      }
      
      // Sélection de lieu (replaceVenue = remplacement depuis un événement existant)
      if (
        currentVenueId &&
        (currentAction === 'select' || currentAction === 'replaceVenue')
      ) {
        setVenue(currentVenueId);
        setCurrentStep(2); // Rester sur l'étape Lieu pour voir la sélection
      } else if (currentVenueId && currentAction === 'remove') {
        setVenue('');
      }
    }, [currentDjId, currentVenueId, currentAction, safeSlotIndex, formData.time, formData.durationHours]);
  
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
  
    const toggleEquipmentPreset = (id) => {
      setFormData((prev) => {
        const cur = prev.equipmentRentalPresetIds || [];
        const has = cur.includes(id);
        return {
          ...prev,
          equipmentRentalPresetIds: has ? cur.filter((x) => x !== id) : [...cur, id],
        };
      });
    };
  
    const toggleOrganizerLineFromCatalog = (item) => {
      const label = item.label;
      const qty = item.qty || 1;
      setFormData((prev) => {
        const lines = [...(prev.equipmentRentalOrganizerLines || [])];
        const idx = lines.findIndex(
          (l) =>
            String(l.label).trim() === String(label).trim() &&
            Number(l.qty || 1) === Number(qty)
        );
        if (idx >= 0) lines.splice(idx, 1);
        else lines.push({ label: String(label).trim(), qty: Number(qty) || 1 });
        return { ...prev, equipmentRentalOrganizerLines: lines };
      });
    };
  
    const addEventOnlyEquipmentLine = () => {
      const label = eventRentalExtraLabel.trim();
      if (!label) return;
      let qty = parseInt(eventRentalExtraQty, 10);
      if (!Number.isFinite(qty) || qty < 1) qty = 1;
      setFormData((prev) => ({
        ...prev,
        equipmentRentalOrganizerLines: [...(prev.equipmentRentalOrganizerLines || []), { label, qty }],
      }));
      setEventRentalExtraLabel('');
      setEventRentalExtraQty('1');
    };
  
    const removeOrganizerLineAt = (index) => {
      setFormData((prev) => {
        const lines = [...(prev.equipmentRentalOrganizerLines || [])];
        lines.splice(index, 1);
        return { ...prev, equipmentRentalOrganizerLines: lines };
      });
    };
  
    const addCatalogRow = () => {
      const label = rentalCatalogLabel.trim();
      if (!label) return;
      let qty = parseInt(rentalCatalogQty, 10);
      if (!Number.isFinite(qty) || qty < 1) qty = 1;
      const id = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      setRentalCatalogItems((prev) => [...prev, { id, label, qty }]);
      setRentalCatalogLabel('');
      setRentalCatalogQty('1');
    };
  
    const removeCatalogRow = (rid) => {
      setRentalCatalogItems((prev) => prev.filter((x) => x.id !== rid));
    };
  
    const updateExtraTicketTier = (index, field, value) => {
      setFormData((prev) => {
        const rows = [...(prev.extraTicketTiers || [])];
        rows[index] = { ...(rows[index] || {}), [field]: value };
        return { ...prev, extraTicketTiers: rows };
      });
    };
  
    const addExtraTicketTier = () => {
      setFormData((prev) => ({
        ...prev,
        extraTicketTiers: [...(prev.extraTicketTiers || []), { label: '', price: '', maxSold: '' }],
      }));
    };
  
    const removeExtraTicketTier = (index) => {
      setFormData((prev) => ({
        ...prev,
        extraTicketTiers: (prev.extraTicketTiers || []).filter((_, i) => i !== index),
      }));
    };
  
    const saveRentalCatalogToProfile = async () => {
      if (!user?.token || savingRentalCatalog) return;
      setSavingRentalCatalog(true);
      try {
        const res = await api.saveBookerRentalInventory(user.token, rentalCatalogItems);
        if (res?.success) {
          showSuccess(language === 'fr' ? 'Catalogue matériel enregistré.' : 'Equipment catalog saved.');
        } else {
          showError(res?.message || (language === 'fr' ? 'Erreur sauvegarde.' : 'Save failed.'));
        }
      } catch (e) {
        console.error(e);
        showError(language === 'fr' ? 'Erreur réseau.' : 'Network error.');
      } finally {
        setSavingRentalCatalog(false);
      }
    };
  
    /** Après chargement du brouillon : ramener la date au minimum légal si besoin. */
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
      [setFormData, setEventDateTime, setCoverImageUri, routeParams]
    );
  
    /** Brouillon : restauration silencieuse depuis AsyncStorage (pas d’alerte). */
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
          // Retour liste / profil lieu ou DJ : le contexte + routeParams sont la source de vérité (évite d’écraser les slots).
          if (!isReturnFromVenueOrDjPicker(routeParams)) {
            applyEventDraft(d);
          }
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
  
    /** Si le lieu a une capacité max déclarée, pré-remplir le champ événement quand il est encore vide */
    useEffect(() => {
      if (!formData.venueId || !venues.length) return;
      const v = venues.find((x) => x.id === formData.venueId);
      if (!v || v.maxCapacity == null) return;
      const cur = String(formData.capacity ?? '').trim();
      if (cur !== '') return;
      setFormData((prev) => ({ ...prev, capacity: String(v.maxCapacity) }));
    }, [formData.venueId, venues, setFormData]);
  
    useEffect(() => {
      if (!user?.token || draftGate) return;
      let cancelled = false;
      (async () => {
        try {
          const lang = language === 'fr' ? 'fr' : 'en';
          const [pres, prof] = await Promise.all([
            api.getRentalEquipmentPresets(user.token, lang),
            api.getUserProfiles(user.token),
          ]);
          if (cancelled) return;
          if (pres?.success && Array.isArray(pres.presets)) setRentalPresets(pres.presets);
          const b = prof?.profiles?.booker?.[0];
          if (b?.rentalEquipmentInventory && Array.isArray(b.rentalEquipmentInventory)) {
            setRentalCatalogItems(b.rentalEquipmentInventory);
          } else {
            setRentalCatalogItems([]);
          }
        } catch (e) {
          console.warn('[BookerEventDashboard] rental presets/catalog', e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [user?.token, draftGate, language]);
  
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
          const filled = next.filter((s) => s.djId);
          setFormData((p) => ({
            ...p,
            djIds: filled.map((s) => s.djId),
            djSlotAssignments: filled.map((s) => ({ slotStart: s.slotStart, slotEnd: s.slotEnd })),
          }));
          return next;
        });
      },
      [setFormData, formData.time, formData.durationHours, showError, language]
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
  
    /** Formulaire vierge + suppression du brouillon local (sans alerte). */
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
    }, [creating, resetForm, language, showSuccess]);
  
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
  
      if (
        !hasBookerEventTitle(formData) ||
        !formData.date ||
        !formData.time ||
        !formData.venueId ||
        formData.djIds.length === 0
      ) {
        showError(language === 'fr' ? 'Veuillez remplir tous les champs requis (titre, date, heure, lieu, DJ).' : 'Please fill in all required fields (title, date, time, venue, DJ).');
        return;
      }
  
      const durCheck = parseFloat(formData.durationHours);
      const assign = formData.djSlotAssignments || [];
      for (let i = 0; i < formData.djIds.length; i++) {
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
          djIds: formData.djIds,
          djSlotAssignments: formData.djSlotAssignments || [],
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
        setDjSlots([emptyDjSlot()]);
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
    rentalPresets,
    rentalCatalogItems,
    rentalCatalogLabel,
    setRentalCatalogLabel,
    rentalCatalogQty,
    setRentalCatalogQty,
    eventRentalExtraLabel,
    setEventRentalExtraLabel,
    eventRentalExtraQty,
    setEventRentalExtraQty,
    savingRentalCatalog,
    openDatePicker,
    openTimePicker,
    openSlotTimeField,
    updateSlotTimeFromPicker,
    handleChange,
    toggleEquipmentPreset,
    toggleOrganizerLineFromCatalog,
    addEventOnlyEquipmentLine,
    removeOrganizerLineAt,
    addCatalogRow,
    removeCatalogRow,
    updateExtraTicketTier,
    addExtraTicketTier,
    removeExtraTicketTier,
    saveRentalCatalogToProfile,
    pickCoverImage,
    clearDraftAndRestartWizard,
    handleCreateEvent,
    selectedVenue,
    fetchAvailableDjs,
    fetchVenues,
    hasBookerEventTitle,
    hasBookerEventPrice,
    formData,
    coverImageUri,
    navigate,
  };
}
