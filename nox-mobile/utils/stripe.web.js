// Web-only Stripe wrapper.
// Avoid importing @stripe/stripe-react-native on web (native-only module).

export const isStripeSupported = false;

export async function initStripe() {
  throw new Error('Stripe is not supported on web for this app build.');
}

export async function initPaymentSheet() {
  throw new Error('Stripe is not supported on web for this app build.');
}

export async function presentPaymentSheet() {
  throw new Error('Stripe is not supported on web for this app build.');
}

