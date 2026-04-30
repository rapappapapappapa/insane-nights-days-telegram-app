import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  Image,
} from 'react-native';
import Colors from '../../constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useEventForm } from '../../contexts/EventFormContext';
import { api } from '../../api/config';
import { useToast } from '../../hooks/useToast';
import Toast from '../../components/Toast';

const EVENT_CREATION_DRAFT_KEY = '@nox_booker_event_creation_draft_v1';
const DRAFT_VERSION = 1;

/** Aligné avec EVENT_MIN_LEAD_DAYS côté serveur. 0 = désactiver (EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS=0). */
function getEventMinLeadDaysFromEnv() {
  const raw = process.env.EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS;
  if (raw === '0') return 0;
  const n = parseInt(String(raw ?? '7'), 10);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

function getMinEventCalendarDate(leadDays) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const min = new Date(today);
  min.setDate(min.getDate() + leadDays);
  return min;
}

/** Titre saisi (évite !title qui rate les espaces). */
function hasBookerEventTitle(formData) {
  return formData?.title != null && String(formData.title).trim().length > 0;
}

/**
 * Prix billetterie saisi : 0 € est valide.
 * Bug évité : `!formData.price` désactivait le bouton quand price était le nombre 0 (ex. brouillon JSON).
 */
function hasBookerEventPrice(formData) {
  const p = formData?.price;
  if (p === '' || p == null) return false;
  if (typeof p === 'number') return !Number.isNaN(p);
  const t = String(p).trim();
  if (t === '') return false;
  return !Number.isNaN(parseFloat(t.replace(',', '.')));
}

function stepRequirementsHint(step, lang) {
  const fr = lang === 'fr';
  const leadDays = getEventMinLeadDaysFromEnv();
  switch (step) {
    case 1:
      if (leadDays > 0) {
        return fr
          ? `Obligatoire : date au moins ${leadDays} jour(s) après aujourd'hui, heure de début, durée (h).`
          : `Required: date at least ${leadDays} day(s) from today, start time, duration (h).`;
      }
      return fr ? 'Obligatoire : date, heure de début, durée (h).' : 'Required: date, start time, duration (h).';
    case 2:
      return fr ? 'Obligatoire : choisir un lieu pour l’événement.' : 'Required: choose a venue.';
    case 3:
      return fr
        ? 'Obligatoire : au moins un DJ ; créneau début–fin par DJ, dans la plage de l’événement.'
        : 'Required: at least one DJ; start–end slot per DJ within the event window.';
    case 4:
      return fr
        ? 'Obligatoire : titre et prix billetterie. Image de couverture et autres champs : optionnels.'
        : 'Required: title and ticket price. Cover image and other fields: optional.';
    case 5:
      return fr
        ? 'Vérifie le récapitulatif puis confirme. Les montants lieu ci-dessous sont indicatifs ; les contrats fixent les prix fermes.'
        : 'Review the summary then confirm. Venue amounts shown are indicative; contracts set final prices.';
    default:
      return '';
  }
}

const emptyDjSlot = () => ({ djId: null, slotStart: '', slotEnd: '' });

/**
 * Premier rendu du wizard : si on revient depuis la sélection lieu/DJ, éviter l’étape 1
 * (state local repart à 1 au remontage de l’écran ; le brouillon « Reprendre » peut aussi
 * réappliquer un currentStep obsolète).
 */
function getInitialStepFromRouteParams(routeParams) {
  const p = routeParams || {};
  if (
    p.selectedVenueId &&
    (p.action === 'select' || p.action === 'replaceVenue')
  ) {
    return 2;
  }
  if (p.selectedDjId && (p.action === 'add' || p.action === 'remove')) {
    return 3;
  }
  return 1;
}

