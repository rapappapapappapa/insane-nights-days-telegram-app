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

module.exports = { parseHmClock, djSlotFitsEventWindow };
