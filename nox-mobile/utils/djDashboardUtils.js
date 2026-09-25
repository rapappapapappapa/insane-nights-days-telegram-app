export function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}

export const PAYMENT_TERMS_OPTIONS = [
  { value: 'jour_booking', labelFr: 'Jour booking', labelEn: 'Booking day' },
  { value: 'j-1_prestation', labelFr: 'J-1 prestation', labelEn: 'D-1 performance' },
  { value: 'j+1_prestation', labelFr: 'J+1 prestation', labelEn: 'D+1 performance' },
  { value: 'j+15', labelFr: 'J+15', labelEn: 'D+15' },
  { value: 'j+30', labelFr: 'J+30', labelEn: 'D+30' },
];
