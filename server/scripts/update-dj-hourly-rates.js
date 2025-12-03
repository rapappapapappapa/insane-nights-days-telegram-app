const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateDjHourlyRates() {
  try {
    console.log('🔍 Recherche des profils DJ sans hourlyRate...');
    
    const djsWithoutRate = await prisma.userDj.findMany({
      where: {
        OR: [
          { hourlyRate: null },
          { hourlyRate: 0 },
        ],
      },
    });

    if (djsWithoutRate.length === 0) {
      console.log('✅ Tous les DJs ont déjà un hourlyRate défini.');
      return;
    }

    console.log(`📋 ${djsWithoutRate.length} profil(s) DJ trouvé(s) sans hourlyRate :`);

    // Mettre à jour avec des valeurs par défaut (entre 50 et 200 €/h)
    const updates = djsWithoutRate.map((dj, index) => {
      // Générer un taux aléatoire entre 50 et 200, ou utiliser performanceRate si disponible
      const hourlyRate = dj.performanceRate 
        ? Math.round(dj.performanceRate / 4) // Si performanceRate existe, on divise par 4 pour avoir un taux horaire
        : 50 + (index % 6) * 25; // Sinon, on génère un taux entre 50 et 200 par pas de 25

      return prisma.userDj.update({
        where: { id: dj.id },
        data: { hourlyRate: hourlyRate },
      });
    });

    await Promise.all(updates);

    console.log(`✅ ${djsWithoutRate.length} profil(s) DJ mis à jour avec succès.`);
    
    // Afficher un résumé
    const updatedDjs = await prisma.userDj.findMany({
      where: {
        id: { in: djsWithoutRate.map((d) => d.id) },
      },
      select: {
        id: true,
        artistName: true,
        hourlyRate: true,
        performanceRate: true,
      },
    });

    console.log('\n📊 Résumé des mises à jour :');
    updatedDjs.forEach((dj) => {
      console.log(`   - ${dj.artistName || 'DJ sans nom'}: ${dj.hourlyRate} €/h`);
    });
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des hourlyRate:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateDjHourlyRates();