/** Normalise resumeStep (nombre ou chaîne « 2 » / « 3 » selon les ponts natifs). */
function parseResumeStepFromParams(p) {
  const raw = p?.resumeStep;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

/** Si les routeParams ne sont pas encore fiables au 1er rendu, reprendre l’étape persistée dans EventFormContext. */
function getMergedInitialBookerWizardStep(routeParams, ctxStep) {
  const p = routeParams || {};
  const rs = parseResumeStepFromParams(p);
  if (rs != null) {
    return rs;
  }
  const fromRoute = getInitialStepFromRouteParams(routeParams);
  if (fromRoute > 1) return fromRoute;
  const c = ctxStep ?? 1;
  return Math.min(5, Math.max(1, c));
}

/** Retour depuis profil lieu/DJ vers le wizard (params posés par VenueProfilePage / DjProfilePage). */
function isReturnFromVenueOrDjPicker(rp) {
  if (!rp || typeof rp !== 'object') return false;
  const a = rp.action;
  if (
    rp.selectedVenueId &&
    (a === 'select' || a === 'replaceVenue' || a === 'remove')
  ) {
    return true;
  }
  if (rp.selectedDjId && (a === 'add' || a === 'remove')) {
    return true;
  }
  return false;
}

function parseHM(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59 || h < 0 || mi < 0) return null;
  return h * 60 + mi;
}

