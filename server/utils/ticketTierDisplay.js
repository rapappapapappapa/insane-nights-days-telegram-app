const { parseTicketTiersFromDb } = require('./ticketTiers');

function tierLabelForTicket(eventTicketTiersJson, tierId) {
  const tid = tierId != null ? String(tierId).trim() : '';
  if (!tid) return null;

  const tiers = parseTicketTiersFromDb(eventTicketTiersJson);
  if (!Array.isArray(tiers) || tiers.length === 0) return null;

  const hit = tiers.find((t) => t && String(t.id) === tid);
  if (!hit || !hit.label) return null;

  return String(hit.label).trim() || null;
}

module.exports = { tierLabelForTicket };
