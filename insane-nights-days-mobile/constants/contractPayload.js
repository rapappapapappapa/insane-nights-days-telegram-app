/**
 * Champs du contractPayload (JSON) alignés avec server/utils/contractPdf.js
 */

export const DEAL_TYPE_OPTIONS = [
  { value: 'fixed_rent', labelFr: 'Location fixe', labelEn: 'Fixed rent' },
  { value: 'bar_only', labelFr: 'Lieu garde le bar (sans loyer)', labelEn: 'Bar kept by venue (no rent)' },
  { value: 'revenue_split', labelFr: 'Partage des recettes', labelEn: 'Revenue split' },
  { value: 'rent_plus_split', labelFr: 'Loyer + partage', labelEn: 'Rent + split' },
  { value: 'minimum_guarantee', labelFr: 'Minimum garanti', labelEn: 'Minimum guarantee' },
  { value: 'custom', labelFr: 'Accord personnalisé', labelEn: 'Custom agreement' },
];

/** Clés stockées dans contractPayload.cancellation — libellés pour l’UI et le PDF */
export const CANCELLATION_POLICY_OPTIONS = [
  {
    value: 'free_j30',
    labelFr: 'Au moins 30 jours avant l’événement : annulation sans frais',
    labelEn: '30+ days before the event: free cancellation',
  },
  {
    value: 'free_j14',
    labelFr: 'Au moins 14 jours avant : annulation sans frais',
    labelEn: '14+ days before: free cancellation',
  },
  {
    value: 'free_j7',
    labelFr: 'Au moins 7 jours avant : annulation sans frais',
    labelEn: '7+ days before: free cancellation',
  },
  {
    value: 'fee50_between_j7_j14',
    labelFr: 'Entre 7 et 14 jours avant : 50 % du montant dû',
    labelEn: '7–14 days before: 50% of the fee due',
  },
  {
    value: 'fee50_under_j7',
    labelFr: 'Moins de 7 jours avant : 50 % du montant dû',
    labelEn: 'Less than 7 days before: 50% of the fee due',
  },
  {
    value: 'fee100_under_j7',
    labelFr: 'Moins de 7 jours avant : 100 % du montant dû',
    labelEn: 'Less than 7 days before: 100% of the fee due',
  },
  {
    value: 'fee100_under_j3',
    labelFr: 'Moins de 3 jours avant : 100 % du montant dû',
    labelEn: 'Less than 3 days before: 100% of the fee due',
  },
];

export const EMPTY_CONTRACT_DRAFT = {
  priceEur: '',
  depositPercent: '',
  paymentTerms: '',
  cancellation: '',
  notes: '',
  dealType: 'fixed_rent',
  eventEnd: '',
  equipmentVenue: '',
  equipmentOrganizer: '',
  splitBarOrg: '',
  splitBarVenue: '',
  splitTicketOrg: '',
  splitTicketVenue: '',
  minimumGuarantee: '',
  splitTerms: '',
  customTerms: '',
  financialClause: '',
  equipment: '',
};

