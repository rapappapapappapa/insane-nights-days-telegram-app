import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

/** iOS / Android uniquement — pas sur web. */
export function isDeviceCalendarExportSupported() {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/**
 * @param {string} dateStr - YYYY-MM-DD
 * @param {string} [timeStr] - HH:mm
 */
export function parseEventStartLocal(dateStr, timeStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    return new Date();
  }
  const ymd = dateStr.split('-').map((p) => parseInt(p, 10));
  const y = ymd[0];
  const m = ymd[1];
  const d = ymd[2];
  const safeY = Number.isFinite(y) ? y : new Date().getFullYear();
  const safeM = Number.isFinite(m) ? m : 1;
  const safeD = Number.isFinite(d) ? d : 1;
  const t = timeStr != null ? String(timeStr).trim() : '';
  const [thRaw, tmRaw] = t ? t.split(':') : ['0', '0'];
  const th = parseInt(thRaw, 10);
  const tm = parseInt(tmRaw, 10);
  return new Date(safeY, safeM - 1, safeD, Number.isFinite(th) ? th : 0, Number.isFinite(tm) ? tm : 0, 0, 0);
}

async function resolveWritableCalendarId() {
  try {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.id && def.allowsModifications !== false) {
      return def.id;
    }
  } catch (_) {
    /* fallback list */
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable =
    calendars.find((c) => c.allowsModifications && c.isPrimary) ||
    calendars.find((c) => c.allowsModifications);
  if (!writable?.id) {
    const err = new Error('NO_CALENDAR');
    throw err;
  }
  return writable.id;
}

/**
 * Crée un événement dans le calendrier par défaut (Google Calendar / Agenda Apple selon le compte synchro du téléphone).
 * @throws {Error} messages : PERMISSION_DENIED | NO_CALENDAR | WEB_UNSUPPORTED
 */
export async function addNoxEventToDeviceCalendar({
  title,
  date,
  time,
  durationHours,
  location,
  notes,
}) {
  if (!isDeviceCalendarExportSupported()) {
    throw new Error('WEB_UNSUPPORTED');
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('PERMISSION_DENIED');
  }

  const calendarId = await resolveWritableCalendarId();
  const startDate = parseEventStartLocal(date, time);
  const dh = Number(durationHours);
  const hours = Number.isFinite(dh) && dh > 0 ? dh : 4;
  const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000);
  let timeZone;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (_) {
    timeZone = undefined;
  }

  await Calendar.createEventAsync(calendarId, {
    title: title && String(title).trim() ? String(title).trim() : 'Nox',
    startDate,
    endDate,
    location: location && String(location).trim() ? String(location).trim() : undefined,
    notes: notes ? String(notes).slice(0, 4000) : undefined,
    ...(timeZone ? { timeZone } : {}),
  });
}
