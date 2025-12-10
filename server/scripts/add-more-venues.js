const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function addMoreVenues() {
  try {
    console.log('🏢 Ajout de nouveaux lieux...\n');

    const venuesData = [
      {
        email: 'leclub@venue.com',
        username: 'leclub_paris',
        password: 'venue123456',
        venueName: 'Le Club',
        address: '28 Rue de la Soif, 75018 Paris, France',
      },
      {
        email: 'techno@venue.com',
        username: 'techno_warehouse',
        password: 'venue123456',
        venueName: 'Techno Warehouse',
        address: '15 Boulevard de la Techno, 69003 Lyon, France',
      },
      {
        email: 'sunset@venue.com',
        username: 'sunset_rooftop',
        password: 'venue123456',
        venueName: 'Sunset Rooftop',
        address: '22 Promenade des Anglais, 06000 Nice, France',
      },
      {
        email: 'basement@venue.com',
        username: 'basement_club',
        password: 'venue123456',
        venueName: 'The Basement',
        address: '7 Rue Souterraine, 33000 Bordeaux, France',
      },
      {
        email: 'crystal@venue.com',
        username: 'crystal_palace',
        password: 'venue123456',
        venueName: 'Crystal Palace',
        address: '42 Avenue des Lumières, 13008 Marseille, France',
      },
      {
        email: 'neon@venue.com',
        username: 'neon_nights',
        password: 'venue123456',
        venueName: 'Neon Nights',
        address: '19 Rue Électrique, 31000 Toulouse, France',
      },
      {
        email: 'vibe@venue.com',
        username: 'vibe_station',
        password: 'venue123456',
        venueName: 'Vibe Station',
        address: '33 Place de la Musique, 59000 Lille, France',
      },
      {
        email: 'pulse@venue.com',
        username: 'pulse_club',
        password: 'venue123456',
        venueName: 'Pulse Club',
        address: '11 Rue du Rythme, 67000 Strasbourg, France',
      },
    ];

    let created = 0;
    let skipped = 0;

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
          created++;
        } else {
          console.log(`⏭️  Profil lieu existe déjà pour: ${venueData.venueName}`);
          skipped++;
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
        created++;
      }
    }

    console.log(`\n✅ Terminé ! ${created} lieux créés, ${skipped} déjà existants.`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des lieux:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMoreVenues();

