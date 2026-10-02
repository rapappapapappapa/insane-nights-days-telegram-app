/**
 * Recopie les builds legacy PDF.js depuis node_modules vers assets/pdfjs (*.pdfjs)
 * pour le rendu hors-ligne dans le WebView Android. Exécuté en postinstall.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'node_modules', 'pdfjs-dist', 'legacy', 'build');
const destDir = path.join(root, 'assets', 'pdfjs');

const mainSrc = path.join(srcDir, 'pdf.min.js');
const workerSrc = path.join(srcDir, 'pdf.worker.min.js');

if (!fs.existsSync(mainSrc) || !fs.existsSync(workerSrc)) {
  console.warn('[copy-pdfjs-assets] pdfjs-dist legacy build introuvable, skip (npm install pdfjs-dist ?)');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(mainSrc, path.join(destDir, 'pdf.min.pdfjs'));
fs.copyFileSync(workerSrc, path.join(destDir, 'pdf.worker.min.pdfjs'));
console.log('[copy-pdfjs-assets] OK → assets/pdfjs/');
