/**
 * Découpe registerBookerOrganizerRoutes.js en modules booker/* + contractHelpers.
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');
const srcPath = path.join(SERVER_ROOT, 'routes', 'registerBookerOrganizerRoutes.js');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');
const slice = (start, end) => lines.slice(start - 1, end).join('\n');

const bookerDir = path.join(SERVER_ROOT, 'routes', 'booker');
fs.mkdirSync(bookerDir, { recursive: true });

const helpersBody = slice(1064, 1225);
fs.writeFileSync(
  path.join(SERVER_ROOT, 'utils', 'contractHelpers.js'),
  `/**
 * Helpers contrats booking (hash, rôles, notifications chat, garde-fous lieu).
 */
const prisma = require('../lib/prisma');

${helpersBody}

module.exports = {
  stableStringify,
  hashContract,
  venueContractResponderRole,
  prestataireContractResponderRole,
  eventDjResponderRole,
  loadEventDjWithAccess,
  getVenueContractGateForDjEvent,
  assertVenueContractBeforeDjSign,
  createContractNotificationMessage,
  createContractNotificationMessageVenue,
  createContractNotificationMessagePrestataire,
};
`,
  'utf8',
);

const modules = [
  {
    file: 'booker/registerBookerResourceRoutes.js',
    start: 25,
    end: 509,
    header: `/**
 * Booker : DJs/prestataires disponibles, inventaire location, lieux, liste événements.
 */
const prisma = require('../../lib/prisma');
const {
  presetsForApi,
  normalizeBookerRentalInventory,
} = require('../../utils/rentalEquipment');

module.exports = function registerBookerResourceRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
  {
    file: 'booker/registerBookerStaffRoutes.js',
    start: 515,
    end: 814,
    header: `/**
 * Booker : amis Communauté, staff événement, scan QR billets.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerBookerStaffRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
  {
    file: 'booker/registerBookerPaymentRoutes.js',
    start: 820,
    end: 1053,
    header: `/**
 * Booker : publication feed, paiements DJ/lieu/prestataire.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerBookerPaymentRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
  {
    file: 'booker/registerBookerContractRoutes.js',
    start: 1227,
    end: 2006,
    header: `/**
 * Contrats booking Organisateur ↔ DJ / Lieu / Prestataire.
 */
const prisma = require('../../lib/prisma');
const {
  hashContract,
  venueContractResponderRole,
  prestataireContractResponderRole,
  eventDjResponderRole,
  loadEventDjWithAccess,
  getVenueContractGateForDjEvent,
  assertVenueContractBeforeDjSign,
  createContractNotificationMessage,
  createContractNotificationMessageVenue,
  createContractNotificationMessagePrestataire,
} = require('../../utils/contractHelpers');

module.exports = function registerBookerContractRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
  {
    file: 'booker/registerBookerEventCrudRoutes.js',
    start: 2012,
    end: 2953,
    header: `/**
 * Booker : CRUD événements, invitations DJ/lieu/prestataire.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');
const { normalizeEquipmentRentalForStorage } = require('../../utils/rentalEquipment');
const { normalizeTicketTiersInput, minTierPriceEUR } = require('../../utils/ticketTiers');

module.exports = function registerBookerEventCrudRoutes(app, deps) {
  const {
    authenticateToken,
    djSlotFitsEventWindow,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

`,
  },
];

for (const mod of modules) {
  const body = slice(mod.start, mod.end)
    .replace(/path\.join\(__dirname, 'uploads'/g, "path.join(SERVER_ROOT, 'uploads'");
  fs.writeFileSync(
    path.join(SERVER_ROOT, 'routes', mod.file),
    mod.header + body + '\n};\n',
    'utf8',
  );
  console.log('Wrote', mod.file);
}

const orchestrator = `/**
 * Organisateur (booker) : agrège les sous-modules routes/booker/*.
 */
module.exports = function registerBookerOrganizerRoutes(app, deps) {
  require('./booker/registerBookerResourceRoutes')(app, deps);
  require('./booker/registerBookerStaffRoutes')(app, deps);
  require('./booker/registerBookerPaymentRoutes')(app, deps);
  require('./booker/registerBookerContractRoutes')(app, deps);
  require('./booker/registerBookerEventCrudRoutes')(app, deps);
};
`;

fs.writeFileSync(srcPath, orchestrator, 'utf8');
console.log('Updated registerBookerOrganizerRoutes.js');
