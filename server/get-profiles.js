const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getProfiles() {
  try {
    console.log('=== DJS ===');
    const djs = await prisma.userDj.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
    
    djs.forEach((dj) => {
      console.log(`UserDj.id: ${dj.id}`);
      console.log(`User.id: ${dj.userId}`);
      console.log(`Email: ${dj.user.email}`);
      console.log(`Username: ${dj.user.username}`);
      console.log(`ArtistName: ${dj.artistName}`);
      console.log('---');
    });

    console.log('\n=== BOOKERS ===');
    const bookers = await prisma.userBooker.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
    
    bookers.forEach((b) => {
      console.log(`UserBooker.id: ${b.id}`);
      console.log(`User.id: ${b.userId}`);
      console.log(`Email: ${b.user.email}`);
      console.log(`Username: ${b.user.username}`);
      console.log(`Nom: ${b.nom} ${b.prenom}`);
      console.log('---');
    });

    console.log('\n=== VENUES ===');
    const venues = await prisma.userVenue.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });
    
    venues.forEach((v) => {
      console.log(`UserVenue.id: ${v.id}`);
      console.log(`User.id: ${v.userId}`);
      console.log(`Email: ${v.user.email}`);
      console.log(`Username: ${v.user.username}`);
      console.log(`VenueName: ${v.venueName}`);
      console.log(`Address: ${v.address}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getProfiles();

