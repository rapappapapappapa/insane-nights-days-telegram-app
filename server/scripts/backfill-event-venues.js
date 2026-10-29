/**
 * Crée les EventVenue manquants pour les événements existants qui ont un venueId
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const eventsWithVenue = await prisma.event.findMany({
    where: { venueId: { not: null } },
    include: { eventVenues: true },
  });

  let created = 0;
  for (const event of eventsWithVenue) {
    if (event.eventVenues.length > 0) continue; // Déjà un EventVenue
    await prisma.eventVenue.create({
      data: {
        eventId: event.id,
        venueId: event.venueId,
        status: 'ACCEPTED', // Les événements existants sont considérés comme acceptés
      },
    });
    created++;
    console.log(`EventVenue créé pour event ${event.id} (${event.title})`);
  }
  console.log(`\n${created} EventVenue(s) créé(s).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
