/**
 * Télécharge le bundle de la dernière update EAS (canal/plateforme donnés)
 * et vérifie quelles chaînes il contient (ancien vs nouveau design).
 * Usage : node scripts/fetch-ota-bundle.js [channel] [platform]
 */
const fs = require('fs');
const path = require('path');

const CHANNEL = process.argv[2] || 'production';
const PLATFORM = process.argv[3] || 'ios';
const URL = 'https://u.expo.dev/a1612b7f-f046-4ead-9ca4-584c238abb20';

const NEEDLES = [
  'Espace lieu',
  'Tableau de bord lieu',
  'lieuxDemandes',
  'lieuxDashboard',
  'resolveVenuePushNavigation',
  'shouldShowDrawerMenuButton',
];

async function main() {
  const res = await fetch(URL, {
    headers: {
      'expo-protocol-version': '1',
      'expo-platform': PLATFORM,
      'expo-runtime-version': '1.0.0',
      'expo-channel-name': CHANNEL,
      accept: 'multipart/mixed',
    },
  });
  const raw = await res.text();
  const parts = raw.split(/--[A-Za-z0-9'()+_,\-./:=? ]+\r?\n/);
  let manifest, ext;
  for (const p of parts) {
    const idx = p.indexOf('\r\n\r\n');
    if (idx < 0) continue;
    const h = p.slice(0, idx);
    const body = p.slice(idx + 4, p.lastIndexOf('}') + 1);
    if (h.includes('name="manifest"')) manifest = JSON.parse(body);
    if (h.includes('name="extensions"')) ext = JSON.parse(body);
  }
  console.log('update id:', manifest.id, '| créée le:', manifest.createdAt);
  const la = manifest.launchAsset;
  const auth = ext.assetRequestHeaders[la.key]?.authorization;
  const bres = await fetch(la.url, { headers: auth ? { authorization: auth } : {} });
  const buf = Buffer.from(await bres.arrayBuffer());
  const out = path.join(__dirname, '..', `ota-bundle-${CHANNEL}-${PLATFORM}.hbc`);
  fs.writeFileSync(out, buf);
  console.log('bundle:', out, '| taille:', buf.length, '| magic:', buf.slice(0, 8).toString('hex'));
  for (const s of NEEDLES) {
    const ascii = buf.includes(Buffer.from(s, 'utf8'));
    const utf16 = buf.includes(Buffer.from(s, 'utf16le'));
    console.log(JSON.stringify(s), '→ ascii:', ascii, '| utf16:', utf16);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
