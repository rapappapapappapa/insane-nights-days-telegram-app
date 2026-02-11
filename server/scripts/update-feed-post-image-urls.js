/**
 * Script pour mettre à jour les URLs d'images des posts du feed
 * qui utilisent des URLs temporaires (tunnels Cloudflare) vers l'URL permanente (Railway)
 */

const { PrismaClient } = require('@prisma/client');
const path = require('path');

const prisma = new PrismaClient();

// URL permanente du backend (Railway)
const PUBLIC_URL = process.env.PUBLIC_URL || 'https://insane-nights-days-telegram-app-production.up.railway.app';

async function updateFeedPostImageUrls() {
  try {
    console.log('🔄 Début de la mise à jour des URLs d\'images des posts du feed...');
    console.log(`📡 URL publique: ${PUBLIC_URL}`);

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
        (!post.imageUrl.startsWith(PUBLIC_URL) && post.imageUrl.includes('/uploads/media/'));

      if (isTemporaryUrl) {
        // Extraire le nom du fichier de l'URL
        const fileName = post.imageUrl.split('/').pop();
        
        // Construire la nouvelle URL avec PUBLIC_URL
        newUrl = `${PUBLIC_URL}/uploads/media/${fileName}`;
        
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
      console.log('\n✅ Aucune mise à jour nécessaire.');
      return;
    }

    // Demander confirmation
    console.log(`\n⚠️  ${updates.length} post(s) seront mis à jour.`);
    console.log('Pour exécuter les mises à jour, décommentez les lignes ci-dessous dans le script.');

    // Mettre à jour les URLs
    // for (const update of updates) {
    //   await prisma.feedPost.update({
    //     where: { id: update.id },
    //     data: { imageUrl: update.newUrl },
    //   });
    //   updatedCount++;
    //   console.log(`✅ Mis à jour: ${update.id}`);
    // }

    // console.log(`\n✨ Mise à jour terminée: ${updatedCount} post(s) mis à jour sur ${allPosts.length}`);

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
updateFeedPostImageUrls();
