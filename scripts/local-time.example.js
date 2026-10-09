#!/usr/bin/env node
/**
 * Modèle pour `scripts/local-time.js` (non versionné, voir `.gitignore`).
 *
 * Installation : cp scripts/local-time.example.js scripts/local-time.js
 * Usage       : node scripts/local-time.js
 *
 * Affiche la date/heure du système où tourne Node.
 */

const now = new Date();

console.log('ISO      ', now.toISOString());
console.log('Locale   ', now.toString());
console.log(
  'FR (EU) ',
  now.toLocaleString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })
);
console.log('Timestamp', now.getTime());
