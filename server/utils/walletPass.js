/**
 * Billets dans Apple Wallet (.pkpass signé) et Google Wallet (lien « Enregistrer » signé en JWT).
 * Chaque côté reste inactif tant que ses identifiants ne sont pas fournis (voir env.example.txt).
 *
 * Le QR d’un billet change après un transfert ou une revente : l’identifiant du pass inclut la fin
 * du QR, pour qu’un nouveau pass soit créé au lieu de garder l’ancien code.
 */
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { parseEventTime, parisWallTime } = require('./eventSchedule');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'wallet');
const PASS_IMAGES = ['icon.png', 'icon@2x.png', 'icon@3x.png', 'logo.png', 'logo@2x.png'];
/** Accepte un PEM brut (avec `\n` échappés) ou son encodage base64. */
function pemFromEnv(value) {
  if (!value) return null;
  const v = String(value).trim();
  if (v.includes('-----BEGIN')) return v.replace(/\\n/g, '\n');
  return Buffer.from(v, 'base64').toString('utf8');
}

function isAppleWalletConfigured() {
  return !!(
    process.env.APPLE_PASS_TYPE_ID &&
    process.env.APPLE_TEAM_ID &&
    process.env.APPLE_PASS_SIGNER_CERT &&
    process.env.APPLE_PASS_SIGNER_KEY &&
    process.env.APPLE_WWDR_CERT
  );
}

function isGoogleWalletConfigured() {
  return !!(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_WALLET_PRIVATE_KEY
  );
}

/** Début de l’événement (jour YYYY-MM-DD + heure HH:mm à Paris) en ISO UTC. */
function eventStartIso(ymd, time) {
  const start = parisWallTime(ymd, parseEventTime(time) || '20:00');
  return start ? start.toISOString() : null;
}

function passSuffix(ticket) {
  return String(ticket.qrCode || '').slice(-8);
}

/**
 * @param {object} t données billet : id, qrCode, eventId, title, ymd, time, venueName, address, tierLabel, holderName
 * @returns {Promise<Buffer>}
 */
async function buildApplePass(t) {
  const { PKPass } = require('passkit-generator');
  const dateLabel = new Date(`${t.ymd}T12:00:00Z`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const passJson = {
    formatVersion: 1,
    passTypeIdentifier: process.env.APPLE_PASS_TYPE_ID,
    teamIdentifier: process.env.APPLE_TEAM_ID,
    organizationName: 'NOX',
    description: `Billet NOX — ${t.title}`,
    serialNumber: `${t.id}-${passSuffix(t)}`,
    logoText: 'NOX',
    backgroundColor: 'rgb(0,0,0)',
    foregroundColor: 'rgb(255,255,255)',
    labelColor: 'rgb(120,150,255)',
    ...(eventStartIso(t.ymd, t.time) ? { relevantDate: eventStartIso(t.ymd, t.time) } : {}),
    barcodes: [{ format: 'PKBarcodeFormatQR', message: t.qrCode, messageEncoding: 'iso-8859-1' }],
    eventTicket: {
      primaryFields: [{ key: 'event', label: 'ÉVÉNEMENT', value: t.title }],
      secondaryFields: [
        { key: 'date', label: 'DATE', value: dateLabel },
        ...(t.time ? [{ key: 'time', label: 'HEURE', value: t.time }] : []),
      ],
      auxiliaryFields: [
        ...(t.venueName ? [{ key: 'venue', label: 'LIEU', value: t.venueName }] : []),
        { key: 'tier', label: 'TARIF', value: t.tierLabel || 'Entrée générale' },
      ],
      backFields: [
        ...(t.address ? [{ key: 'address', label: 'Adresse', value: t.address }] : []),
        ...(t.holderName ? [{ key: 'holder', label: 'Titulaire', value: t.holderName }] : []),
        {
          key: 'terms',
          label: 'Conditions',
          value:
            'Billet personnel. Après un transfert ou une revente via NOX, ce QR code n’est plus valable : ajoute à nouveau le billet depuis l’app.',
        },
      ],
    },
  };

  const files = { 'pass.json': Buffer.from(JSON.stringify(passJson)) };
  for (const name of PASS_IMAGES) files[name] = fs.readFileSync(path.join(ASSETS_DIR, name));

  const pass = new PKPass(files, {
    wwdr: pemFromEnv(process.env.APPLE_WWDR_CERT),
    signerCert: pemFromEnv(process.env.APPLE_PASS_SIGNER_CERT),
    signerKey: pemFromEnv(process.env.APPLE_PASS_SIGNER_KEY),
    signerKeyPassphrase: process.env.APPLE_PASS_SIGNER_KEY_PASSPHRASE || undefined,
  });
  return pass.getAsBuffer();
}

/** Lien https://pay.google.com/gp/v/save/<jwt> : la classe (événement) et l’objet (billet) sont créés à l’enregistrement. */
function buildGoogleSaveUrl(t) {
  const issuer = process.env.GOOGLE_WALLET_ISSUER_ID;
  const safe = (s) => String(s).replace(/[^A-Za-z0-9._-]/g, '_');
  const classId = `${issuer}.nox_event_${safe(t.eventId)}`;
  const start = eventStartIso(t.ymd, t.time);
  const payload = {
    iss: process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
    aud: 'google',
    typ: 'savetowallet',
    origins: [],
    payload: {
      eventTicketClasses: [
        {
          id: classId,
          issuerName: 'NOX',
          reviewStatus: 'UNDER_REVIEW',
          eventName: { defaultValue: { language: 'fr-FR', value: t.title } },
          ...(t.venueName || t.address
            ? {
                venue: {
                  name: { defaultValue: { language: 'fr-FR', value: t.venueName || t.address } },
                  address: { defaultValue: { language: 'fr-FR', value: t.address || t.venueName } },
                },
              }
            : {}),
          ...(start ? { dateTime: { start } } : {}),
          hexBackgroundColor: '#000000',
        },
      ],
      eventTicketObjects: [
        {
          id: `${issuer}.nox_ticket_${safe(t.id)}_${safe(passSuffix(t))}`,
          classId,
          state: 'ACTIVE',
          barcode: { type: 'QR_CODE', value: t.qrCode },
          ...(t.holderName ? { ticketHolderName: t.holderName } : {}),
          ticketType: { defaultValue: { language: 'fr-FR', value: t.tierLabel || 'Entrée générale' } },
        },
      ],
    },
  };
  const token = jwt.sign(payload, pemFromEnv(process.env.GOOGLE_WALLET_PRIVATE_KEY), { algorithm: 'RS256' });
  return `https://pay.google.com/gp/v/save/${token}`;
}

module.exports = {
  isAppleWalletConfigured,
  isGoogleWalletConfigured,
  buildApplePass,
  buildGoogleSaveUrl,
  eventStartIso,
};
