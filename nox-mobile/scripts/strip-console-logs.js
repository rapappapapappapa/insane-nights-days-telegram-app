/**
 * Supprime les console.log(...) de debug (statements complets, multi-lignes inclus).
 * Vérifie la syntaxe (node --check) après chaque fichier et annule si elle casse.
 * Usage : node scripts/strip-console-logs.js fichier1 fichier2 ...
 */
const fs = require('fs');
const { execSync } = require('child_process');

function stripConsoleLogs(src) {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const idx = src.indexOf('console.log(', i);
    if (idx === -1) {
      out += src.slice(i);
      break;
    }
    // Statement uniquement : début de ligne (espaces) avant console.log
    const lineStart = src.lastIndexOf('\n', idx) + 1;
    const prefix = src.slice(lineStart, idx);
    if (!/^\s*$/.test(prefix)) {
      out += src.slice(i, idx + 12);
      i = idx + 12;
      continue;
    }
    // Trouver la parenthèse fermante équilibrée (gère les strings)
    let j = idx + 'console.log('.length;
    let depth = 1;
    let inStr = null;
    while (j < src.length && depth > 0) {
      const c = src[j];
      if (inStr) {
        if (c === '\\') j++;
        else if (c === inStr) inStr = null;
      } else if (c === "'" || c === '"' || c === '`') {
        inStr = c;
      } else if (c === '(') {
        depth++;
      } else if (c === ')') {
        depth--;
      }
      j++;
    }
    // Consommer ; et fin de ligne
    while (j < src.length && (src[j] === ';' || src[j] === ' ')) j++;
    if (src[j] === '\n') j++;
    out += src.slice(i, lineStart);
    i = j;
  }
  return out;
}

const files = process.argv.slice(2);
for (const file of files) {
  const before = fs.readFileSync(file, 'utf8');
  const after = stripConsoleLogs(before);
  if (before === after) {
    console.error(`= inchangé : ${file}`);
    continue;
  }
  fs.writeFileSync(file, after);
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    const removed = (before.match(/console\.log\(/g) || []).length - (after.match(/console\.log\(/g) || []).length;
    console.error(`✓ ${file} (−${removed} console.log)`);
  } catch {
    fs.writeFileSync(file, before);
    console.error(`✗ REVERT (syntaxe cassée) : ${file}`);
  }
}
