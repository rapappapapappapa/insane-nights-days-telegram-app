// Native-only Stripe wrapper.
// This file is picked on iOS/Android and will NOT be bundled on web.

import { initStripe, initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';

export const isStripeSupported = true;

export { initStripe, initPaymentSheet, presentPaymentSheet };

