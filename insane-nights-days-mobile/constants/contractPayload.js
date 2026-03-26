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
  noxFee: '',
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
      noxFee: p.noxFee != null ? String(p.noxFee) : p.nox_fee != null ? String(p.nox_fee) : '',
    };
  }
  return {
    ...EMPTY_CONTRACT_DRAFT,
    ...base,
    eventEnd: p.eventEnd != null ? String(p.eventEnd) : '',
    equipment: p.equipment != null ? String(p.equipment) : '',
    noxFee: p.noxFee != null ? String(p.noxFee) : p.nox_fee != null ? String(p.nox_fee) : '',
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
    noxFee: parseOptionalNumber(draft.noxFee),
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
    noxFee: parseOptionalNumber(draft.noxFee),
  };
}

export function dealTypeLabel(value, lang) {
  const o = DEAL_TYPE_OPTIONS.find((x) => x.value === value);
  if (!o) return value || '';
  return lang === 'fr' ? o.labelFr : o.labelEn;
}

/** Engagement affiché avant le bouton « Accepter » (acceptation de bonne foi, distincte d’une signature manuscrite). */
export function contractAcceptAckLabel(lang) {
  return lang === 'fr'
    ? "Je confirme avoir lu le contrat et l'accepter de bonne foi."
    : 'I confirm that I have read this contract and accept it in good faith.';
}
