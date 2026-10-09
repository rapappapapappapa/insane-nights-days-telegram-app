#!/usr/bin/env node
/**
 * Détecte les ReferenceError potentielles : identifiants utilisés au niveau MODULE
 * (hors fonctions/composants) qui ne sont ni déclarés, ni importés, ni globaux.
 * Cible les crashs « compile mais plante à l'évaluation du module » (extraction auto de styles).
 *
 * Usage: node scripts/find-module-scope-refs.js <fichier1> <fichier2> ...
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
  'requestAnimationFrame', 'cancelAnimationFrame', 'arguments',
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

  traverse(ast, {
    Program(path) {
      const binding = path.scope.getAllBindings();
      const declared = new Set(Object.keys(binding));
      path.traverse({
        ReferencedIdentifier(p) {
          // Uniquement les références dont la portée de liaison est le module (program),
          // i.e. exécutées à l'évaluation du module et non dans une fonction.
          const name = p.node.name;
          if (GLOBALS.has(name)) return;
          // Est-ce lié quelque part dans la chaîne de scope ?
          const b = p.scope.getBinding(name);
          if (b) return; // déclaré/importé : OK
          // Pas de binding du tout -> potentielle ReferenceError.
          // On ne signale que si la référence est dans le scope module (pas dans une fonction),
          // car seules celles-là plantent à l'évaluation.
          let fnParent = p.getFunctionParent();
          if (fnParent) return; // dans une fonction : ne plante pas au chargement
          if (declared.has(name)) return;
          console.log(`[MODULE-SCOPE UNDEF] ${file}:${p.node.loc.start.line} -> ${name}`);
          problems++;
        },
      });
    },
  });
}

console.log(problems ? `\n${problems} problème(s) potentiel(s).` : '\nAucune référence module non résolue.');
process.exit(problems ? 1 : 0);
