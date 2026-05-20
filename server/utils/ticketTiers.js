/**
 * Multi-tarifs billetterie (JSON sur Event.ticketTiers).
 * Une entrée : { id, label, price, maxSold? } ; maxSold limite les ventes pour ce tarif (en plus du cap global event.capacity).
 */

const MAX_TIERS = 8;

function sanitizeId(raw, fallback) {
  const s = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 48);
  return s || fallback;
}

/**
 * Accepte tableau d'objets ou JSON string (rare).
 * Throw Error avec message français pour l'API.
 */
function normalizeTicketTiersInput(input) {
  if (input === undefined || input === null || input === '') return null;
  let arr = input;
  if (typeof arr === 'string') {
    try {
      arr = JSON.parse(arr);
    } catch {
      throw new Error('ticketTiers : JSON invalide.');
    }
  }
  if (!Array.isArray(arr)) throw new Error('ticketTiers : un tableau est requis.');
  if (arr.length === 0) return null;
  if (arr.length > MAX_TIERS) throw new Error(`Au plus ${MAX_TIERS} tarifs par événement.`);

  const seen = new Set();
  const out = [];
  arr.forEach((row, idx) => {
    if (!row || typeof row !== 'object') return;
    const label = String(row.label ?? '').trim();
    const priceRaw = row.price ?? row.priceEUR;
    const price = typeof priceRaw === 'number' ? priceRaw : parseFloat(String(priceRaw ?? '').replace(',', '.'));
    if (!label || !Number.isFinite(price) || price <= 0) {
      throw new Error(`Tarif invalide (ligne ${idx + 1}) : libellé et prix > 0 requis.`);
    }

    let id = sanitizeId(row.id, '');
    if (!id) id = `t${idx}`;
    while (seen.has(id)) id = `${id}_${idx}`;
    seen.add(id);

    let maxSold = null;
    if (row.maxSold != null && row.maxSold !== '') {
      const m = parseInt(String(row.maxSold), 10);
      if (!Number.isFinite(m) || m < 1) throw new Error(`maxSold invalide pour "${label}".`);
      maxSold = m;
    }

    out.push({
      id,
      label: label.slice(0, 96),
      price: Math.round(price * 100) / 100,
      ...(maxSold != null ? { maxSold } : {}),
    });
  });

  if (out.length === 0) throw new Error('Aucun tarif valide dans ticketTiers.');
  const ids = out.map((t) => t.id);
  if (new Set(ids).size !== ids.length) throw new Error('IDs de tarifs en doublon.');
  return out;
}

/** Lecture DB (nullable) sans throw */
function parseTicketTiersFromDb(dbValue) {
  if (dbValue == null || dbValue === '') return null;
  try {
    if (typeof dbValue === 'string') {
      const parsed = JSON.parse(dbValue);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
    }
    if (Array.isArray(dbValue) && dbValue.length > 0) return dbValue;
    return null;
  } catch {
    return null;
  }
}

/**
 * Résout le prix unitaire EUR et tierId pour un achat.
 * @returns {{ unitEuros: number, tierId: string|null, error?: string }}
 */
function resolvePurchaseTier(event, tierIdRequested) {
  const tiers = parseTicketTiersFromDb(event.ticketTiers);
  if (!tiers || tiers.length === 0) {
    const p = Number(event.price);
    if (!Number.isFinite(p) || p <= 0) return { error: 'PRICE_INVALID', unitEuros: 0, tierId: null };
    return { unitEuros: p, tierId: null };
  }

  const req = tierIdRequested != null ? String(tierIdRequested).trim() : '';

  let tier = req ? tiers.find((t) => t.id === req) : null;

  if (!tier && tiers.length === 1) {
    tier = tiers[0];
  }

  if (!tier) {
    if (!req && tiers.length > 1) {
      return { error: 'TIER_REQUIRED', unitEuros: 0, tierId: null };
    }
    return { error: 'INVALID_TIER', unitEuros: 0, tierId: null };
  }

  const unit = Number(tier.price);
  if (!Number.isFinite(unit) || unit <= 0) return { error: 'TIER_PRICE_INVALID', unitEuros: 0, tierId: null };

  return { unitEuros: unit, tierId: tier.id };
}

/** Pour l'API publique événement (détail) — pas de données sensibles */
function enrichTiersWithSold(eventId, prismaOrTx, tiers) {
  if (!tiers || tiers.length === 0) return Promise.resolve([]);
  return Promise.all(
    tiers.map(async (t) => {
      const sold = await prismaOrTx.ticket.count({
        where: { eventId, tierId: t.id, status: 'valid' },
      });
      const maxSold = t.maxSold != null && Number.isFinite(Number(t.maxSold)) ? Number(t.maxSold) : null;
      return {
        id: t.id,
        label: t.label,
        price: t.price,
        sold,
        ...(maxSold != null ? { maxSold, remaining: Math.max(0, maxSold - sold) } : {}),
      };
    }),
  );
}

function minTierPriceEUR(tiers) {
  if (!tiers?.length) return null;
  return Math.min(...tiers.map((t) => Number(t.price)).filter((x) => Number.isFinite(x) && x > 0));
}

module.exports = {
  normalizeTicketTiersInput,
  parseTicketTiersFromDb,
  resolvePurchaseTier,
  enrichTiersWithSold,
  minTierPriceEUR,
};
