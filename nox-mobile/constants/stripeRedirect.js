/**
 * Schéma déclaré dans app.json (`expo.scheme`).
 * PaymentSheet doit revenir sur ce schéma, sinon Android n’ouvre pas l’app
 * après une authentification bancaire.
 */
export const APP_URL_SCHEME = 'com.insanenightsdays.mobile';

export const STRIPE_RETURN_URL = `${APP_URL_SCHEME}://stripe-redirect`;
