/**
 * Script one-shot : extrait les routes inline de index.js vers routes/register*.js
 * Usage: node scripts/split-index-routes.js
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');
const indexPath = path.join(SERVER_ROOT, 'index.js');
const lines = fs.readFileSync(indexPath, 'utf8').split('\n');

const slice = (start, end) => lines.slice(start - 1, end).join('\n');

const fixPaths = (code) =>
  code.replace(/path\.join\(__dirname,\s*'uploads'/g, "path.join(SERVER_ROOT, 'uploads'");

const routeFiles = [
  {
    file: 'routes/registerUserProfileUploadRoutes.js',
    start: 341,
    end: 446,
    header: `/**
 * Upload photo/bannière profils Communauté et Lieu (avant userRoutes).
 */
const path = require('path');
const prisma = require('../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '..');

module.exports = function registerUserProfileUploadRoutes(app, deps) {
  const { authenticateToken, MEDIA_STORAGE, makeObjectKey, uploadToR2, uploadLocal, uploadMemory } = deps;

`,
    footer: '\n};\n',
  },
  {
    file: 'routes/registerProfileRoutes.js',
    start: 456,
    end: 1248,
    header: `/**
 * Création / mise à jour des profils (Community, DJ, Booker, Venue, Prestataire).
 */
const path = require('path');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { normalizeGenreStrings, normalizeAvailableDays } = require('../utils/prestataireProfile');
const SERVER_ROOT = path.join(__dirname, '..');

const DEFAULT_PRESTATAIRE_AVAILABLE_DAYS_JSON = JSON.stringify({
  M: true, Ma: true, Me: true, J: true, V: true, S: false, D: false,
});

module.exports = function registerProfileRoutes(app, deps) {
  const {
    authenticateToken,
    authController,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

`,
    footer: '\n};\n',
  },
  {
    file: 'routes/registerEventPublicRoutes.js',
    start: 1250,
    end: 1444,
    header: `/**
 * Liste / détail événements publics + groupes (délégation userController).
 */
const prisma = require('../lib/prisma');
const { parseTicketTiersFromDb, enrichTiersWithSold } = require('../utils/ticketTiers');

module.exports = function registerEventPublicRoutes(app, deps) {
  const { authenticateToken, userController } = deps;

`,
    footer: `
  return { updateEventStatuses };
};
`,
    replaceInBody: [
      ['async function updateEventStatuses()', 'const updateEventStatuses = async function updateEventStatuses()'],
    ],
  },
  {
    file: 'routes/registerRatingRoutes.js',
    start: 1528,
    end: 1955,
    header: `/**
 * Notes DJ / Lieu et vérification.
 */
const prisma = require('../lib/prisma');
const { calculateDjRatings, calculateVenueRatings } = require('../utils/ratingCalculations');

module.exports = function registerRatingRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
    footer: '\n};\n',
  },
  {
    file: 'routes/registerDjPublicRoutes.js',
    start: 1957,
    end: 2202,
    header: `/**
 * Catalogue DJs public (liste, notes, événements).
 */
const prisma = require('../lib/prisma');

module.exports = function registerDjPublicRoutes(app, deps) {
  void deps;

`,
    footer: '\n};\n',
  },
  {
    file: 'routes/registerMediaBookingsRoutes.js',
    start: 2204,
    end: 3756,
    header: `/**
 * Médias DJ/Lieu, réservations et invitations.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '..');

module.exports = function registerMediaBookingsRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    deleteFromR2,
    uploadLocal,
    uploadMemory,
  } = deps;

`,
    footer: '\n};\n',
  },
  {
    file: 'routes/registerMiscRoutes.js',
    start: 3758,
    end: 3999,
    header: `/**
 * Tickets QR, stats, ranking, endpoint test.
 */
const QRCode = require('qrcode');
const prisma = require('../lib/prisma');
const { calculateDjRatings, calculateVenueRatings } = require('../utils/ratingCalculations');

module.exports = function registerMiscRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
    footer: '\n};\n',
  },
];

// utils/ratingCalculations.js
const ratingUtilsBody = fixPaths(slice(1448, 1526))
  .replace(/^const calculateDjRatings/m, 'async function calculateDjRatings')
  .replace(/^const calculateVenueRatings/m, 'async function calculateVenueRatings');

fs.writeFileSync(
  path.join(SERVER_ROOT, 'utils', 'ratingCalculations.js'),
  `/**
 * Recalcul des moyennes de notation DJ / Lieu.
 */
const prisma = require('../lib/prisma');

${ratingUtilsBody}

module.exports = {
  calculateDjRatings,
  calculateVenueRatings,
};
`,
  'utf8',
);

for (const spec of routeFiles) {
  let body = fixPaths(slice(spec.start, spec.end));
  if (spec.replaceInBody) {
    for (const [from, to] of spec.replaceInBody) {
      body = body.replace(from, to);
    }
  }
  const content = spec.header + body + spec.footer;
  fs.writeFileSync(path.join(SERVER_ROOT, spec.file), content, 'utf8');
  console.log('Wrote', spec.file);
}

// Rebuild index.js: keep lines 1-339, insert register calls, keep 4001-end
const head = lines.slice(0, 312).join('\n');
const tail = lines.slice(4000).join('\n');

const registerBlock = `
// ============================================================================
// ROUTES MODULAIRES
// ============================================================================

app.use('/api/auth', authRoutes);

const profileDeps = {
  authenticateToken,
  authController,
  MEDIA_STORAGE,
  makeObjectKey,
  uploadToR2,
  deleteFromR2,
  uploadLocal,
  uploadMemory,
};

require('./routes/registerUserProfileUploadRoutes')(app, profileDeps);
require('./routes/registerProfileRoutes')(app, profileDeps);

app.use('/api/user', userRoutes);

app.post('/api/wallet/connect', authController.connectWallet);

const { updateEventStatuses } = require('./routes/registerEventPublicRoutes')(app, {
  authenticateToken,
  userController,
});

require('./routes/registerRatingRoutes')(app, { authenticateToken });
require('./routes/registerDjPublicRoutes')(app, {});
require('./routes/registerMediaBookingsRoutes')(app, profileDeps);
require('./routes/registerMiscRoutes')(app, { authenticateToken });
`;

const newIndex = `${head}
${registerBlock}
${tail}`;
fs.writeFileSync(indexPath, newIndex, 'utf8');
console.log('Updated index.js');