function formatHM(mins) {
  const m = Math.round(mins);
  const h24 = Math.floor(m / 60) % 24;
  const mi = m % 60;
  return `${String(h24).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

function applyEqualDjSlotTimes(slots, timeStr, durationH) {
  const evS = parseHM(timeStr);
  if (evS == null || durationH == null || Number.isNaN(durationH) || durationH <= 0) {
    return slots;
  }
  const evE = evS + durationH * 60;
  const idxs = slots.map((s, i) => (s.djId ? i : null)).filter((i) => i !== null);
  const n = idxs.length;
  if (n === 0) return slots;
  const chunk = (evE - evS) / n;
  const next = slots.map((s) => ({ ...s }));
  idxs.forEach((slotIdx, j) => {
    next[slotIdx].slotStart = formatHM(evS + chunk * j);
    next[slotIdx].slotEnd = formatHM(evS + chunk * (j + 1));
  });
  return next;
}

/** Retourne true si [slotStart, slotEnd] est inclus dans [heure début événement, début + durée] (gestion après minuit). */
function slotFitsEventWindow(slotStart, slotEnd, eventTimeStr, durationH) {
  const evS = parseHM(eventTimeStr);
  if (evS == null) return false;
  if (durationH == null || Number.isNaN(durationH) || durationH <= 0) {
    return true;
  }
  const evE = evS + durationH * 60;
  let s = parseHM(slotStart);
  let e = parseHM(slotEnd);
  if (s == null || e == null) return false;
  while (e < s) e += 24 * 60;
  if (s < evS) s += 24 * 60;
  if (e < s) e += 24 * 60;
  return s >= evS && e <= evE && e > s;
}

export default function BookerEventDashboardPage() {
  const { language } = useLanguage();
  const { navigate, goBack, routeParams } = useNavigation();
  const { user } = useAuth();
  const { toast, showError, showSuccess, hideToast } = useToast();
  const {
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
  } = useEventForm();

  const [availableDjs, setAvailableDjs] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loadingDjs, setLoadingDjs] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [creating, setCreating] = useState(false);
  /** Bloque la sauvegarde auto du brouillon tant que l’alerte « Reprendre ? » n’est pas tranchée. */
  const [draftGate, setDraftGate] = useState(true);
  /** Évite une double alerte si `routeParams` change sans remonter depuis le picker. */
  const draftResumePromptShownRef = useRef(false);
  const [postCreateModal, setPostCreateModal] = useState(null);

  // Étape actuelle du formulaire (1: Date/Durée, 2: Lieu, 3: DJs, 4: Détails, 5: Récapitulatif)
  const [currentStep, setCurrentStep] = useState(() =>
    getMergedInitialBookerWizardStep(routeParams, bookerEventWizardStep)
  );

  useEffect(() => {
    setBookerEventWizardStep(currentStep);
  }, [currentStep, setBookerEventWizardStep]);

  // Slots DJ pour la création d'événement (créneau horaire par ligne)
  const [djSlots, setDjSlots] = useState([emptyDjSlot()]);
  const [slotTimePicker, setSlotTimePicker] = useState(null);
  const [tempSlotTime, setTempSlotTime] = useState(() => new Date());
  
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

  // Initialiser les slots seulement la première fois qu'on arrive à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && !hasInitializedSlots.current) {
      if (formData.djIds.length > 0) {
        const assigns = formData.djSlotAssignments || [];
        setDjSlots([
          ...formData.djIds.map((id, i) => ({
            djId: id,
            slotStart: assigns[i]?.slotStart || '',
            slotEnd: assigns[i]?.slotEnd || '',
          })),
          emptyDjSlot(),
        ]);
      }
      hasInitializedSlots.current = true;
    } else if (currentStep !== 3) {
      hasInitializedSlots.current = false;
    }
  }, [currentStep]);

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

    // Sélection de DJ
    if (currentDjId && currentAction === 'add') {
      const dur = parseFloat(formData.durationHours);
      const durOk = Number.isFinite(dur) && dur > 0 ? dur : null;
      if (safeSlotIndex !== undefined && safeSlotIndex !== null) {
        setDjSlots((prev) => {
          const newSlots = [...prev];
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
          const newSlots = [...prev];
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
    } else if (currentDjId && currentAction === 'remove') {
      const dur = parseFloat(formData.durationHours);
      const durOk = Number.isFinite(dur) && dur > 0 ? dur : null;
      if (safeSlotIndex !== undefined && safeSlotIndex !== null) {
        setDjSlots((prev) => {
          const newSlots = [...prev];
          newSlots[safeSlotIndex] = emptyDjSlot();
          const timed = applyEqualDjSlotTimes(newSlots, formData.time, durOk);
          syncSlotsToForm(timed);
          return timed;
        });
        setCurrentStep(3);
      } else {
        removeDj(currentDjId);
      }
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
        const assigns = d.formData.djSlotAssignments || [];
        setDjSlots([
          ...d.formData.djIds.map((id, i) => ({
            djId: id,
            slotStart: assigns[i]?.slotStart || '',
            slotEnd: assigns[i]?.slotEnd || '',
          })),
          emptyDjSlot(),
        ]);
        hasInitializedSlots.current = true;
      }
    },
    [setFormData, setEventDateTime, setCoverImageUri, routeParams]
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
        // Retour sélection lieu/DJ : le wizard remonte avec des routeParams — reprendre le brouillon sans pop-up.
        if (isReturnFromVenueOrDjPicker(routeParams)) {
          applyEventDraft(d);
          draftResumePromptShownRef.current = true;
          setDraftGate(false);
          return;
        }
        if (draftResumePromptShownRef.current) {
          setDraftGate(false);
          return;
        }
        draftResumePromptShownRef.current = true;
        Alert.alert(
          language === 'fr' ? 'Brouillon' : 'Draft',
          language === 'fr'
            ? 'Une création d’événement était en cours. Que veux-tu faire ?'
            : 'An event draft was in progress. What would you like to do?',
          [
            {
              text: language === 'fr' ? 'Plus tard' : 'Later',
              style: 'cancel',
              onPress: () => setDraftGate(false),
            },
            {
              text: language === 'fr' ? 'Effacer' : 'Discard',
              style: 'destructive',
              onPress: async () => {
                try {
                  await AsyncStorage.removeItem(EVENT_CREATION_DRAFT_KEY);
                } catch (e) {
                  /* ignore */
                }
                setDraftGate(false);
              },
            },
            {
              text: language === 'fr' ? 'Reprendre' : 'Resume',
              onPress: () => {
                applyEventDraft(d);
                setDraftGate(false);
              },
            },
          ]
        );
      } catch (e) {
        console.warn('[EventDraft] load', e);
        setDraftGate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeParams, language, applyEventDraft]);

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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
        contentContainerStyle={[
          styles.scrollContent,
          Platform.OS === 'android' && { flexGrow: 1, paddingBottom: 140 },
        ]}
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
              {language === 'fr' ? 'Récap' : 'Review'}
            </Text>
          </View>
        </View>

        <Text style={styles.stepRequiredHint}>{stepRequirementsHint(currentStep, language)}</Text>

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
                  ? 'Pour chaque créneau : choisis un DJ, puis ajuste les heures dans la fenêtre (début → début + durée).'
                  : 'For each slot: pick a DJ, then adjust times within the event window (start → start + duration).'}
              </Text>

              {/* Liste des slots DJ */}
              {djSlots.map((slotRow, index) => {
                const selectedDj = slotRow.djId
                  ? availableDjs.find((dj) => dj.userId === slotRow.djId)
                  : null;
                return (
                  <View key={index} style={styles.djSlotContainer}>
                    <View style={styles.djSlotHeader}>
                      <Text style={styles.djSlotLabel}>
                        {language === 'fr' ? `Créneau ${index + 1}` : `Slot ${index + 1}`}
                      </Text>
                      {djSlots.length > 1 && (
                        <TouchableOpacity
                          style={styles.removeSlotButton}
                          onPress={() => {
                            const dur = parseFloat(formData.durationHours);
                            const durOk = Number.isFinite(dur) && dur > 0 ? dur : null;
                            let newSlots = djSlots.filter((_, i) => i !== index);
                            if (newSlots.length === 0) newSlots = [emptyDjSlot()];
                            const timed = applyEqualDjSlotTimes(newSlots, formData.time, durOk);
                            setDjSlots(timed);
                            const filled = timed.filter((s) => s.djId);
                            setFormData((prev) => ({
                              ...prev,
                              djIds: filled.map((s) => s.djId),
                              djSlotAssignments: filled.map((s) => ({
                                slotStart: s.slotStart,
                                slotEnd: s.slotEnd,
                              })),
                            }));
                          }}
                        >
                          <Text style={styles.removeSlotButtonText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() => {
                        const currentSlotDjId = slotRow.djId;
                        const otherSelectedDjIds = formData.djIds.filter(
                          (id) => id !== currentSlotDjId
                        );
                        navigate('selectDj', {
                          selectedDjIds: otherSelectedDjIds,
                          slotIndex: index,
                          isSlotMode: true,
                          returnTo: 'bookerEventDashboard',
                        });
                      }}
                    >
                      <Text style={[styles.selectButtonText, !selectedDj && styles.placeholderText]}>
                        {selectedDj
                          ? `${selectedDj.artistName} • ${language === 'fr' ? 'prix à convenir' : 'price to agree'}`
                          : language === 'fr'
                            ? 'Sélectionner un DJ'
                            : 'Select a DJ'}
                      </Text>
                      <Text style={styles.chevron}>▼</Text>
                    </TouchableOpacity>
                    {selectedDj ? (
                      <View style={styles.djSlotTimesRow}>
                        <TouchableOpacity
                          style={styles.djSlotTimeButton}
                          onPress={() => openSlotTimeField(index, 'start')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.djSlotTimeLabel}>
                            {language === 'fr' ? 'Début' : 'Start'}
                          </Text>
                          <Text style={styles.djSlotTimeValue}>
                            {slotRow.slotStart || '—'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.djSlotTimeButton}
                          onPress={() => openSlotTimeField(index, 'end')}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.djSlotTimeLabel}>
                            {language === 'fr' ? 'Fin' : 'End'}
                          </Text>
                          <Text style={styles.djSlotTimeValue}>
                            {slotRow.slotEnd || '—'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })}

              {/* Bouton pour ajouter un slot */}
              <TouchableOpacity
                style={styles.addSlotButton}
                onPress={() => {
                  setDjSlots([...djSlots, emptyDjSlot()]);
                }}
              >
                <Text style={styles.addSlotButtonText}>
                  + {language === 'fr' ? 'Ajouter un créneau DJ' : 'Add DJ slot'}
                </Text>
              </TouchableOpacity>

              {djSlots.filter((s) => s.djId).length > 0 && (
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedInfoText}>
                    ✓ {language === 'fr' ? 'DJ(s) sélectionné(s)' : 'DJ(s) selected'}:{' '}
                    {djSlots.filter((s) => s.djId).length}
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
                  style={[
                    styles.nextButton,
                    djSlots.filter((s) => s.djId).length === 0 && styles.nextButtonDisabled,
                  ]}
                  onPress={() => {
                    const filled = djSlots.filter((s) => s.djId);
                    if (filled.length > 0) {
                      setFormData((prev) => ({
                        ...prev,
                        djIds: filled.map((s) => s.djId),
                        djSlotAssignments: filled.map((s) => ({
                          slotStart: s.slotStart,
                          slotEnd: s.slotEnd,
                        })),
                      }));
                      setCurrentStep(4);
                    }
                  }}
                  disabled={djSlots.filter((s) => s.djId).length === 0}
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {language === 'fr' ? 'Image de couverture (optionnel)' : 'Cover image (optional)'}
                </Text>
                {coverImageUri ? (
                  <View style={styles.coverPreviewRow}>
                    <Image source={{ uri: coverImageUri }} style={styles.coverPreview} />
                    <TouchableOpacity
                      style={[styles.coverRemoveBtn, { marginLeft: 12 }]}
                      onPress={() => setCoverImageUri(null)}
                    >
                      <Text style={styles.coverRemoveBtnText}>
                        {language === 'fr' ? 'Retirer' : 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.selectButton} onPress={pickCoverImage}>
                    <Text style={styles.selectButtonText}>
                      {language === 'fr' ? 'Choisir une image' : 'Choose image'}
                    </Text>
                  </TouchableOpacity>
                )}
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
                  style={[
                    styles.nextButton,
                    (!hasBookerEventTitle(formData) || !hasBookerEventPrice(formData)) && styles.nextButtonDisabled,
                  ]}
                  onPress={() => {
                    if (hasBookerEventTitle(formData) && hasBookerEventPrice(formData)) {
                      setCurrentStep(5);
                    }
                  }}
                  disabled={!hasBookerEventTitle(formData) || !hasBookerEventPrice(formData)}
                >
                  <Text style={styles.nextButtonText}>
                    {language === 'fr' ? 'Suivant →' : 'Next →'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ÉTAPE 5: Récapitulatif (aucun paiement en ligne à cette étape) */}
          {currentStep === 5 && (
            <>
              <Text style={styles.sectionTitle}>
                {language === 'fr' ? 'Étape 5 : Récapitulatif' : 'Step 5: Summary'}
              </Text>
              <Text style={styles.stepDescription}>
                {language === 'fr'
                  ? 'Aucun paiement Stripe n’est demandé ici : tu confirmes la création de l’événement ; les montants définitifs passent par les contrats (chat).'
                  : 'No Stripe payment here: you confirm event creation; final amounts are set via contracts (chat).'}
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

                {formData.djIds.length > 0 && (
                  <View style={styles.summarySection}>
                    <Text style={styles.summaryLabel}>
                      {language === 'fr' ? 'DJs et créneaux' : 'DJs and time slots'}
                    </Text>
                    {formData.djIds.map((id, i) => {
                      const dj = availableDjs.find((d) => d.userId === id);
                      const a = formData.djSlotAssignments?.[i];
                      return (
                        <Text key={id} style={styles.summaryValue}>
                          • {dj?.artistName || id}
                          {a?.slotStart && a?.slotEnd
                            ? `  (${a.slotStart} – ${a.slotEnd})`
                            : ''}
                        </Text>
                      );
                    })}
                  </View>
                )}

                <View style={styles.costBreakdown}>
                  <Text style={styles.costTitle}>
                    {language === 'fr' ? 'Détail des coûts (indicatif)' : 'Cost breakdown (indicative)'}
                  </Text>
                  <Text style={styles.costDisclaimer}>
                    {language === 'fr'
                      ? 'Les montants affichés pour le lieu sont une estimation (notamment à partir de la note) — ce n’est pas un devis contractuel. Le cachet DJ et les conditions réelles sont fixés dans les contrats NOX.'
                      : 'Venue amounts shown are an estimate (including from ratings)—not a binding quote. DJ fees and final terms are set in NOX contracts.'}
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
                  disabled={creating || !hasBookerEventTitle(formData) || !hasBookerEventPrice(formData)}
                >
                  {creating ? (
                    <ActivityIndicator color={Colors.background} />
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
                  minimumDate={
                    getEventMinLeadDaysFromEnv() > 0
                      ? getMinEventCalendarDate(getEventMinLeadDaysFromEnv())
                      : undefined
                  }
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

      {/* Modal créneau DJ (iOS) */}
      {Platform.OS === 'ios' && slotTimePicker && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSlotTimePicker(null)}
        >
          <TouchableOpacity
            style={styles.datePickerModalOverlay}
            activeOpacity={1}
            onPress={() => setSlotTimePicker(null)}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={styles.datePickerModalContent}
            >
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>
                  {slotTimePicker.field === 'start'
                    ? language === 'fr'
                      ? 'Heure de début du créneau'
                      : 'Slot start time'
                    : language === 'fr'
                      ? 'Heure de fin du créneau'
                      : 'Slot end time'}
                </Text>
                <TouchableOpacity
                  style={styles.datePickerCloseButton}
                  onPress={() => setSlotTimePicker(null)}
                >
                  <Text style={styles.datePickerCloseButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={tempSlotTime}
                  mode="time"
                  is24Hour={true}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  themeVariant="light"
                  onChange={(_, t) => {
                    if (t) setTempSlotTime(t);
                  }}
                  style={styles.datePicker}
                />
              </View>
              <View style={styles.datePickerFooter}>
                <TouchableOpacity
                  style={styles.datePickerCancelButton}
                  onPress={() => setSlotTimePicker(null)}
                >
                  <Text style={styles.datePickerCancelButtonText}>
                    {language === 'fr' ? 'Annuler' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.datePickerConfirmButton}
                  onPress={() => {
                    updateSlotTimeFromPicker(slotTimePicker.index, slotTimePicker.field, tempSlotTime);
                    setSlotTimePicker(null);
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

      <Modal
        visible={!!postCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPostCreateModal(null)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalCard}>
            <Text style={styles.successModalTitle}>
              {language === 'fr' ? 'Événement créé' : 'Event created'}
            </Text>
            <Text style={styles.successModalSubtitle}>
              {postCreateModal?.title
                ? `« ${postCreateModal.title} »`
                : language === 'fr'
                  ? 'Ton événement est en ligne côté organisateur.'
                  : 'Your event is set up on the organizer side.'}
            </Text>
            <Text style={styles.successModalHint}>
              {language === 'fr'
                ? 'Prochaines étapes : utilise les chats privés (DJ, lieu) et le chat de groupe pour les invitations et les contrats NOX. Les billets utilisent le prix saisi à l’étape Détails.'
                : 'Next: use private chats (DJs, venue) and the group chat for invitations and NOX contracts. Tickets use the price from the Details step.'}
            </Text>
            <TouchableOpacity
              style={styles.successModalPrimary}
              onPress={() => {
                const id = postCreateModal?.eventId;
                setPostCreateModal(null);
                navigate('bookerDashboard', { openBookings: true, highlightEventId: id });
              }}
            >
              <Text style={styles.successModalPrimaryText}>
                {language === 'fr' ? 'Voir mes événements' : 'View my events'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successModalSecondary}
              onPress={() => {
                setPostCreateModal(null);
                goBack();
              }}
            >
              <Text style={styles.successModalSecondaryText}>
                {language === 'fr' ? 'Fermer' : 'Close'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    color: Colors.primary,
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
    backgroundColor: Colors.primary,
    color: '#fff',
  },
  stepLabel: {
    marginTop: 5,
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 5,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
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
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    color: Colors.background,
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
  stepRequiredHint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  costDisclaimer: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  coverPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverPreview: {
    width: 120,
    height: 68,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  coverRemoveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  coverRemoveBtnText: {
    color: '#FF8A80',
    fontSize: 14,
    fontWeight: '600',
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    backgroundColor: '#1a1a22',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.35)',
  },
  successModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  successModalSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    marginBottom: 12,
  },
  successModalHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  successModalPrimary: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  successModalPrimaryText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '800',
  },
  successModalSecondary: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  successModalSecondaryText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    fontWeight: '600',
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
  djSlotTimesRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  djSlotTimeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,23,68,0.25)',
  },
  djSlotTimeLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  djSlotTimeValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  addSlotButton: {
    backgroundColor: 'rgba(255,23,68,0.2)',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  addSlotButtonText: {
    color: Colors.primary,
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
    color: Colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  createButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: Colors.background,
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
    backgroundColor: Colors.primary,
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
