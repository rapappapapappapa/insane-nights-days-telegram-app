const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createVenuesAndAssignEvents() {
  try {
    console.log('🌱 Création des lieux et attribution des événements...\n');

    // 1. Vérifier les lieux existants
    const existingVenues = await prisma.userVenue.findMany({
      include: { user: true },
    });

    console.log(`📋 ${existingVenues.length} lieu(x) existant(s) trouvé(s)`);

    // 2. Si aucun lieu n'existe, en créer quelques-uns
    let venues = existingVenues;
    if (venues.length === 0) {
      console.log('📝 Création de nouveaux lieux...');
      
      const venuesData = [
        {
          venueName: 'Club Insane',
          address: '123 Rue de la Nuit, 75001 Paris',
          email: 'clubinsane@venue.com',
          username: 'clubinsane',
        },
        {
          venueName: 'Warehouse Underground',
          address: '45 Avenue de la Techno, 69001 Lyon',
          email: 'warehouse@venue.com',
          username: 'warehouse',
        },
        {
          venueName: 'Le Bunker',
          address: '78 Boulevard de la Musique, 13001 Marseille',
          email: 'bunker@venue.com',
          username: 'bunker',
        },
        {
          venueName: 'Le Rex Club',
          address: '5 Boulevard Poissonnière, 75002 Paris',
          email: 'rexclub@venue.com',
          username: 'rexclub',
        },
        {
          venueName: 'La Machine du Moulin Rouge',
          address: '90 Boulevard de Clichy, 75018 Paris',
          email: 'machine@venue.com',
          username: 'machine',
        },
      ];

      for (const venueData of venuesData) {
        // Vérifier si l'utilisateur existe déjà
        let venueUser = await prisma.user.findFirst({
          where: { email: venueData.email },
        });

        if (!venueUser) {
          venueUser = await prisma.user.create({
            data: {
              email: venueData.email,
              username: venueData.username,
              password: 'hashed_password_placeholder', // En production, utiliser bcrypt
              accountType: 'VENUE',
              activeProfileType: 'VENUE',
            },
          });
        }

        const venue = await prisma.userVenue.create({
          data: {
            userId: venueUser.id,
            venueName: venueData.venueName,
            address: venueData.address,
          },
        });

        venues.push({ ...venue, user: venueUser });
        console.log(`✅ Lieu créé: ${venueData.venueName}`);
      }
    }

    // 3. Récupérer tous les événements sans lieu
    const eventsWithoutVenue = await prisma.event.findMany({
      where: { venueId: null },
    });

    console.log(`\n📅 ${eventsWithoutVenue.length} événement(s) sans lieu trouvé(s)`);

    // 4. Attribuer un lieu à chaque événement sans lieu
    let assignedCount = 0;
    for (let i = 0; i < eventsWithoutVenue.length; i++) {
      const event = eventsWithoutVenue[i];
      // Distribuer les événements parmi les lieux disponibles
      const venueIndex = i % venues.length;
      const venue = venues[venueIndex];

      await prisma.event.update({
        where: { id: event.id },
        data: { venueId: venue.id },
      });

      console.log(`✅ Événement "${event.title}" attribué à "${venue.venueName}"`);
      assignedCount++;
    }

    // 5. Afficher un résumé
    console.log('\n📊 Résumé:');
    console.log(`   - Lieux disponibles: ${venues.length}`);
    console.log(`   - Événements attribués: ${assignedCount}`);

    // 6. Afficher la répartition
    const eventsByVenue = await prisma.event.groupBy({
      by: ['venueId'],
      _count: { id: true },
    });

    console.log('\n📋 Répartition des événements par lieu:');
    for (const group of eventsByVenue) {
      if (group.venueId) {
        const venue = venues.find(v => v.id === group.venueId);
        if (venue) {
          console.log(`   - ${venue.venueName}: ${group._count.id} événement(s)`);
        }
      }
    }

    console.log('\n✅ Terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de la création des lieux:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createVenuesAndAssignEvents();

