const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedVenues() {
  try {
    console.log('🏢 Création des lieux (venues)...\n');

    const venuesData = [
      {
        email: 'deepvibes@venue.com',
        username: 'deepvibesclub',
        password: 'venue123456',
        venueName: 'Deep Vibes Club',
        address: '12 Rue des Nuits, 75011 Paris, France',
      },
      {
        email: 'warehouse@venue.com',
        username: 'warehouse_lyon',
        password: 'venue123456',
        venueName: 'The Warehouse Lyon',
        address: '45 Quai Industriel, 69002 Lyon, France',
      },
      {
        email: 'rooftop@venue.com',
        username: 'skyline_rooftop',
        password: 'venue123456',
        venueName: 'Skyline Rooftop',
        address: '8 Avenue des Étoiles, 13001 Marseille, France',
      },
      {
        email: 'underground@venue.com',
        username: 'underground_paris',
        password: 'venue123456',
        venueName: 'Underground Paris',
        address: '5 Passage Secret, 75003 Paris, France',
      },
    ];

    for (const venueData of venuesData) {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: venueData.email },
        include: { venues: true },
      });

      if (existingUser) {
        // Si l'utilisateur existe mais n'a pas de profil Venue avec ce nom, en créer un
        const hasVenueProfile =
          existingUser.venues &&
          existingUser.venues.some(
            (venue) => venue.venueName === venueData.venueName
          );

        if (!hasVenueProfile) {
          await prisma.userVenue.create({
            data: {
              userId: existingUser.id,
              venueName: venueData.venueName,
              address: venueData.address,
            },
          });
          console.log(`✅ Profil lieu créé pour: ${venueData.venueName}`);
        } else {
          console.log(`⏭️  Profil lieu existe déjà pour: ${venueData.venueName}`);
        }
      } else {
        // Créer l'utilisateur et son profil Venue
        const hashedPassword = await bcrypt.hash(venueData.password, 10);

        const user = await prisma.user.create({
          data: {
            email: venueData.email,
            username: venueData.username,
            password: hashedPassword,
            score: 0,
            level: 1,
            activeProfileType: 'VENUE',
            accountType: 'VENUE',
          },
        });

        await prisma.userVenue.create({
          data: {
            userId: user.id,
            venueName: venueData.venueName,
            address: venueData.address,
          },
        });

        console.log(`✅ Lieu créé: ${venueData.venueName} (${venueData.address})`);
      }
    }

    console.log('\n✅ Seed des lieux terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seed des lieux:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedVenues();


