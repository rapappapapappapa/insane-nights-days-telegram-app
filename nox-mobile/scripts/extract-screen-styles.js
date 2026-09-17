/**
 * Extrait le bloc `const styles = StyleSheet.create({...});` d'un écran
 * vers un fichier frère `X.styles.js`, et le remplace par un import.
 * Vérifie la syntaxe des deux fichiers, annule en cas d'échec.
 * Usage : node scripts/extract-screen-styles.js screens/foo/Bar.js ...
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function findStylesBlock(src) {
  const marker = 'const styles = StyleSheet.create({';
  const start = src.indexOf(marker);
  if (start === -1) return null;
  let i = start + marker.length;
  let depth = 1;
  let inStr = null;
  while (i < src.length && depth > 0) {
    const c = src[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === inStr) inStr = null;
    } else if (c === "'" || c === '"' || c === '`') {
      inStr = c;
    } else if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  // consommer `);` et fin de ligne
  while (i < src.length && (src[i] === ')' || src[i] === ';' || src[i] === ' ')) i++;
  if (src[i] === '\n') i++;
  return { start, end: i };
}

function depthOfImport(file) {
  // screens/foo/Bar.js -> ../../constants/colors
  const rel = path.relative(path.dirname(file), 'constants/colors');
  return rel.replace(/\\/g, '/');
}

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  const block = findStylesBlock(src);
  if (!block) {
    console.error(`= pas de bloc styles : ${file}`);
    continue;
  }
  const stylesBody = src.slice(block.start, block.end);
  const base = file.replace(/\.js$/, '');
  const stylesFile = `${base}.styles.js`;
  if (fs.existsSync(stylesFile)) {
    console.error(`! existe déjà : ${stylesFile}`);
    continue;
  }

  const needsColors = /\bColors\./.test(stylesBody);
  const needsPlatform = /\bPlatform\./.test(stylesBody);
  const needsDimensions = /\bDimensions\./.test(stylesBody) || /SCREEN_HEIGHT|SCREEN_WIDTH/.test(stylesBody);

  const rnImports = ['StyleSheet'];
  if (needsPlatform) rnImports.push('Platform');
  if (needsDimensions) rnImports.push('Dimensions');

  let header = `import { ${rnImports.join(', ')} } from 'react-native';\n`;
  if (needsColors) header += `import Colors from '${depthOfImport(file)}';\n`;
  if (/SCREEN_HEIGHT/.test(stylesBody)) {
    header += `\nconst { height: SCREEN_HEIGHT } = Dimensions.get('window');\n`;
  }
  if (/SCREEN_WIDTH/.test(stylesBody)) {
    header += `const { width: SCREEN_WIDTH } = Dimensions.get('window');\n`;
  }

  const exported = stylesBody.replace('const styles = StyleSheet.create({', 'export const styles = StyleSheet.create({');
  fs.writeFileSync(stylesFile, `${header}\n${exported}`);

  const relImport = `./${path.basename(base)}.styles`;
  let newSrc = src.slice(0, block.start) + src.slice(block.end);
  // Injecter l'import après le dernier import existant
  const importRe = /^import .*?;$/gm;
  let lastImportEnd = 0;
  let m;
  while ((m = importRe.exec(newSrc)) !== null) lastImportEnd = m.index + m[0].length;
  newSrc =
    newSrc.slice(0, lastImportEnd) +
    `\nimport { styles } from '${relImport}';` +
    newSrc.slice(lastImportEnd);
  fs.writeFileSync(file, newSrc);

  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    execSync(`node --check "${stylesFile}"`, { stdio: 'pipe' });
    console.error(`✓ ${file} → ${stylesFile}`);
  } catch (e) {
    fs.writeFileSync(file, src);
    fs.unlinkSync(stylesFile);
    console.error(`✗ REVERT : ${file}`);
  }
}
