/**
 * Script pour vérifier la configuration du stockage média
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const MEDIA_STORAGE = (process.env.MEDIA_STORAGE || 'local').toLowerCase();
const PUBLIC_URL = process.env.PUBLIC_URL;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL;

console.log('📊 Configuration du stockage média:\n');
console.log(`MEDIA_STORAGE: ${MEDIA_STORAGE}`);
console.log(`PUBLIC_URL: ${PUBLIC_URL || '❌ NON CONFIGURÉ'}`);

if (MEDIA_STORAGE === 'r2') {
  console.log('\n🔵 Configuration R2:');
  console.log(`R2_ENDPOINT: ${R2_ENDPOINT ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
  console.log(`R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
  console.log(`R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? '✅ Configuré' : '❌ NON CONFIGURÉ'}`);
  console.log(`R2_BUCKET: ${R2_BUCKET || '❌ NON CONFIGURÉ'}`);
  console.log(`R2_PUBLIC_BASE_URL: ${R2_PUBLIC_BASE_URL || '❌ NON CONFIGURÉ'}`);
  
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_BASE_URL) {
    console.log('\n⚠️  R2 n\'est pas complètement configuré. Les images seront stockées localement.');
  } else {
    console.log('\n✅ R2 est correctement configuré. Les images seront stockées sur Cloudflare R2.');
  }
} else {
  console.log('\n⚠️  Mode LOCAL activé.');
  console.log('   ⚠️  ATTENTION: Sur Railway, le stockage local est éphémère !');
  console.log('   Les fichiers seront perdus au redémarrage du service.');
  console.log('   💡 Solution: Configurer R2 (Cloudflare R2) pour un stockage permanent.');
}

console.log('\n📝 Recommandations:');
if (!PUBLIC_URL) {
  console.log('   ❌ PUBLIC_URL n\'est pas configuré sur Railway');
  console.log('   → Ajoutez PUBLIC_URL=https://api.nox.world');
}
if (MEDIA_STORAGE === 'local') {
  console.log('   ⚠️  MEDIA_STORAGE=local sur Railway (fichiers éphémères)');
  console.log('   → Pour un stockage permanent, configurez R2 et passez à MEDIA_STORAGE=r2');
}
