/**
 * Client API Yousign v3 (signature électronique des contrats).
 *
 * Env :
 * - YOUSIGN_API_KEY        : clé d'API (sans clé → intégration désactivée, flux d'acceptation inchangé)
 * - YOUSIGN_API_BASE_URL   : défaut sandbox https://api-sandbox.yousign.app/v3 (prod: https://api.yousign.app/v3)
 * - YOUSIGN_WEBHOOK_SECRET : secret du webhook (vérification HMAC sha256)
 *
 * Les PDF de contrat embarquent des « smart anchors » {{s1|signature|w|h}} / {{s2|...}}
 * (texte blanc, invisible à la lecture) : Yousign positionne les champs automatiquement.
 */

const crypto = require('crypto');

const YOUSIGN_DEFAULT_BASE_URL = 'https://api-sandbox.yousign.app/v3';

function yousignBaseUrl() {
  return (process.env.YOUSIGN_API_BASE_URL || YOUSIGN_DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function isYousignConfigured() {
  return !!process.env.YOUSIGN_API_KEY;
}

async function yousignRequest(method, path, { json, form } = {}) {
  const headers = { Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}` };
  let body;
  if (form) {
    body = form; // FormData : fetch gère le Content-Type multipart + boundary
  } else if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(json);
  }
  const res = await fetch(`${yousignBaseUrl()}${path}`, { method, headers, body });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const detail = data?.detail || data?.message || text?.slice(0, 300) || res.statusText;
    throw new Error(`Yousign ${method} ${path} → ${res.status}: ${detail}`);
  }
  return data;
}

/**
 * Yousign exige first_name ET last_name non vides.
 * « Marie Dupont » → { first: 'Marie', last: 'Dupont' } ; nom simple → dupliqué.
 */
function splitSignerName(fullName, fallback = 'Signataire') {
  const clean = String(fullName || '').trim() || fallback;
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Crée et active une demande de signature pour un contrat.
 * L'ordre des `signers` détermine les ancres : signers[0] → {{s1|...}}, signers[1] → {{s2|...}}.
 *
 * @param {Object} opts
 * @param {string} opts.name            Nom de la demande (visible dans les emails Yousign)
 * @param {string} opts.externalId      Référence interne (ex: eventdj_<id>)
 * @param {Buffer} opts.pdfBuffer       PDF du contrat (avec smart anchors)
 * @param {string} opts.filename        Nom du fichier PDF
 * @param {Array<{name: string, email: string}>} opts.signers  Les deux signataires
 * @returns {Promise<string>} id de la signature request Yousign
 */
async function createContractSignatureRequest({ name, externalId, pdfBuffer, filename, signers }) {
  if (!isYousignConfigured()) {
    throw new Error('Yousign non configuré (YOUSIGN_API_KEY manquant).');
  }
  if (!Array.isArray(signers) || signers.length < 2 || signers.some((s) => !s?.email)) {
    throw new Error('Signataires invalides (email manquant).');
  }

  const sr = await yousignRequest('POST', '/signature_requests', {
    json: {
      name: String(name || 'Contrat Nox').slice(0, 128),
      delivery_mode: 'email',
      timezone: 'Europe/Paris',
      external_id: externalId || undefined,
    },
  });

  const form = new FormData();
  form.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), filename || 'contrat.pdf');
  form.append('nature', 'signable_document');
  form.append('parse_anchors', 'true');
  await yousignRequest('POST', `/signature_requests/${sr.id}/documents`, { form });

  for (const signer of signers) {
    const { firstName, lastName } = splitSignerName(signer.name);
    await yousignRequest('POST', `/signature_requests/${sr.id}/signers`, {
      json: {
        info: {
          first_name: firstName.slice(0, 150),
          last_name: lastName.slice(0, 150),
          email: signer.email,
          locale: 'fr',
        },
        signature_level: 'electronic_signature',
        signature_authentication_mode: 'no_otp',
      },
    });
  }

  await yousignRequest('POST', `/signature_requests/${sr.id}/activate`);
  return sr.id;
}

/**
 * Vérifie la signature HMAC d'un webhook Yousign (header `x-yousign-signature-256`).
 * Si aucun secret n'est configuré, accepte (utile en sandbox au tout début).
 */
function verifyYousignWebhookSignature(rawBody, signatureHeader) {
  const secret = process.env.YOUSIGN_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!rawBody || !signatureHeader) return false;
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`, 'utf8');
  const received = Buffer.from(String(signatureHeader), 'utf8');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

module.exports = {
  isYousignConfigured,
  createContractSignatureRequest,
  verifyYousignWebhookSignature,
  splitSignerName,
};
