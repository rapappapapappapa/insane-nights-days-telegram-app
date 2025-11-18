const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script pour mettre à jour automatiquement les statuts des événements
 * Basé sur la date de l'événement :
 * - UPCOMING : date > maintenant + 1 heure (événement dans plus d'1h)
 * - ONGOING : maintenant - 1 heure <= date <= maintenant + 1 heure (événement en cours)
 * - FINISHED : date < maintenant - 1 heure (événement terminé depuis plus d'1h)
 */
async function updateEventStatuses() {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Mettre à jour les événements terminés
    const finishedCount = await prisma.event.updateMany({
      where: {
        date: {
          lt: oneHourAgo,
        },
        status: {
          not: 'FINISHED',
        },
      },
      data: {
        status: 'FINISHED',
      },
    });

    // Mettre à jour les événements en cours
    const ongoingCount = await prisma.event.updateMany({
      where: {
        date: {
          gte: oneHourAgo,
          lte: oneHourLater,
        },
        status: {
          not: 'ONGOING',
        },
      },
      data: {
        status: 'ONGOING',
      },
    });

    // Mettre à jour les événements à venir
    const upcomingCount = await prisma.event.updateMany({
      where: {
        date: {
          gt: oneHourLater,
        },
        status: {
          not: 'UPCOMING',
        },
      },
      data: {
        status: 'UPCOMING',
      },
    });

    console.log(`✅ Statuts mis à jour:`);
    console.log(`   - ${finishedCount.count} événement(s) terminé(s)`);
    console.log(`   - ${ongoingCount.count} événement(s) en cours`);
    console.log(`   - ${upcomingCount.count} événement(s) à venir`);
  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour des statuts:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la mise à jour
updateEventStatuses();

