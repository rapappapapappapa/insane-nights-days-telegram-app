#!/usr/bin/env node
/**
 * Repère les ReferenceError potentielles : identifiants RÉFÉRENCÉS mais non liés
 * (ni déclarés, ni importés, ni paramètres/props déstructurés, ni globaux).
 * Couvre aussi l'intérieur des fonctions/composants (≠ find-module-scope-refs.js).
 *
 * Usage: node scripts/find-unbound-refs.js <fichier...>
 */
const fs = require('fs');
const parser = require('@babel/parser');
const traverseMod = require('@babel/traverse');
const traverse = traverseMod.default || traverseMod;

const GLOBALS = new Set([
  'console', 'require', 'module', 'exports', 'process', 'global', 'globalThis',
  '__DEV__', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Promise', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Math', 'JSON',
  'Date', 'RegExp', 'Error', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'undefined', 'NaN', 'Infinity', 'fetch', 'URL',
  'ArrayBuffer', 'Uint8Array', 'TextEncoder', 'TextDecoder', 'btoa', 'atob',
  'requestAnimationFrame', 'cancelAnimationFrame', 'arguments', '__dirname',
  '__filename', 'React', 'alert', 'navigator', 'window', 'document',
  'queueMicrotask', 'structuredClone', 'performance', 'AbortController',
  'FormData', 'Blob', 'FileReader', 'WebSocket', 'XMLHttpRequest', 'Headers',
  'Request', 'Response', 'setImmediate', 'clearImmediate',
  'URLSearchParams', 'Intl', 'Proxy', 'Reflect', 'BigInt',
]);

const files = process.argv.slice(2);
let problems = 0;

for (const file of files) {
  let code;
  try { code = fs.readFileSync(file, 'utf8'); } catch { continue; }
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport'],
    });
  } catch (e) {
    console.log(`[PARSE ERR] ${file}: ${e.message}`);
    problems++;
    continue;
  }

  const seen = new Set();
  traverse(ast, {
    ReferencedIdentifier(p) {
      const name = p.node.name;
      if (GLOBALS.has(name)) return;
      if (p.scope.getBinding(name)) return; // lié quelque part : OK
      const key = `${name}:${p.node.loc.start.line}`;
      if (seen.has(key)) return;
      seen.add(key);
      console.log(`[UNBOUND] ${file}:${p.node.loc.start.line} -> ${name}`);
      problems++;
    },
  });
}

console.log(problems ? `\n${problems} référence(s) non liée(s).` : '\nAucune référence non liée.');
process.exit(problems ? 1 : 0);
