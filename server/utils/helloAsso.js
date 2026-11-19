/**
 * Client HelloAsso API v5 (adhésions collectifs).
 * Inactif tant que HELLOASSO_ENABLED=true et les identifiants ne sont pas fournis.
 *
 * Variables : HELLOASSO_ENABLED, HELLOASSO_CLIENT_ID, HELLOASSO_CLIENT_SECRET,
 * HELLOASSO_API_BASE (défaut sandbox : https://api.helloasso-sandbox.com).
 */
const DEFAULT_API_BASE = 'https://api.helloasso-sandbox.com';

let cachedToken = null;

function apiBase() {
  return (process.env.HELLOASSO_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '');
}

function isHelloAssoConfigured() {
  return (
    String(process.env.HELLOASSO_ENABLED || '').toLowerCase() === 'true' &&
    !!process.env.HELLOASSO_CLIENT_ID &&
    !!process.env.HELLOASSO_CLIENT_SECRET
  );
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60 * 1000) return cachedToken.value;
  const res = await fetch(`${apiBase()}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.HELLOASSO_CLIENT_ID,
      client_secret: process.env.HELLOASSO_CLIENT_SECRET,
    }).toString(),
  });
  if (!res.ok) throw new Error(`HelloAsso token ${res.status}`);
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + (Number(json.expires_in) || 1800) * 1000 };
  return cachedToken.value;
}

async function helloAssoRequest(method, path, body) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase()}/v5${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(`HelloAsso ${method} ${path} ${res.status}`);
    err.status = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

/**
 * Paiement d’adhésion (checkout HelloAsso du collectif). Les URLs doivent être en https.
 * @returns {Promise<{ id: number, redirectUrl: string }>}
 */
async function createCheckoutIntent(organizationSlug, { amountCents, itemName, backUrl, errorUrl, returnUrl, payer, metadata }) {
  return helloAssoRequest('POST', `/organizations/${encodeURIComponent(organizationSlug)}/checkout-intents`, {
    totalAmount: amountCents,
    initialAmount: amountCents,
    itemName: String(itemName).slice(0, 250),
    backUrl,
    errorUrl,
    returnUrl,
    containsDonation: false,
    ...(payer ? { payer } : {}),
    metadata,
  });
}

/** Le checkout contient une commande (`order`) une fois payé. */
async function getCheckoutIntent(organizationSlug, checkoutIntentId) {
  return helloAssoRequest(
    'GET',
    `/organizations/${encodeURIComponent(organizationSlug)}/checkout-intents/${encodeURIComponent(checkoutIntentId)}`,
  );
}

module.exports = {
  isHelloAssoConfigured,
  createCheckoutIntent,
  getCheckoutIntent,
};
