/**
 * Découpe registerFeedRoutes.js en modules feed/*.
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');
const srcPath = path.join(SERVER_ROOT, 'routes', 'registerFeedRoutes.js');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');
const slice = (start, end) => lines.slice(start - 1, end).join('\n');

const feedDir = path.join(SERVER_ROOT, 'routes', 'feed');
fs.mkdirSync(feedDir, { recursive: true });

const fixPaths = (code) =>
  code.replace(/path\.join\(__dirname, 'uploads'/g, "path.join(SERVER_ROOT, 'uploads'");

const modules = [
  {
    file: 'feed/registerFeedPostRoutes.js',
    start: 30,
    end: 343,
    header: `/**
 * Feed : upload image, création et suppression de posts.
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../../lib/prisma');
const SERVER_ROOT = path.join(__dirname, '../..');

module.exports = function registerFeedPostRoutes(app, deps) {
  const {
    authenticateToken,
    MEDIA_STORAGE,
    makeObjectKey,
    uploadToR2,
    uploadLocal,
    uploadMemory,
  } = deps;

`,
  },
  {
    file: 'feed/registerFollowRoutes.js',
    start: 344,
    end: 520,
    header: `/**
 * Abonnements DJ / Booker et profil booker public.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerFollowRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
  {
    file: 'feed/registerFeedListRoutes.js',
    start: 521,
    end: 967,
    header: `/**
 * Fil d'actualité (following + feed principal).
 */
const prisma = require('../../lib/prisma');
const { parseTicketTiersFromDb } = require('../../utils/ticketTiers');

module.exports = function registerFeedListRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
  {
    file: 'feed/registerFeedEngagementRoutes.js',
    start: 968,
    end: 1371,
    header: `/**
 * Likes, commentaires et notifications feed.
 */
const prisma = require('../../lib/prisma');

module.exports = function registerFeedEngagementRoutes(app, deps) {
  const { authenticateToken } = deps;

`,
  },
];

for (const mod of modules) {
  fs.writeFileSync(
    path.join(SERVER_ROOT, 'routes', mod.file),
    mod.header + fixPaths(slice(mod.start, mod.end)) + '\n};\n',
    'utf8',
  );
  console.log('Wrote', mod.file);
}

fs.writeFileSync(
  srcPath,
  `/**
 * Feed : agrège les sous-modules routes/feed/*.
 */
module.exports = function registerFeedRoutes(app, deps) {
  require('./feed/registerFeedPostRoutes')(app, deps);
  require('./feed/registerFollowRoutes')(app, deps);
  require('./feed/registerFeedListRoutes')(app, deps);
  require('./feed/registerFeedEngagementRoutes')(app, deps);
};
`,
  'utf8',
);
console.log('Updated registerFeedRoutes.js');
