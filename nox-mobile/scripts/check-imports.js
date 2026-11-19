/**
 * Vérifie les imports relatifs du code mobile :
 *  - le fichier cible existe (résolution .js/.json/index.js)
 *  - les imports nommés correspondent à des exports existants
 *  - les imports default correspondent à un export default
 * Usage : node scripts/check-imports.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIRS = ['App.js', 'index.js', 'components', 'screens', 'utils', 'hooks', 'contexts', 'constants', 'services', 'api'];
const EXTS = ['.js', '.jsx', '.json', '.native.js', '.ios.js', '.android.js', '.ts', '.tsx'];

function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...listFiles(full));
    else if (EXTS.includes(path.extname(entry))) out.push(full);
  }
  return out;
}

function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, 'index' + e))];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

function getExports(file) {
  const src = fs.readFileSync(file, 'utf8');
  const named = new Set();
  let hasDefault = false;
  let re;
  // export const/let/var/function/class NAME
  re = /export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z0-9_$]+)/g;
  let m;
  while ((m = re.exec(src))) named.add(m[1]);
  // export default
  if (/export\s+default/.test(src)) hasDefault = true;
  // export { a, b as c } [from '...']
  re = /export\s*\{([^}]*)\}(?:\s*from\s*['"]([^'"]+)['"])?/g;
  while ((m = re.exec(src))) {
    for (const part of m[1].split(',')) {
      const p = part.trim();
      if (!p) continue;
      const asMatch = p.match(/^(.+?)\s+as\s+(.+)$/);
      const exported = (asMatch ? asMatch[2] : p).trim();
      if (exported === 'default') hasDefault = true;
      else named.add(exported);
    }
  }
  // export * from '...'
  re = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
  while ((m = re.exec(src))) {
    const target = resolveImport(file, m[1]);
    if (target) {
      const sub = getExports(target);
      sub.named.forEach((n) => named.add(n));
    }
  }
  // module.exports / CommonJS grossier
  if (/module\.exports/.test(src)) hasDefault = true;
  return { named, hasDefault };
}

const exportCache = new Map();
function cachedExports(file) {
  if (!exportCache.has(file)) exportCache.set(file, getExports(file));
  return exportCache.get(file);
}

const files = SRC_DIRS.flatMap((d) => listFiles(path.join(ROOT, d)));
let problems = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  // La clause ne peut contenir que des identifiants/accolades/virgules : empêche
  // la regex d'enjamber plusieurs déclarations d'import.
  const importRe = /import\s+([A-Za-z0-9_$*\s,{}]+?)\s+from\s*['"](\.{1,2}\/[^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src))) {
    const clause = m[1].trim();
    const spec = m[2];
    const rel = path.relative(ROOT, file);
    const target = resolveImport(file, spec);
    if (!target) {
      console.log(`❌ ${rel} : fichier introuvable pour import '${spec}'`);
      problems++;
      continue;
    }
    if (path.extname(target) === '.json') continue;
    const exps = cachedExports(target);
    // default import
    const defaultMatch = clause.match(/^([A-Za-z0-9_$]+)\s*(?:,|$)/);
    if (defaultMatch && !exps.hasDefault) {
      console.log(`❌ ${rel} : import default '${defaultMatch[1]}' mais pas d'export default dans '${spec}'`);
      problems++;
    }
    // named imports
    const namedMatch = clause.match(/\{([^}]*)\}/);
    if (namedMatch) {
      for (const part of namedMatch[1].split(',')) {
        const p = part.trim();
        if (!p) continue;
        const asMatch = p.match(/^(.+?)\s+as\s+.+$/);
        const name = (asMatch ? asMatch[1] : p).trim();
        if (name === 'default') continue;
        if (!exps.named.has(name)) {
          console.log(`❌ ${rel} : import nommé '${name}' introuvable dans '${spec}'`);
          problems++;
        }
      }
    }
  }
}

console.log(problems === 0 ? '✅ Aucun problème d\'import détecté' : `\n${problems} problème(s) détecté(s)`);
process.exit(problems ? 1 : 0);
