/** Libellé prix événement (badge liste / feed), aligné feed + détail. */
export function formatEventPriceBadge(event, language = 'fr') {
  const price = event?.price;
  if (price == null || price === '') return '';
  const prefix = event?.hasMultipleTicketPrices
    ? language === 'fr'
      ? 'dès '
      : 'from '
    : '';
  return `${prefix}${price}€`;
}