function parseOptionalNumber(str) {
  if (str == null || String(str).trim() === '') return null;
  const n = Number(String(str).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
}

/**
 * @param {object} p — payload API
 * @param {'venue' | 'dj'} mode
 */
export function draftFromPayload(p = {}, mode) {
  const base = {
    priceEur: p.priceEur != null ? String(p.priceEur) : '',
    depositPercent: p.depositPercent != null ? String(p.depositPercent) : '',
    paymentTerms: p.paymentTerms ? String(p.paymentTerms) : '',
    cancellation: p.cancellation ? String(p.cancellation) : '',
    notes: p.notes ? String(p.notes) : '',
  };
  if (mode === 'venue') {
    return {
      ...EMPTY_CONTRACT_DRAFT,
      ...base,
      dealType: p.dealType || p.deal_type || 'fixed_rent',
      eventEnd: p.eventEnd != null ? String(p.eventEnd) : '',
      equipmentVenue: p.equipmentVenue != null ? String(p.equipmentVenue) : p.equipment_venue != null ? String(p.equipment_venue) : '',
      equipmentOrganizer:
        p.equipmentOrganizer != null ? String(p.equipmentOrganizer) : p.equipment_organizer != null ? String(p.equipment_organizer) : '',
      splitBarOrg: p.splitBarOrg != null ? String(p.splitBarOrg) : p.split_bar_org != null ? String(p.split_bar_org) : '',
      splitBarVenue: p.splitBarVenue != null ? String(p.splitBarVenue) : p.split_bar_venue != null ? String(p.split_bar_venue) : '',
      splitTicketOrg: p.splitTicketOrg != null ? String(p.splitTicketOrg) : p.split_ticket_org != null ? String(p.split_ticket_org) : '',
      splitTicketVenue:
        p.splitTicketVenue != null ? String(p.splitTicketVenue) : p.split_ticket_venue != null ? String(p.split_ticket_venue) : '',
      minimumGuarantee:
        p.minimumGuarantee != null ? String(p.minimumGuarantee) : p.minimum_guarantee != null ? String(p.minimum_guarantee) : '',
      splitTerms: p.splitTerms != null ? String(p.splitTerms) : p.split_terms != null ? String(p.split_terms) : '',
      customTerms: p.customTerms != null ? String(p.customTerms) : p.custom_terms != null ? String(p.custom_terms) : '',
      financialClause: p.financialClause != null ? String(p.financialClause) : '',
    };
  }
  return {
    ...EMPTY_CONTRACT_DRAFT,
    ...base,
    eventEnd: p.eventEnd != null ? String(p.eventEnd) : '',
    equipment: p.equipment != null ? String(p.equipment) : '',
  };
}

/** Payload lieu pour API draft / contre-proposition */
export function buildVenueContractPayload(draft) {
  return {
    priceEur: parseOptionalNumber(draft.priceEur),
    depositPercent: parseOptionalNumber(draft.depositPercent),
    paymentTerms: draft.paymentTerms?.trim() || null,
    cancellation: draft.cancellation?.trim() || null,
    notes: draft.notes?.trim() || null,
    dealType: draft.dealType || 'fixed_rent',
    eventEnd: draft.eventEnd?.trim() || null,
    equipmentVenue: draft.equipmentVenue?.trim() || null,
    equipmentOrganizer: draft.equipmentOrganizer?.trim() || null,
    splitBarOrg: parseOptionalNumber(draft.splitBarOrg),
    splitBarVenue: parseOptionalNumber(draft.splitBarVenue),
    splitTicketOrg: parseOptionalNumber(draft.splitTicketOrg),
    splitTicketVenue: parseOptionalNumber(draft.splitTicketVenue),
    minimumGuarantee: parseOptionalNumber(draft.minimumGuarantee),
    splitTerms: draft.splitTerms?.trim() || null,
    customTerms: draft.customTerms?.trim() || null,
    financialClause: draft.financialClause?.trim() || null,
  };
}

/** Payload DJ pour API */
export function buildDjContractPayload(draft) {
  return {
    priceEur: parseOptionalNumber(draft.priceEur),
    depositPercent: parseOptionalNumber(draft.depositPercent),
    paymentTerms: draft.paymentTerms?.trim() || null,
    cancellation: draft.cancellation?.trim() || null,
    notes: draft.notes?.trim() || null,
    eventEnd: draft.eventEnd?.trim() || null,
    equipment: draft.equipment?.trim() || null,
  };
}

export function dealTypeLabel(value, lang) {
  const o = DEAL_TYPE_OPTIONS.find((x) => x.value === value);
  if (!o) return value || '';
  return lang === 'fr' ? o.labelFr : o.labelEn;
}

/** Libellé annulation (clé prédéfinie ou texte ancien contrat). */
export function cancellationPolicyLabel(value, lang) {
  if (value == null || String(value).trim() === '') return '';
  const k = String(value).trim();
  const o = CANCELLATION_POLICY_OPTIONS.find((x) => x.value === k);
  if (o) return lang === 'fr' ? o.labelFr : o.labelEn;
  return k;
}

function parseTimeToMinutes(str) {
  if (str == null || String(str).trim() === '') return null;
  const t = String(str).trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function formatMinutesToClock(totalMinutes) {
  const m = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Créneaux d’heure de fin entre le début de soirée et la fin (durée événement), pas 30 min.
 */
export function buildEventEndTimeOptions(eventTime, durationHours, stepMinutes = 30) {
  const start = parseTimeToMinutes(eventTime);
  const dur = Number(durationHours);
  if (start == null || !Number.isFinite(dur) || dur <= 0) return [];
  const endMin = start + dur * 60;
  const out = [];
  const step = Math.max(5, stepMinutes);
  for (let t = start + step; t <= endMin; t += step) {
    const label = formatMinutesToClock(t);
    out.push({ value: label, label });
  }
  const lastLabel = formatMinutesToClock(endMin);
  if (out.length === 0 || out[out.length - 1].value !== lastLabel) {
    if (!out.some((o) => o.value === lastLabel)) {
      out.push({ value: lastLabel, label: lastLabel });
    }
  }
  return out;
}

/** Résumé début → fin (durée) pour l’éditeur de contrat. */
export function formatEventWindowHint(eventTime, durationHours, lang) {
  if (!eventTime || durationHours == null || !Number.isFinite(Number(durationHours))) return '';
  const dur = Number(durationHours);
  if (dur <= 0) return '';
  const start = parseTimeToMinutes(eventTime);
  if (start == null) return '';
  const endMin = start + dur * 60;
  const end = formatMinutesToClock(endMin);
  const startFmt = formatMinutesToClock(start);
  return lang === 'fr'
    ? `Soirée : ${startFmt} → ${end} (${dur} h)`
    : `Event: ${startFmt} → ${end} (${dur} h)`;
}

/** Engagement affiché après lecture du PDF, avant « Accepter » (bonne foi, distinct d’une signature manuscrite). */
export function contractAcceptAckLabel(lang) {
  return lang === 'fr'
    ? "J’ai consulté le PDF ci-dessus : je confirme avoir lu ce contrat et l’accepter de bonne foi."
    : 'I have reviewed the PDF above: I confirm I have read this contract and accept it in good faith.';
}

/** Organisateur — brouillon : confirmation de lecture avant envoi au DJ / au lieu. */
export function contractReadBeforeSendLabel(lang) {
  return lang === 'fr'
    ? "J’ai consulté le PDF : je confirme avoir lu ce contrat tel qu’il sera envoyé."
    : 'I have reviewed the PDF: I confirm I have read this contract as it will be sent.';
}
