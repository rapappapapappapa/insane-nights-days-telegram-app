import { Dimensions } from 'react-native';
import { PAYMENT_TERMS_OPTIONS } from './bookerDashboardUtils';
export function cleanText(s) {
  if (!s) return '';
  return String(s).replace(/\s+/g, ' ').trim();
}
export { PAYMENT_TERMS_OPTIONS };
export const SCREEN_WIDTH = Dimensions.get('window').width;
