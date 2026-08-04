/**
 * Script pour mettre à jour les URLs d'images des posts du feed
 * qui utilisent des URLs temporaires (tunnels Cloudflare) vers l'URL permanente (Railway)
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// URL permanente du backend (Railway)
// ✅ IMPORTANT: Utiliser l'URL Railway permanente, pas les tunnels temporaires
const RAILWAY_URL = 'https://api.nox.world';
const PUBLIC_URL_ENV = process.env.PUBLIC_URL || RAILWAY_URL;

// ✅ VÉRIFICATION: S'assurer qu'on n'utilise pas un tunnel temporaire
let finalPublicUrl;
if (PUBLIC_URL_ENV.includes('trycloudflare.com')) {
  console.warn('⚠️  ATTENTION: PUBLIC_URL pointe vers un tunnel temporaire !');
  console.warn('   Utilisation de l\'URL Railway permanente par défaut.');
  finalPublicUrl = RAILWAY_URL;
} else {
  finalPublicUrl = PUBLIC_URL_ENV;
}

async function updateFeedPostImageUrls() {
  try {
    console.log('🔄 Début de la mise à jour des URLs d\'images des posts du feed...');
    console.log(`📡 URL publique utilisée: ${finalPublicUrl}`);

    // Récupérer tous les posts avec des images
    const allPosts = await prisma.feedPost.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        id: true,
        imageUrl: true,
        createdAt: true,
      },
    });

    console.log(`📦 ${allPosts.length} post(s) avec image trouvé(s)`);

    let updatedCount = 0;
    const updates = [];

    for (const post of allPosts) {
      if (!post.imageUrl) continue;

      let newUrl = post.imageUrl;

      // Si l'URL contient un tunnel Cloudflare temporaire ou localhost, la mettre à jour
      const isTemporaryUrl = 
        post.imageUrl.includes('trycloudflare.com') ||
        post.imageUrl.includes('localhost') ||
        post.imageUrl.includes('127.0.0.1') ||
        (!post.imageUrl.startsWith(finalPublicUrl) && post.imageUrl.includes('/uploads/media/'));

      if (isTemporaryUrl) {
        // Extraire le nom du fichier de l'URL
        const fileName = post.imageUrl.split('/').pop();
        
        // Construire la nouvelle URL avec l'URL Railway permanente
        newUrl = `${finalPublicUrl}/uploads/media/${fileName}`;
        
        updates.push({
          id: post.id,
          oldUrl: post.imageUrl,
          newUrl: newUrl,
          createdAt: post.createdAt,
        });
      }
    }

    console.log(`\n📝 ${updates.length} post(s) à mettre à jour:`);
    updates.forEach((update, index) => {
      console.log(`\n${index + 1}. Post ID: ${update.id}`);
      console.log(`   Créé le: ${update.createdAt}`);
      console.log(`   Ancienne URL: ${update.oldUrl}`);
      console.log(`   Nouvelle URL: ${update.newUrl}`);
    });

    if (updates.length === 0) {
      console.log('\n✅ Aucune mise à jour nécessaire - toutes les URLs sont déjà correctes !');
      return;
    }

    console.log(`\n⚠️  ${updates.length} post(s) seront mis à jour.`);
    console.log('Exécution des mises à jour...\n');

    // Mettre à jour les URLs
    for (const update of updates) {
      await prisma.feedPost.update({
        where: { id: update.id },
        data: { imageUrl: update.newUrl },
      });
      updatedCount++;
      console.log(`✅ Mis à jour: ${update.id}`);
      console.log(`   ${update.oldUrl} → ${update.newUrl}`);
    }

    console.log(`\n✨ Mise à jour terminée: ${updatedCount} post(s) mis à jour sur ${allPosts.length}`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
updateFeedPostImageUrls();
