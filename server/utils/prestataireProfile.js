/**
 * Normalisation profil prestataire : genres multiples + disponibilités (aligné DJ).
 */

const MAX_GENRES = 24;
const MAX_GENRE_LEN = 80;

function normalizeGenreStrings(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    const s = String(item ?? '')
      .trim()
      .slice(0, MAX_GENRE_LEN);
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= MAX_GENRES) break;
  }
  return out;
}

const DJ_DAY_KEYS = ['M', 'Ma', 'Me', 'J', 'V', 'S', 'D'];

function normalizeAvailableDays(bodyValue) {
  if (bodyValue === undefined || bodyValue === null) return undefined;
  let obj = bodyValue;
  if (typeof obj === 'string') {
    try {
      obj = JSON.parse(obj);
    } catch {
      return undefined;
    }
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return undefined;
  const next = {};
  for (const k of DJ_DAY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      next[k] = Boolean(obj[k]);
    }
  }
  if (Object.keys(next).length === 0) return undefined;
  return JSON.stringify(next);
}

module.exports = {
  normalizeGenreStrings,
  normalizeAvailableDays,
  DJ_DAY_KEYS,
};
