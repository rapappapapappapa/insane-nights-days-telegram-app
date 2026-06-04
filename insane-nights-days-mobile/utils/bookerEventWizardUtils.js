export const EVENT_CREATION_DRAFT_KEY = '@nox_booker_event_creation_draft_v1';
export const DRAFT_VERSION = 1;

/** Aligné avec EVENT_MIN_LEAD_DAYS côté serveur. 0 = désactiver (EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS=0). */
export function getEventMinLeadDaysFromEnv() {
  const raw = process.env.EXPO_PUBLIC_EVENT_MIN_LEAD_DAYS;
  if (raw === '0') return 0;
  const n = parseInt(String(raw ?? '7'), 10);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

export function getMinEventCalendarDate(leadDays) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const min = new Date(today);
  min.setDate(min.getDate() + leadDays);
  return min;
}

/** Titre saisi (évite !title qui rate les espaces). */
export function hasBookerEventTitle(formData) {
  return formData?.title != null && String(formData.title).trim().length > 0;
}

/**
 * Prix billetterie saisi : 0 € est valide.
 * Bug évité : `!formData.price` désactivait le bouton quand price était le nombre 0 (ex. brouillon JSON).
 */
export function hasBookerEventPrice(formData) {
  const p = formData?.price;
  if (p === '' || p == null) return false;
  if (typeof p === 'number') return !Number.isNaN(p);
  const t = String(p).trim();
  if (t === '') return false;
  return !Number.isNaN(parseFloat(t.replace(',', '.')));
}

export function stepRequirementsHint(step, lang) {
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

/** Reconstruit les créneaux depuis le contexte (survit au démontage navigation selectDj → profil DJ). */
export function buildDjSlotsFromFormData(fd) {
  const ids = fd?.djIds || [];
  if (!ids.length) return [emptyDjSlot()];
  const assigns = fd?.djSlotAssignments || [];
  return [
    ...ids.map((id, i) => ({
      djId: id,
      slotStart: assigns[i]?.slotStart || '',
      slotEnd: assigns[i]?.slotEnd || '',
    })),
    emptyDjSlot(),
  ];
}

/** Évite d'écraser les DJs déjà choisis quand le state local repart à vide au remontage. */
export function mergeDjSlotsWithForm(prev, fd) {
  const formIds = fd?.djIds || [];
  if (!formIds.length) {
    return prev.length ? prev : [emptyDjSlot()];
  }
  const prevFilled = prev.filter((s) => s.djId).map((s) => s.djId);
  const aligned =
    formIds.length === prevFilled.length && formIds.every((id, i) => prevFilled[i] === id);
  if (aligned && prev.length >= formIds.length) {
    return prev.map((s) => ({ ...s }));
  }
  return buildDjSlotsFromFormData(fd);
}

/**
 * Premier rendu du wizard : si on revient depuis la sélection lieu/DJ, éviter l’étape 1
 * (state local repart à 1 au remontage de l’écran ; le brouillon « Reprendre » peut aussi
 * réappliquer un currentStep obsolète).
 */
export function getInitialStepFromRouteParams(routeParams) {
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
export function parseResumeStepFromParams(p) {
  const raw = p?.resumeStep;
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

/** Si les routeParams ne sont pas encore fiables au 1er rendu, reprendre l’étape persistée dans EventFormContext. */
export function getMergedInitialBookerWizardStep(routeParams, ctxStep) {
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

/** Retour depuis profil lieu/DJ : ne pas réappliquer le JSON AsyncStorage (écraserait la sélection en cours). */
export function isReturnFromVenueOrDjPicker(rp) {
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

export function parseHM(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59 || h < 0 || mi < 0) return null;
  return h * 60 + mi;
}

export function formatHM(mins) {
  const m = Math.round(mins);
  const h24 = Math.floor(m / 60) % 24;
  const mi = m % 60;
  return `${String(h24).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

export function applyEqualDjSlotTimes(slots, timeStr, durationH) {
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
export function slotFitsEventWindow(slotStart, slotEnd, eventTimeStr, durationH) {
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

/** Résumé texte location matériel (récap wizard). */
export function summarizeEquipmentRentalBlurb(formData, rentalPresets, language) {
  if (!formData?.equipmentRentalEnabled) return null;
  const parts = [];
  (formData.equipmentRentalPresetIds || []).forEach((id) => {
    const p = rentalPresets.find((x) => x.id === id);
    if (p?.label) parts.push(p.label);
  });
  (formData.equipmentRentalOrganizerLines || []).forEach((l) => {
    if (l?.label) parts.push(`${l.label} ×${l.qty || 1}`);
  });
  const notes = (formData.equipmentRentalNotes || '').trim();
  if (parts.length === 0 && !notes) {
    return language === 'fr'
      ? 'Option activée — ajoute des articles NOX ou ton matériel.'
      : 'Enabled — add NOX presets or your gear.';
  }
  let s = parts.join(' · ');
  if (notes) {
    s += (s ? ' — ' : '') + (language === 'fr' ? `Note : ${notes}` : `Note: ${notes}`);
  }
  return s;
}