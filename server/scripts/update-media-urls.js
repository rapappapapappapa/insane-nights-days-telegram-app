/**
 * Script pour mettre à jour les URLs des médias dans la base de données
 * Remplace les URLs locales (localhost) par l'URL publique du tunnel Cloudflare
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PUBLIC_URL = process.env.PUBLIC_URL || 'https://tion-filters-message-return.trycloudflare.com';

async function updateMediaUrls() {
  try {
    console.log('🔄 Début de la mise à jour des URLs des médias...');
    console.log(`📡 URL publique: ${PUBLIC_URL}`);

    // Récupérer tous les médias
    const allMedia = await prisma.djMedia.findMany({
      select: {
        id: true,
        url: true,
        type: true,
      },
    });

    console.log(`📦 ${allMedia.length} média(x) trouvé(s)`);

    let updatedCount = 0;
    const updates = [];

    for (const media of allMedia) {
      let newUrl = media.url;

      // Si l'URL contient localhost ou une ancienne URL trycloudflare, la mettre à jour
      if (media.url.includes('localhost') || 
          media.url.includes('127.0.0.1') ||
          (media.url.includes('trycloudflare.com') && !media.url.includes(PUBLIC_URL.replace('https://', '').split('.')[0]))) {
        
        // Extraire le nom du fichier de l'URL
        const fileName = media.url.split('/').pop();
        
        // Construire la nouvelle URL avec PUBLIC_URL
        newUrl = `${PUBLIC_URL}/uploads/media/${fileName}`;
        
        updates.push({
          id: media.id,
          oldUrl: media.url,
          newUrl: newUrl,
        });
      }
    }

    // Mettre à jour les URLs
    for (const update of updates) {
      await prisma.djMedia.update({
        where: { id: update.id },
        data: { url: update.newUrl },
      });
      updatedCount++;
      console.log(`✅ Mis à jour: ${update.id}`);
      console.log(`   Ancienne: ${update.oldUrl}`);
      console.log(`   Nouvelle: ${update.newUrl}`);
    }

    console.log(`\n✨ Mise à jour terminée: ${updatedCount} média(x) mis à jour sur ${allMedia.length}`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updateMediaUrls();

