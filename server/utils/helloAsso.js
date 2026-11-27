/**
 * Client HelloAsso API v5 (adhésions collectifs : formulaire public et commandes).
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

/** Site public HelloAsso correspondant à l’API utilisée (sandbox ou production). */
function webBase() {
  return apiBase().includes('sandbox') ? 'https://www.helloasso-sandbox.com' : 'https://www.helloasso.com';
}

function membershipFormUrl(organizationSlug, formSlug) {
  return `${webBase()}/associations/${encodeURIComponent(organizationSlug)}/adhesions/${encodeURIComponent(formSlug)}`;
}

/** « https://www.helloasso.com/associations/mon-asso/adhesions/adhesion-2026 » → slugs. */
function parseMembershipFormUrl(input) {
  const match = String(input || '').match(/\/associations\/([^/?#]+)\/adhesions\/([^/?#]+)/i);
  if (!match) return null;
  return { organizationSlug: decodeURIComponent(match[1]).toLowerCase(), formSlug: decodeURIComponent(match[2]).toLowerCase() };
}

const FORM_CACHE_MS = 10 * 60 * 1000;
const formCache = new Map();

/**
 * Formulaire d’adhésion public : titre, adresse et formules (tarifs) définies sur HelloAsso.
 * Mis en cache 10 min.
 */
async function getMembershipForm(organizationSlug, formSlug, { fresh = false } = {}) {
  const key = `${organizationSlug}/${formSlug}`;
  const cached = formCache.get(key);
  if (!fresh && cached && cached.expiresAt > Date.now()) return cached.value;
  const raw = await helloAssoRequest(
    'GET',
    `/organizations/${encodeURIComponent(organizationSlug)}/forms/Membership/${encodeURIComponent(formSlug)}/public`,
  );
  const value = formatMembershipForm(raw, organizationSlug, formSlug);
  formCache.set(key, { value, expiresAt: Date.now() + FORM_CACHE_MS });
  return value;
}

function formatMembershipForm(raw, organizationSlug, formSlug) {
  const tiers = (Array.isArray(raw?.tiers) ? raw.tiers : [])
    .filter((t) => !t.tierType || t.tierType === 'Membership')
    .map((t) => ({
      id: t.id,
      label: t.label || 'Adhésion',
      description: t.description || null,
      priceCents: Number.isFinite(t.price) ? t.price : null,
    }));
  return {
    title: raw?.title || 'Adhésion',
    description: raw?.description || null,
    url: raw?.url || membershipFormUrl(organizationSlug, formSlug),
    validityType: raw?.validityType || null,
    endDate: raw?.endDate || null,
    tiers,
  };
}

/** Commandes du formulaire d’adhésion (nécessite que l’association ait autorisé NOX). */
async function listMembershipOrders(organizationSlug, formSlug, { from } = {}) {
  const params = new URLSearchParams({ withDetails: 'true', pageSize: '100', sortOrder: 'Desc' });
  if (from) params.set('from', new Date(from).toISOString());
  const res = await helloAssoRequest(
    'GET',
    `/organizations/${encodeURIComponent(organizationSlug)}/forms/Membership/${encodeURIComponent(formSlug)}/orders?${params}`,
  );
  return Array.isArray(res?.data) ? res.data : [];
}

const INVALID_ITEM_STATES = new Set(['Canceled', 'Refunded', 'Contested', 'Abandoned']);

/** Dernière adhésion valable payée avec cette adresse email, ou null. */
function findOrderForEmail(orders, email) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;
  for (const order of orders) {
    if (String(order?.payer?.email || '').trim().toLowerCase() !== target) continue;
    const items = (order.items || []).filter((i) => (!i.type || i.type === 'Membership') && !INVALID_ITEM_STATES.has(i.state));
    if (items.length === 0) continue;
    return {
      orderId: String(order.id),
      date: order.date ? new Date(order.date) : new Date(),
      amountCents: Number(order.amount?.total ?? items[0].amount ?? 0) || 0,
      tierLabel: items[0].name || null,
    };
  }
  return null;
}

/** Fin de validité : date fixe du formulaire, illimitée (null) ou un an glissant. */
function membershipValidUntil(form, orderDate) {
  if (form?.validityType === 'Illimited') return null;
  if (form?.validityType === 'Custom' && form.endDate) return new Date(form.endDate);
  const until = new Date(orderDate);
  until.setFullYear(until.getFullYear() + 1);
  return until;
}

module.exports = {
  isHelloAssoConfigured,
  membershipFormUrl,
  parseMembershipFormUrl,
  getMembershipForm,
  formatMembershipForm,
  listMembershipOrders,
  findOrderForEmail,
  membershipValidUntil,
};
