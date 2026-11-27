/** Parse Babel rapide des fichiers passés en argument (détecte les erreurs de syntaxe JSX). */
const fs = require('fs');
const parser = require('@babel/parser');

let failed = false;
for (const file of process.argv.slice(2)) {
  try {
    parser.parse(fs.readFileSync(file, 'utf8'), {
      sourceType: 'module',
      plugins: ['jsx'],
    });
    console.log(`OK  ${file}`);
  } catch (e) {
    failed = true;
    console.error(`ERR ${file}: ${e.message}`);
  }
}
process.exit(failed ? 1 : 0);
