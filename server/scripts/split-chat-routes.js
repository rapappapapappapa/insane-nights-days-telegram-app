/**
 * Découpe registerChatRoutes.js en modules chat/*.
 */
const fs = require('fs');
const path = require('path');

const SERVER_ROOT = path.join(__dirname, '..');
const srcPath = path.join(SERVER_ROOT, 'routes', 'registerChatRoutes.js');
const lines = fs.readFileSync(srcPath, 'utf8').split('\n');
const slice = (start, end) => lines.slice(start - 1, end).join('\n');

const chatDir = path.join(SERVER_ROOT, 'routes', 'chat');
fs.mkdirSync(chatDir, { recursive: true});

const chatImports = `const prisma = require('../../lib/prisma');
const chatPush = require('../../utils/chatPush');
const MAX_CHAT_MESSAGE_LENGTH = 5000;

`;

const modules = [
  { file: 'chat/registerChatPrivateRoutes.js', start: 19, end: 605 },
  { file: 'chat/registerChatUnreadRoutes.js', start: 611, end: 1076 },
  { file: 'chat/registerChatGroupRoutes.js', start: 1088, end: 1297 },
  { file: 'chat/registerChatConversationsRoutes.js', start: 1298, end: 1561 },
];

for (const mod of modules) {
  const fnName = path.basename(mod.file, '.js');
  fs.writeFileSync(
    path.join(SERVER_ROOT, 'routes', mod.file),
    `/**
 * Chat — ${fnName}.
 */
${chatImports}
module.exports = function ${fnName}(app, deps) {
  const { authenticateToken } = deps;

${slice(mod.start, mod.end)}
};
`,
    'utf8',
  );
  console.log('Wrote', mod.file);
}

fs.writeFileSync(
  srcPath,
  `/**
 * Chat : agrège les sous-modules routes/chat/*.
 */
module.exports = function registerChatRoutes(app, deps) {
  require('./chat/registerChatPrivateRoutes')(app, deps);
  require('./chat/registerChatUnreadRoutes')(app, deps);
  require('./chat/registerChatGroupRoutes')(app, deps);
  require('./chat/registerChatConversationsRoutes')(app, deps);
};
`,
  'utf8',
);
console.log('Updated registerChatRoutes.js');
