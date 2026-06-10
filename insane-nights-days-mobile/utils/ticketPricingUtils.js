/**
 * Billetterie — prix TTC saisis par l'organisateur.
 * TVA 20 % indicative ; commission Nox 10 % déduite du reversement organisateur
 * (le prix public ne change pas).
 */

export const TVA_RATE = 0.2;
export const NOX_COMMISSION_RATE = 0.1;

const r2 = (n) => Math.round(n * 100) / 100;

/** Détail HT / TVA / commission / reversement pour un prix TTC (par billet). */
export function ticketPricingBreakdown(priceTTC) {
  const ttc = typeof priceTTC === 'number' ? priceTTC : parseFloat(String(priceTTC ?? '').replace(',', '.'));
  if (!Number.isFinite(ttc) || ttc <= 0) return null;
  const ht = ttc / (1 + TVA_RATE);
  const commission = ttc * NOX_COMMISSION_RATE;
  return {
    ttc: r2(ttc),
    ht: r2(ht),
    tva: r2(ttc - ht),
    commission: r2(commission),
    netOrganizer: r2(ttc - commission),
  };
}

/**
 * Parse une date de fenêtre de vente saisie au wizard (JJ/MM/AAAA ou AAAA-MM-JJ).
 * @returns ISO string | null (champ vide) | undefined (saisie invalide)
 */
export function parseSaleDateInput(value, { endOfDay = false } = {}) {
  const s = String(value || '').trim();
  if (!s) return null;
  let d = null;
  const fr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fr) d = new Date(Number(fr[3]), Number(fr[2]) - 1, Number(fr[1]));
  else if (iso) d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  if (!d || Number.isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Hint d'affichage de la fenêtre de vente d'un palier (détail événement). */
export function tierSaleWindowHint(tier, language = 'fr') {
  if (!tier) return '';
  const fmt = (isoStr) =>
    new Date(isoStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
    });

  if (tier.onSale === false) {
    if (tier.saleStart && new Date(tier.saleStart) > new Date()) {
      return language === 'fr' ? `dès le ${fmt(tier.saleStart)}` : `from ${fmt(tier.saleStart)}`;
    }
    return language === 'fr' ? 'vente terminée' : 'sale ended';
  }
  if (tier.saleEnd) {
    return language === 'fr' ? `jusqu'au ${fmt(tier.saleEnd)}` : `until ${fmt(tier.saleEnd)}`;
  }
  return '';
}
