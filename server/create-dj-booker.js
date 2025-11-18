const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createDjAndBooker() {
  try {
    // Vérifier si le DJ existe déjà
    let djUser = await prisma.user.findUnique({
      where: { email: 'kayzen@dj.com' },
      include: { dj: true },
    });

    let dj;
    if (!djUser || !djUser.dj) {
      // Créer un DJ
      const djPassword = await bcrypt.hash('dj123456', 10);
      djUser = await prisma.user.create({
        data: {
          email: 'kayzen@dj.com',
          username: 'kayzen',
          password: djPassword,
          accountType: 'DJ',
        },
      });

      dj = await prisma.userDj.create({
        data: {
          userId: djUser.id,
          artistName: 'KAYZEN',
          city: 'Lyon',
          phone: '+33612345678',
          birthDate: '1990-05-15',
        },
      });
      console.log('✅ DJ créé:');
    } else {
      dj = djUser.dj;
      console.log('✅ DJ existe déjà:');
    }

    console.log(`  UserDj.id: ${dj.id}`);
    console.log(`  User.id: ${djUser.id}`);
    console.log(`  Email: ${djUser.email}`);
    console.log(`  Username: ${djUser.username}`);
    console.log(`  ArtistName: ${dj.artistName}`);

    // Vérifier si le Booker existe déjà
    let bookerUser = await prisma.user.findUnique({
      where: { email: 'booker@example.com' },
      include: { booker: true },
    });

    let booker;
    if (!bookerUser || !bookerUser.booker) {
      // Créer un Booker
      const bookerPassword = await bcrypt.hash('booker123456', 10);
      bookerUser = await prisma.user.create({
        data: {
          email: 'booker@example.com',
          username: 'bookerpro',
          password: bookerPassword,
          accountType: 'BOOKER',
        },
      });

      booker = await prisma.userBooker.create({
        data: {
          userId: bookerUser.id,
          nom: 'Martin',
          prenom: 'Jean',
          phonePro: '+33698765432',
          bookerType: 'Indépendant',
        },
      });
      console.log('\n✅ Booker créé:');
    } else {
      booker = bookerUser.booker;
      console.log('\n✅ Booker existe déjà:');
    }

    console.log('✅ Booker:');
    console.log(`  UserBooker.id: ${booker.id}`);
    console.log(`  User.id: ${bookerUser.id}`);
    console.log(`  Email: ${bookerUser.email}`);
    console.log(`  Username: ${bookerUser.username}`);
    console.log(`  Nom: ${booker.nom} ${booker.prenom}`);

    // Associer le DJ aux événements existants
    const events = await prisma.event.findMany();
    for (const event of events) {
      // Vérifier si le DJ n'est pas déjà associé
      const existingDj = await prisma.eventDj.findFirst({
        where: {
          eventId: event.id,
          djId: dj.id,
        },
      });

      if (!existingDj) {
        await prisma.eventDj.create({
          data: {
            eventId: event.id,
            djId: dj.id,
          },
        });
        console.log(`✅ DJ associé à l'événement: ${event.title}`);
      }
    }

    // Associer le booker au premier événement (bookerId est le UserBooker.id selon le schéma)
    if (events.length > 0 && booker) {
      try {
        await prisma.event.update({
          where: { id: events[0].id },
          data: { bookerId: booker.id }, // bookerId pointe vers UserBooker.id
        });
        console.log(`✅ Booker associé à l'événement: ${events[0].title}`);
      } catch (error) {
        console.log(`⚠️  Impossible d'associer le booker (peut-être déjà associé): ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDjAndBooker();

