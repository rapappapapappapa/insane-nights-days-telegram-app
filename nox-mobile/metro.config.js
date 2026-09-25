// Permet de traiter *.pdfjs comme assets statiques (bundles PDF.js pour le WebView Android).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push('pdfjs');

module.exports = config;
