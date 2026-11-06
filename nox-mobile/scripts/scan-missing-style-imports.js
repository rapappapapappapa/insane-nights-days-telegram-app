/**
 * Détecte Radius/Layout/FontFamily/Spacing utilisés sans import.
 * Usage: node scripts/scan-missing-style-imports.js
 */
const fs = require('fs');
const path = require('path');

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(e.name) || e.name.startsWith('dist-')) continue;
      walk(p, a);
    } else if (/\.(js|jsx)$/.test(e.name)) a.push(p);
  }
  return a;
}

const files = walk(path.join(__dirname, '..'));
const issues = [];

for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const rel = path.relative(path.join(__dirname, '..'), f);
  const checks = [
    ['Radius', /Radius\.\w+/],
    ['Layout', /Layout\.\w+/],
    ['FontFamily', /FontFamily\.\w+/],
    ['Spacing', /Spacing\.\w+/],
  ];
  for (const [name, useRe] of checks) {
    if (!useRe.test(t)) continue;
    const importRe = new RegExp(`import\\s*\\{[^}]*\\b${name}\\b`);
    const importDef = new RegExp(`import\\s+${name}\\b`);
    if (!importRe.test(t) && !importDef.test(t)) {
      issues.push(`${name} sans import: ${rel}`);
    }
  }
}

if (!issues.length) {
  console.log('OK — aucun token StyleSheet sans import');
} else {
  console.log(issues.join('\n'));
  process.exitCode = 1;
}
