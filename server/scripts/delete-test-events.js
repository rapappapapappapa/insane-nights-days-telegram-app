const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteTestEvents() {
  try {
    console.log('🔍 Recherche des événements "test"...');
    
    // Récupérer tous les événements et filtrer ceux contenant "test" (case-insensitive)
    const allEvents = await prisma.event.findMany();
    const testEvents = allEvents.filter((event) =>
      event.title.toLowerCase().includes('test')
    );

    if (testEvents.length === 0) {
      console.log('✅ Aucun événement "test" trouvé.');
      return;
    }

    console.log(`📋 ${testEvents.length} événement(s) "test" trouvé(s) :`);
    testEvents.forEach((event) => {
      console.log(`   - ${event.title} (ID: ${event.id})`);
    });

    // Supprimer les EventDj associés (cascade)
    await prisma.eventDj.deleteMany({
      where: {
        eventId: {
          in: testEvents.map((e) => e.id),
        },
      },
    });

    // Supprimer les événements
    const result = await prisma.event.deleteMany({
      where: {
        id: {
          in: testEvents.map((e) => e.id),
        },
      },
    });

    console.log(`✅ ${result.count} événement(s) "test" supprimé(s) avec succès.`);
  } catch (error) {
    console.error('❌ Erreur lors de la suppression des événements "test":', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteTestEvents();

