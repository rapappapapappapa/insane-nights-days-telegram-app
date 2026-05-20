/**
 * Location de matériel : presets plateforme + lignes organisateur (événement / catalogue booker).
 */

const PRESET_ITEMS = [
  { id: 'nox_pa_compact', labelFr: 'Sonorisation PA compacte', labelEn: 'Compact PA system', category: 'son' },
  { id: 'nox_micro_rf', labelFr: 'Micros sans fil (×2)', labelEn: 'Wireless microphones (×2)', category: 'son' },
  { id: 'nox_caisson', labelFr: 'Caisson de basses', labelEn: 'Subwoofer', category: 'son' },
  { id: 'nox_console_dj', labelFr: 'Console DJ / table de mix', labelEn: 'DJ mixer deck', category: 'son' },
  { id: 'nox_led_bar', labelFr: 'Éclairage LED (barres / wash)', labelEn: 'LED lighting (bars / wash)', category: 'lumiere' },
  { id: 'nox_machine_brouillard', labelFr: 'Machine à brouillard', labelEn: 'Fog machine', category: 'effets' },
  { id: 'nox_ecran_led', labelFr: 'Écran / backdrop LED', labelEn: 'LED screen / backdrop', category: 'video' },
  { id: 'nox_structure_truss', labelFr: 'Structure légère / truss', labelEn: 'Light truss structure', category: 'structure' },
  { id: 'nox_cables_multipaires', labelFr: 'Multipaires / câbles scène', labelEn: 'Stage cabling / multicores', category: 'accessoire' },
];

const PRESET_IDS = new Set(PRESET_ITEMS.map((p) => p.id));

function presetLabel(p, lang) {
  return lang === 'en' ? p.labelEn : p.labelFr;
}

function presetsForApi(lang) {
  const l = lang === 'en' ? 'en' : 'fr';
  return PRESET_ITEMS.map((p) => ({
    id: p.id,
    label: presetLabel(p, l),
    category: p.category,
  }));
}

function normalizeOrganizerLines(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const label = String(row.label ?? '').trim().slice(0, 140);
    if (!label) continue;
    let qty = row.qty != null ? parseInt(String(row.qty), 10) : 1;
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    const key = `${label.toLowerCase()}|${qty}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label, qty });
    if (out.length >= 40) break;
  }
  return out;
}

/**
 * Corps API événement : { enabled, presetIds?, organizerLines?, notes? }
 * Retourne null si désactivé ou vide strict.
 */
function normalizeEquipmentRentalForStorage(body) {
  if (body === undefined || body === null) return null;
  if (typeof body !== 'object' || Array.isArray(body)) return null;
  const enabled = Boolean(body.enabled);
  if (!enabled) return null;

  const presetIds = Array.isArray(body.presetIds)
    ? [...new Set(body.presetIds.map((id) => String(id)).filter((id) => PRESET_IDS.has(id)))]
    : [];

  const organizerLines = normalizeOrganizerLines(body.organizerLines);

  let notes = body.notes != null ? String(body.notes).trim().slice(0, 600) : '';
  notes = notes || undefined;

  if (presetIds.length === 0 && organizerLines.length === 0 && !notes) {
    return null;
  }

  return {
    enabled: true,
    presetIds,
    organizerLines,
    ...(notes ? { notes } : {}),
    snapshotAt: new Date().toISOString(),
  };
}

/** Catalogue booker persisté : [{ id?, label, qty }] */
function normalizeBookerRentalInventory(raw) {
  if (raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const out = [];
  const seen = new Set();
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const label = String(row.label ?? '').trim().slice(0, 140);
    if (!label) continue;
    let qty = row.qty != null ? parseInt(String(row.qty), 10) : 1;
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    if (qty > 999) qty = 999;
    let id = row.id != null ? String(row.id).trim().slice(0, 80) : '';
    if (!id) id = `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const key = `${label.toLowerCase()}|${qty}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, label, qty });
    if (out.length >= 50) break;
  }
  return out;
}

module.exports = {
  PRESET_ITEMS,
  presetsForApi,
  normalizeEquipmentRentalForStorage,
  normalizeBookerRentalInventory,
};
