// Permet de traiter *.pdfjs comme assets statiques (bundles PDF.js pour le WebView Android).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('pdfjs');

// Machines modestes (OTA locale) : METRO_MAX_WORKERS=1 évite de saturer la RAM pendant `eas update`.
if (process.env.METRO_MAX_WORKERS) {
  config.maxWorkers = Math.max(1, Number(process.env.METRO_MAX_WORKERS) || 1);
}

module.exports = config;
