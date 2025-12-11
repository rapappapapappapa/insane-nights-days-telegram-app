require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteVenue() {
  try {
    const searchTerm = 'parano69100';
    const venueName = 'housedeouf';
    
    console.log(`🔍 Recherche de l'utilisateur "${searchTerm}"...`);
    
    // Chercher par username ou email (SQLite ne supporte pas mode insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: searchTerm } },
          { email: { contains: searchTerm } },
        ],
      },
      include: {
        venues: true,
      },
    });
    
    if (!user) {
      console.log(`❌ Utilisateur "${searchTerm}" non trouvé.`);
      console.log(`\n🔍 Recherche du lieu "${venueName}" dans tous les utilisateurs...`);
      
      // Chercher directement le lieu
      const venue = await prisma.userVenue.findFirst({
        where: {
          venueName: { contains: venueName },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });
      
      if (venue) {
        console.log(`✅ Lieu trouvé: ${venue.venueName} (ID: ${venue.id})`);
        console.log(`👤 Propriétaire: ${venue.user.username} (${venue.user.email})`);
        console.log(`📍 Adresse: ${venue.address}`);
        
        // Vérifier s'il y a des événements associés
        const eventsCount = await prisma.event.count({
          where: { venueId: venue.id },
        });
        
        if (eventsCount > 0) {
          console.log(`⚠️  Attention: ${eventsCount} événement(s) associé(s) à ce lieu.`);
        }
        
        // Supprimer le lieu
        await prisma.userVenue.delete({
          where: { id: venue.id },
        });
        
        console.log(`✅ Lieu "${venue.venueName}" supprimé avec succès !`);
        return;
      } else {
        console.log(`❌ Lieu "${venueName}" non trouvé.`);
        return;
      }
    }
    
    console.log(`✅ Utilisateur trouvé: ${user.email} (ID: ${user.id})`);
    console.log(`📋 Profils venue trouvés: ${user.venues.length}`);
    
    // Trouver le lieu "housedeouf"
    const venue = user.venues.find(v => 
      v.venueName.toLowerCase().includes(venueName.toLowerCase())
    );
    
    if (!venue) {
      console.log(`❌ Lieu "${venueName}" non trouvé pour l'utilisateur "${username}".`);
      console.log(`📋 Lieux disponibles:`);
      user.venues.forEach(v => {
        console.log(`   - ${v.venueName} (ID: ${v.id})`);
      });
      return;
    }
    
    console.log(`✅ Lieu trouvé: ${venue.venueName} (ID: ${venue.id})`);
    console.log(`📍 Adresse: ${venue.address}`);
    
    // Vérifier s'il y a des événements associés
    const eventsCount = await prisma.event.count({
      where: { venueId: venue.id },
    });
    
    if (eventsCount > 0) {
      console.log(`⚠️  Attention: ${eventsCount} événement(s) associé(s) à ce lieu.`);
      console.log(`   Les événements ne seront pas supprimés, mais le lieu sera retiré.`);
    }
    
    // Supprimer le lieu
    await prisma.userVenue.delete({
      where: { id: venue.id },
    });
    
    console.log(`✅ Lieu "${venue.venueName}" supprimé avec succès !`);
    
    // Vérifier si l'utilisateur a d'autres profils venue
    const remainingVenues = await prisma.userVenue.count({
      where: { userId: user.id },
    });
    
    if (remainingVenues === 0 && user.activeProfileType === 'VENUE') {
      console.log(`ℹ️  L'utilisateur n'a plus de profil venue.`);
      console.log(`   Le activeProfileType reste "${user.activeProfileType}" mais peut être changé manuellement.`);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la suppression:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteVenue();

