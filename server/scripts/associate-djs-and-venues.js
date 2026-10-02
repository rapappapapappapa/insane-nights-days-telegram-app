const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function associateDjsAndVenues() {
  try {
    console.log('🎧 Association des DJs aux événements...\n');

    // Récupérer tous les DJs
    const allDjs = await prisma.userDj.findMany({
      include: {
        user: true,
      },
    });

    console.log(`📊 ${allDjs.length} DJs trouvés dans la base\n`);

    // Récupérer tous les événements
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: {
        eventDjs: true,
        venue: true,
      },
    });

    console.log(`📅 ${events.length} événements trouvés\n`);

    // Mapping des DJs par nom d'artiste
    const djsMap = new Map();
    allDjs.forEach((dj) => {
      djsMap.set(dj.artistName, {
        userDj: dj,
        userId: dj.userId,
      });
    });

    for (const event of events) {
      console.log(`\n🎵 Traitement de: ${event.title} (Genre: ${event.genre})`);

      // Assignation selon le genre de l'événement
      let djNamesToAssign = [];
      
      if (event.genre === 'Electro' || event.title.includes('Electro') || event.title.includes('Nox Night')) {
        djNamesToAssign = ['DJ NEON', 'MIXMASTER NOVA'];
      } else if (event.genre === 'Drum & Bass' || event.title.includes('Bass Revolution') || event.title.includes('Drum')) {
        djNamesToAssign = ['BASS STORM', 'DJ CYBER'];
      } else if (event.genre === 'Techno' || event.title.includes('Techno') || event.title.includes('Underground')) {
        djNamesToAssign = ['TECHNO MASTER', 'KAYZEN'];
      } else {
        // Par défaut, utiliser Electro
        djNamesToAssign = ['DJ NEON', 'MIXMASTER NOVA'];
      }

      // Associer les DJs à l'événement
      for (const djName of djNamesToAssign) {
        const djData = djsMap.get(djName);
        if (djData) {
          // Vérifier si l'association existe déjà
          const existing = await prisma.eventDj.findFirst({
            where: {
              eventId: event.id,
              djId: djData.userId, // User.id
            },
          });

          if (!existing) {
            await prisma.eventDj.create({
              data: {
                eventId: event.id,
                djId: djData.userId, // User.id
              },
            });
            console.log(`  ✅ ${djName} associé`);
          } else {
            console.log(`  ⏭️  ${djName} déjà associé`);
          }
        } else {
          console.log(`  ⚠️  DJ non trouvé: ${djName}`);
        }
      }

      // Créer ou associer un lieu (venue) si l'événement n'en a pas
      if (!event.venueId) {
        console.log(`  🏢 Création d'un lieu pour l'événement...`);

        // Extraire le nom du lieu depuis la location
        const venueName = event.location.split(',')[0].trim();
        const address = event.location;

        // Vérifier si un lieu avec ce nom existe déjà
        let venue = await prisma.userVenue.findFirst({
          where: {
            venueName: venueName,
          },
        });

        if (!venue) {
          // Créer un utilisateur pour le lieu
          const venueEmail = `${venueName.toLowerCase().replace(/\s+/g, '')}@venue.com`;
          const venueUsername = venueName.toLowerCase().replace(/\s+/g, '');

          // Vérifier si l'utilisateur existe déjà
          let venueUser = await prisma.user.findUnique({
            where: { email: venueEmail },
          });

          if (!venueUser) {
            const hashedPassword = await bcrypt.hash('venue123456', 10);
            venueUser = await prisma.user.create({
              data: {
                email: venueEmail,
                username: venueUsername,
                password: hashedPassword,
                score: 0,
                level: 1,
                activeProfileType: 'VENUE',
                accountType: 'VENUE',
              },
            });
            console.log(`    ✅ Utilisateur créé: ${venueUsername}`);
          }

          // Créer le profil venue
          venue = await prisma.userVenue.create({
            data: {
              userId: venueUser.id,
              venueName: venueName,
              address: address,
            },
          });
          console.log(`    ✅ Lieu créé: ${venueName}`);
        }

        // Associer le lieu à l'événement
        await prisma.event.update({
          where: { id: event.id },
          data: { venueId: venue.id },
        });
        console.log(`    ✅ Lieu associé à l'événement`);
      } else {
        console.log(`  ⏭️  Lieu déjà associé: ${event.venue?.venueName || 'ID: ' + event.venueId}`);
      }
    }

    console.log('\n📊 Résumé final:');
    
    // Afficher les associations finales
    const finalEvents = await prisma.event.findMany({
      include: {
        eventDjs: {
          include: {
            event: false,
          },
        },
        venue: true,
      },
      orderBy: { date: 'asc' },
    });

    for (const event of finalEvents) {
      console.log(`\n🎯 ${event.title}:`);
      
      // Afficher les DJs
      if (event.eventDjs && event.eventDjs.length > 0) {
        console.log(`  🎧 DJs:`);
        for (const ed of event.eventDjs) {
          const dj = await prisma.userDj.findFirst({
            where: { userId: ed.djId },
          });
          if (dj) {
            console.log(`    - ${dj.artistName}`);
          }
        }
      } else {
        console.log(`  ⚠️  Aucun DJ associé`);
      }

      // Afficher le lieu
      if (event.venue) {
        console.log(`  🏢 Lieu: ${event.venue.venueName} (${event.venue.address})`);
      } else {
        console.log(`  ⚠️  Aucun lieu associé`);
      }
    }

    console.log('\n✅ Terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

associateDjsAndVenues();

