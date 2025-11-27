const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function seedDjs() {
  try {
    console.log('🎧 Création des profils DJ...\n');

    const djsData = [
      {
        email: 'neon@dj.com',
        username: 'djneon',
        password: 'dj123456',
        artistName: 'DJ NEON',
        city: 'Paris',
        phone: '+33611111111',
        birthDate: '15/03/1988',
      },
      {
        email: 'bassstorm@dj.com',
        username: 'bassstorm',
        password: 'dj123456',
        artistName: 'BASS STORM',
        city: 'Lyon',
        phone: '+33622222222',
        birthDate: '20/07/1992',
      },
      {
        email: 'technomaster@dj.com',
        username: 'technomaster',
        password: 'dj123456',
        artistName: 'TECHNO MASTER',
        city: 'Marseille',
        phone: '+33633333333',
        birthDate: '10/11/1985',
      },
      {
        email: 'mixmaster@dj.com',
        username: 'mixmaster',
        password: 'dj123456',
        artistName: 'MIXMASTER NOVA',
        city: 'Paris',
        phone: '+33644444444',
        birthDate: '25/09/1990',
      },
      {
        email: 'djcyber@dj.com',
        username: 'djcyber',
        password: 'dj123456',
        artistName: 'DJ CYBER',
        city: 'Lyon',
        phone: '+33655555555',
        birthDate: '05/12/1993',
      },
      {
        email: 'kayzen@dj.com',
        username: 'kayzen',
        password: 'dj123456',
        artistName: 'KAYZEN',
        city: 'Lyon',
        phone: '+33612345678',
        birthDate: '15/05/1990',
      },
    ];

    for (const djData of djsData) {
      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: djData.email },
        include: { djs: true },
      });

      if (existingUser) {
        // Si l'utilisateur existe mais n'a pas de profil DJ avec ce nom, en créer un
        const hasDjProfile = existingUser.djs && existingUser.djs.some(
          (dj) => dj.artistName === djData.artistName
        );
        
        if (!hasDjProfile) {
          await prisma.userDj.create({
            data: {
              userId: existingUser.id,
              artistName: djData.artistName,
              city: djData.city,
              phone: djData.phone,
              birthDate: djData.birthDate,
            },
          });
          console.log(`✅ Profil DJ créé pour: ${djData.artistName}`);
        } else {
          console.log(`⏭️  Profil DJ existe déjà pour: ${djData.artistName}`);
        }
      } else {
        // Créer l'utilisateur et son profil DJ
        const hashedPassword = await bcrypt.hash(djData.password, 10);

        const user = await prisma.user.create({
          data: {
            email: djData.email,
            username: djData.username,
            password: hashedPassword,
            score: 0,
            level: 1,
            activeProfileType: 'DJ',
            accountType: 'DJ',
          },
        });

        await prisma.userDj.create({
          data: {
            userId: user.id,
            artistName: djData.artistName,
            city: djData.city,
            phone: djData.phone,
            birthDate: djData.birthDate,
          },
        });

        console.log(`✅ DJ créé: ${djData.artistName} (${djData.city})`);
      }
    }

    console.log('\n✅ Seed des DJs terminé avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors du seed des DJs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedDjs();

