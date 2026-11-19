export const API_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isTicketTierSelectable(t) {
  if (!t) return false;
  if (t.onSale === false) return false; // phase de vente fermée (fenêtre saleStart/saleEnd)
  if (t.maxSold == null || t.maxSold === '') return true;
  if (t.remaining == null || t.remaining === undefined) return true;
  return Number(t.remaining) > 0;
}