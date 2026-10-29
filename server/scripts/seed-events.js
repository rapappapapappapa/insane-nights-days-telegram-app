const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedEvents() {
  try {
    console.log('🌱 Création des lieux fictifs...');

    // Créer des lieux fictifs
    const venues = [
      {
        venueName: 'Club Nox',
        address: '123 Rue de la Nuit, 75001 Paris',
      },
      {
        venueName: 'Warehouse Underground',
        address: '45 Avenue de la Techno, 69001 Lyon',
      },
      {
        venueName: 'Le Bunker',
        address: '78 Boulevard de la Musique, 13001 Marseille',
      },
    ];

    const createdVenues = [];
    for (const venueData of venues) {
      // Créer un utilisateur pour chaque lieu
      const venueUser = await prisma.user.create({
        data: {
          email: `${venueData.venueName.toLowerCase().replace(/\s+/g, '')}@venue.com`,
          username: venueData.venueName.toLowerCase().replace(/\s+/g, ''),
          password: 'hashed_password_placeholder', // En production, utiliser bcrypt
          accountType: 'VENUE',
        },
      });

      const venue = await prisma.userVenue.create({
        data: {
          userId: venueUser.id,
          venueName: venueData.venueName,
          address: venueData.address,
        },
      });

      createdVenues.push({ ...venue, user: venueUser });
      console.log(`✅ Lieu créé: ${venueData.venueName}`);
    }

    console.log('\n🌱 Création des événements...');

    // Créer les événements avec les lieux associés
    const eventsData = [
      {
        title: 'Nox Night - Soirée Electro',
        date: new Date('2024-01-15T22:00:00Z'),
        time: '22:00',
        location: 'Club Nox, Paris',
        price: 25,
        capacity: 200,
        sold: 45,
        genre: 'Electro',
        description: 'Une soirée électro explosive avec les meilleurs DJs de la scène underground',
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
        venueIndex: 0,
        djNames: ['DJ Neon', 'Mixmaster Nova'], // Pour référence, on créera les DJs si nécessaire
      },
      {
        title: 'Bass Revolution - Drum & Bass',
        date: new Date('2024-01-20T21:00:00Z'),
        time: '21:00',
        location: 'Warehouse Underground, Lyon',
        price: 30,
        capacity: 150,
        sold: 78,
        genre: 'Drum & Bass',
        description: 'Une révolution sonore avec les meilleurs artistes drum & bass',
        image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=300&fit=crop',
        venueIndex: 1,
        djNames: ['Bass Storm', 'DJ Cyber'],
      },
      {
        title: 'Techno Underground Session',
        date: new Date('2024-01-25T23:00:00Z'),
        time: '23:00',
        location: 'Le Bunker, Marseille',
        price: 20,
        capacity: 300,
        sold: 120,
        genre: 'Techno',
        description: 'Session techno underground dans un lieu unique',
        image: 'https://images.unsplash.com/photo-1516900557549-41557d405ad2?w=400&h=300&fit=crop',
        venueIndex: 2,
        djNames: ['Techno Master', 'DJ Neon'],
      },
    ];

    // Vérifier si les événements existent déjà
    const existingEvents = await prisma.event.findMany();
    if (existingEvents.length > 0) {
      console.log('⚠️  Des événements existent déjà. Suppression...');
      await prisma.event.deleteMany();
    }

    for (const eventData of eventsData) {
      const venue = createdVenues[eventData.venueIndex];

      // Créer l'événement
      const event = await prisma.event.create({
        data: {
          title: eventData.title,
          date: eventData.date,
          time: eventData.time,
          location: eventData.location,
          price: eventData.price,
          capacity: eventData.capacity,
          sold: eventData.sold,
          genre: eventData.genre,
          description: eventData.description,
          image: eventData.image,
          venueId: venue.id,
          // bookerId peut être null pour l'instant
        },
      });

      console.log(`✅ Événement créé: ${eventData.title}`);

      // Note: Les DJs seront associés quand ils seront créés dans la BDD
      // Pour l'instant, on garde juste les noms en référence
    }

    console.log('\n✅ Seed terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedEvents();

