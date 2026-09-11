/**
 * Découpe registerMediaBookingsRoutes.js en modules media/*.
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');
const srcPath = path.join(SERVER_ROOT, 'routes', 'registerMediaBookingsRoutes.js');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');
const slice = (start, end) =>
  lines.slice(start - 1, end).join('\n').replace(/path\.join\(__dirname, 'uploads'/g, "path.join(SERVER_ROOT, 'uploads'");

const mediaDir = path.join(SERVER_ROOT, 'routes', 'media');
fs.mkdirSync(mediaDir, { recursive: true });

const uploadHeader = `/**
 * Upload et gestion médias DJ / Lieu.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');

module.exports = function registerMediaUploadRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    deleteFromR2,
    uploadLocal,
    uploadMemory,
  } = deps;

`;

const simpleHeader = (title, fn) => `/**
 * ${title}
 */
const prisma = require('../../lib/prisma');

module.exports = function ${fn}(app, deps) {
  const { authenticateToken } = deps;

`;

const publicHeader = `/**
 * Médias DJ publics et notes lieu.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');

module.exports = function registerMediaPublicRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    deleteFromR2,
  } = deps;

`;

const modules = [
  { file: 'media/registerMediaUploadRoutes.js', start: 21, end: 511, header: uploadHeader },
  { file: 'media/registerBookingsListRoutes.js', start: 513, end: 785, header: simpleHeader('Listes de réservations DJ / Lieu / Prestataire.', 'registerBookingsListRoutes') },
  { file: 'media/registerInvitationRoutes.js', start: 786, end: 1361, header: simpleHeader('Invitations DJ / Lieu / Prestataire (accept, reject, cancel).', 'registerInvitationRoutes') },
  { file: 'media/registerMediaPublicRoutes.js', start: 1362, end: 1572, header: publicHeader },
];

for (const mod of modules) {
  fs.writeFileSync(
    path.join(SERVER_ROOT, 'routes', mod.file),
    mod.header + slice(mod.start, mod.end) + '\n};\n',
    'utf8',
  );
  console.log('Wrote', mod.file);
}

fs.writeFileSync(
  srcPath,
  `/**
 * Médias & bookings : agrège les sous-modules routes/media/*.
 */
module.exports = function registerMediaBookingsRoutes(app, deps) {
  require('./media/registerMediaUploadRoutes')(app, deps);
  require('./media/registerBookingsListRoutes')(app, deps);
  require('./media/registerInvitationRoutes')(app, deps);
  require('./media/registerMediaPublicRoutes')(app, deps);
};
`,
  'utf8',
);
console.log('Updated registerMediaBookingsRoutes.js');
