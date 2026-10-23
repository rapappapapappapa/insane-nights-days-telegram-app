/** Parse "HH:mm" → minutes depuis minuit (0–1439). */
function parseHmClock(str) {
  if (!str || typeof str !== 'string') return null;
  const m = str.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mi = parseInt(m[2], 10);
  if (h > 23 || mi > 59 || h < 0 || mi < 0) return null;
  return h * 60 + mi;
}

/** Vérifie qu'un créneau [slotStart, slotEnd] est dans [heure événement, +durée] (gestion après minuit). */
function djSlotFitsEventWindow(slotStart, slotEnd, eventTimeStr, durationHoursNum) {
  const evS = parseHmClock(eventTimeStr);
  if (evS == null) return { ok: false, message: 'Heure événement invalide.' };
  if (!Number.isFinite(durationHoursNum) || durationHoursNum <= 0) return { ok: true };
  const evE = evS + durationHoursNum * 60;
  let s = parseHmClock(slotStart);
  let e = parseHmClock(slotEnd);
  if (s == null || e == null) return { ok: false, message: 'Créneau DJ invalide (utilisez HH:mm).' };
  while (e < s) e += 24 * 60;
  if (s < evS) s += 24 * 60;
  if (e < s) e += 24 * 60;
  if (s >= evS && e <= evE && e > s) return { ok: true };
  return { ok: false, message: "Un créneau DJ dépasse l'horaire ou la durée de l'événement." };
}

/**
 * Minutes depuis le début de l'événement pour un créneau « HH:mm » (après minuit = jour suivant).
 * Retourne null si le format est invalide.
 */
function slotOffsetsFromEventStart(slotStart, slotEnd, eventTimeStr) {
  const evS = parseHmClock(eventTimeStr);
  let s = parseHmClock(slotStart);
  let e = parseHmClock(slotEnd);
  if (evS == null || s == null || e == null) return null;
  if (s < evS) s += 24 * 60;
  while (e <= s) e += 24 * 60;
  return { start: s - evS, end: e - evS };
}

/**
 * Valide les créneaux des lieux d'un parcours : format, fenêtre de l'événement, ordre, pas de chevauchement.
 * `venues` : [{ slotStart, slotEnd }] dans l'ordre du parcours. Un seul lieu peut n'avoir aucun créneau.
 */
function validateVenueItinerary(venues, eventTimeStr, durationHoursNum) {
  if (!Array.isArray(venues) || venues.length === 0) {
    return { ok: false, message: 'Au moins un lieu est requis.' };
  }
  if (venues.length === 1) {
    const only = venues[0];
    const ss = only.slotStart ? String(only.slotStart).trim() : '';
    const se = only.slotEnd ? String(only.slotEnd).trim() : '';
    if (!ss && !se) return { ok: true };
  }
  let previousEnd = -1;
  for (let i = 0; i < venues.length; i++) {
    const ss = venues[i].slotStart ? String(venues[i].slotStart).trim() : '';
    const se = venues[i].slotEnd ? String(venues[i].slotEnd).trim() : '';
    if (!ss || !se) {
      return { ok: false, message: 'Chaque lieu du parcours doit avoir une heure de début et de fin (HH:mm).' };
    }
    const fit = djSlotFitsEventWindow(ss, se, eventTimeStr, durationHoursNum);
    if (!fit.ok) {
      return { ok: false, message: "Le créneau d'un lieu dépasse l'horaire ou la durée de l'événement." };
    }
    const range = slotOffsetsFromEventStart(ss, se, eventTimeStr);
    if (!range) return { ok: false, message: 'Créneau de lieu invalide (utilisez HH:mm).' };
    if (range.start < previousEnd) {
      return { ok: false, message: 'Les créneaux des lieux se chevauchent ou ne sont pas dans l’ordre.' };
    }
    previousEnd = range.end;
  }
  return { ok: true };
}

module.exports = { parseHmClock, djSlotFitsEventWindow, slotOffsetsFromEventStart, validateVenueItinerary };
