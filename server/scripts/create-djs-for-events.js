const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createDjsForEvents() {
  try {
    console.log('🎧 Création des DJs avec profils différents...\n');

    // Définir les DJs avec des profils variés
    const djsData = [
      {
        email: 'neon@dj.com',
        username: 'djneon',
        password: 'dj123456',
        artistName: 'DJ NEON',
        city: 'Paris',
        phone: '+33611111111',
        birthDate: '1988-03-20',
        styles: 'Electro • House • Progressive',
        bio: 'DJ parisien spécialisé dans l\'électro et la house progressive. Résident du Club Insane.',
      },
      {
        email: 'bassstorm@dj.com',
        username: 'bassstorm',
        password: 'dj123456',
        artistName: 'BASS STORM',
        city: 'Lyon',
        phone: '+33622222222',
        birthDate: '1992-07-15',
        styles: 'Drum & Bass • Jungle • Breakbeat',
        bio: 'Producteur et DJ lyonnais, maître du drum & bass. Sets énergiques et sonorités puissantes.',
      },
      {
        email: 'technomaster@dj.com',
        username: 'technomaster',
        password: 'dj123456',
        artistName: 'TECHNO MASTER',
        city: 'Marseille',
        phone: '+33633333333',
        birthDate: '1985-11-30',
        styles: 'Techno • Industrial • Hard Techno',
        bio: 'Vétéran de la scène techno marseillaise. Sets sombres et intenses, spécialiste du hard techno.',
      },
      {
        email: 'mixmaster@dj.com',
        username: 'mixmaster',
        password: 'dj123456',
        artistName: 'MIXMASTER NOVA',
        city: 'Paris',
        phone: '+33644444444',
        birthDate: '1990-09-10',
        styles: 'Electro • Tech House • Minimal',
        bio: 'DJ parisien reconnu pour ses transitions fluides et ses sets minimalistes. Résident de plusieurs clubs parisiens.',
      },
      {
        email: 'djcyber@dj.com',
        username: 'djcyber',
        password: 'dj123456',
        artistName: 'DJ CYBER',
        city: 'Lyon',
        phone: '+33655555555',
        birthDate: '1993-04-25',
        styles: 'Drum & Bass • Neurofunk • Darkstep',
        bio: 'Jeune talent lyonnais du drum & bass. Sonorités futuristes et sets explosifs.',
      },
      {
        email: 'kayzen@dj.com',
        username: 'kayzen',
        password: 'dj123456',
        artistName: 'KAYZEN',
        city: 'Lyon',
        phone: '+33612345678',
        birthDate: '1990-05-15',
        styles: 'Industrial • Hard Techno',
        bio: 'Producteur et DJ basé à Lyon, KAYZEN est reconnu pour ses sets énergiques et ses sonorités industrielles.',
      },
    ];

    const createdDjs = [];

    for (const djData of djsData) {
      // Vérifier si l'utilisateur existe déjà
      let djUser = await prisma.user.findUnique({
        where: { email: djData.email },
        include: { dj: true },
      });

      let dj;
      if (!djUser) {
        // Créer l'utilisateur DJ
        const hashedPassword = await bcrypt.hash(djData.password, 10);
        djUser = await prisma.user.create({
          data: {
            email: djData.email,
            username: djData.username,
            password: hashedPassword,
            accountType: 'DJ',
          },
        });

        // Créer le profil DJ
        dj = await prisma.userDj.create({
          data: {
            userId: djUser.id,
            artistName: djData.artistName,
            city: djData.city,
            phone: djData.phone,
            birthDate: djData.birthDate,
          },
        });

        console.log(`✅ DJ créé: ${djData.artistName} (${djData.city})`);
      } else if (!djUser.dj) {
        // L'utilisateur existe mais pas le profil DJ
        dj = await prisma.userDj.create({
          data: {
            userId: djUser.id,
            artistName: djData.artistName,
            city: djData.city,
            phone: djData.phone,
            birthDate: djData.birthDate,
          },
        });
        console.log(`✅ Profil DJ créé pour: ${djData.artistName}`);
      } else {
        dj = djUser.dj;
        console.log(`ℹ️  DJ existe déjà: ${djData.artistName}`);
      }

      createdDjs.push({
        ...dj,
        artistName: djData.artistName,
        styles: djData.styles,
        bio: djData.bio,
      });
    }

    console.log('\n🎵 Association des DJs aux événements...\n');

    // Récupérer tous les événements
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
    });

    // Associer les DJs aux événements selon leur genre
    const eventDjAssignments = [
      {
        eventTitle: 'Insane Night - Soirée Electro',
        djNames: ['DJ NEON', 'MIXMASTER NOVA'],
      },
      {
        eventTitle: 'Bass Revolution - Drum & Bass',
        djNames: ['BASS STORM', 'DJ CYBER'],
      },
      {
        eventTitle: 'Techno Underground Session',
        djNames: ['TECHNO MASTER', 'KAYZEN'],
      },
    ];

    for (const event of events) {
      const assignment = eventDjAssignments.find(
        (a) => event.title.includes(a.eventTitle.split(' - ')[0]) || 
               event.title.includes(a.eventTitle.split(' - ')[1])
      );

      if (!assignment) {
        // Assignation par défaut selon le genre
        let defaultDjs = [];
        if (event.genre === 'Electro') {
          defaultDjs = ['DJ NEON', 'MIXMASTER NOVA'];
        } else if (event.genre === 'Drum & Bass') {
          defaultDjs = ['BASS STORM', 'DJ CYBER'];
        } else if (event.genre === 'Techno') {
          defaultDjs = ['TECHNO MASTER', 'KAYZEN'];
        }

        for (const djName of defaultDjs) {
          const dj = createdDjs.find((d) => d.artistName === djName);
          if (dj) {
            const existing = await prisma.eventDj.findFirst({
              where: {
                eventId: event.id,
                djId: dj.id,
              },
            });

            if (!existing) {
              await prisma.eventDj.create({
                data: {
                  eventId: event.id,
                  djId: dj.id,
                },
              });
              console.log(`✅ ${dj.artistName} associé à: ${event.title}`);
            }
          }
        }
      } else {
        for (const djName of assignment.djNames) {
          const dj = createdDjs.find((d) => d.artistName === djName);
          if (dj) {
            // djId dans EventDj pointe vers User.id, pas UserDj.id
            const djUser = await prisma.user.findUnique({
              where: { id: dj.userId },
            });
            
            if (djUser) {
              const existing = await prisma.eventDj.findFirst({
                where: {
                  eventId: event.id,
                  djId: djUser.id, // User.id
                },
              });

              if (!existing) {
                await prisma.eventDj.create({
                  data: {
                    eventId: event.id,
                    djId: djUser.id, // User.id, pas UserDj.id
                  },
                });
                console.log(`✅ ${dj.artistName} associé à: ${event.title}`);
              } else {
                console.log(`ℹ️  ${dj.artistName} déjà associé à: ${event.title}`);
              }
            }
          }
        }
      }
    }

    console.log('\n📊 Résumé:');
    console.log(`✅ ${createdDjs.length} DJs créés/vérifiés`);
    console.log(`✅ ${events.length} événements traités`);

    // Afficher les associations finales
    console.log('\n🎯 Associations finales:');
    for (const event of events) {
      const eventDjs = await prisma.eventDj.findMany({
        where: { eventId: event.id },
      });
      
      console.log(`\n${event.title}:`);
      for (const ed of eventDjs) {
        // djId pointe vers User.id, donc on cherche le UserDj via User
        const user = await prisma.user.findUnique({
          where: { id: ed.djId },
          include: { dj: true },
        });
        if (user && user.dj) {
          console.log(`  - ${user.username} (${user.dj.artistName})`);
        }
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

createDjsForEvents();

