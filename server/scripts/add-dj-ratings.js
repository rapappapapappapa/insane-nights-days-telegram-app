const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Commentaires variés et détaillés pour les notes (comme de vrais avis utilisateurs)
const comments = {
  5: [
    'DJ exceptionnel ! Set incroyable, mixage parfait et sélection au top. L\'ambiance était de folie toute la nuit, on a dansé jusqu\'au bout. Technique impeccable et très professionnel. On reviendra sans hésiter !',
    'Meilleure soirée de l\'année ! Ce DJ a su créer une ambiance unique avec sa sélection. Les transitions étaient fluides, l\'énergie était au rendez-vous. Vraiment impressionnant, je recommande à 100%.',
    'Ambiance de folie garantie ! Set parfait du début à la fin, mixage impeccable. Le DJ a su lire la foule et adapter sa musique. Très professionnel et à l\'écoute. Une soirée mémorable !',
    'Technique parfaite et sélection au top ! Ce DJ maîtrise son art à la perfection. Les transitions sont fluides, le son est clair et puissant. L\'ambiance était électrique toute la nuit. Excellent !',
    'DJ au top, énergie incroyable ! Set dynamique et varié, le DJ a su maintenir l\'ambiance du début à la fin. Mixage parfait, sélection pointue. Une soirée inoubliable, on reviendra !',
    'Set parfait, mixage impeccable ! Ce DJ a un vrai talent. L\'ambiance était au rendez-vous, la foule était en feu. Technique solide et sélection variée. Très satisfait, je recommande !',
    'Excellent DJ, très professionnel ! Prestation de qualité, mixage soigné et sélection adaptée. L\'ambiance était géniale, on a passé une super soirée. Un DJ à suivre absolument !',
    'Ambiance garantie avec ce DJ ! Set énergique et bien construit, le DJ a su créer une connexion avec le public. Mixage fluide et sélection pointue. Une expérience à vivre !',
    'DJ talentueux et professionnel ! Set bien pensé, transitions parfaites. L\'ambiance était au top toute la nuit. Technique solide et à l\'écoute du public. Parfait !',
    'Soirée mémorable ! Ce DJ a su créer une ambiance unique. Mixage impeccable, sélection variée et énergie constante. Très professionnel et passionné. On reviendra !',
  ],
  4: [
    'Très bon DJ, bonne sélection ! Set agréable avec de belles transitions. L\'ambiance était sympa, on a bien dansé. Quelques ajustements mineurs possibles mais globalement satisfait. Je recommande !',
    'Bonne prestation, quelques ajustements possibles. Le DJ a fait du bon travail, mixage correct et sélection variée. L\'ambiance était bonne mais pourrait être encore meilleure avec un peu plus d\'énergie.',
    'DJ solide, ambiance sympa ! Set correct avec de bonnes transitions. La sélection était variée et adaptée. Pas de surprise mais une soirée agréable. On reviendrait volontiers.',
    'Bon mixage, quelques transitions à améliorer. Globalement satisfait, le DJ a fait du bon travail. L\'ambiance était bonne, la sélection variée. Une soirée correcte.',
    'Satisfait, reviendrais volontiers ! Set agréable avec une bonne sélection. Le mixage était correct, l\'ambiance sympa. Rien d\'exceptionnel mais une bonne prestation.',
    'Bon DJ, bonne énergie ! Set dynamique avec de belles transitions. La sélection était variée et adaptée. L\'ambiance était au rendez-vous. Une soirée réussie !',
    'Prestation correcte et professionnelle. Le DJ a fait du bon travail, mixage soigné et sélection adaptée. L\'ambiance était bonne, on a passé un bon moment.',
    'Set agréable avec une bonne sélection. Le mixage était correct, quelques transitions à améliorer mais globalement satisfait. L\'ambiance était sympa.',
  ],
  3: [
    'DJ correct, rien de transcendant. Set passable avec des transitions parfois hésitantes. La sélection était OK mais manquait d\'originalité. Ambiance correcte mais pas folle.',
    'Prestation moyenne, peut mieux faire. Le mixage était correct mais les transitions manquaient de fluidité. La sélection était variée mais sans surprise. Ambiance correcte.',
    'OK mais manque d\'originalité. Set correct avec une sélection classique. Le mixage était passable, l\'ambiance correcte. Rien de mémorable mais pas décevant non plus.',
    'DJ passable, ambiance correcte. Set moyen avec des transitions parfois hésitantes. La sélection était variée mais sans originalité. Une soirée correcte sans plus.',
    'Prestation moyenne. Le DJ a fait du mieux qu\'il pouvait mais manquait de technique. La sélection était OK, l\'ambiance correcte. Peut mieux faire.',
  ],
  2: [
    'Décevant, beaucoup d\'erreurs. Le mixage était approximatif avec plusieurs erreurs de transition. La sélection était moyenne et l\'ambiance en a souffert. Pas à la hauteur.',
    'Pas à la hauteur des attentes. Le DJ manquait de technique, transitions ratées et sélection peu adaptée. L\'ambiance n\'était pas au rendez-vous. Décevant.',
    'Technique à revoir. Le mixage était approximatif avec plusieurs erreurs. La sélection était moyenne et l\'ambiance en a pâti. Pas satisfait de la prestation.',
    'Prestation décevante. Le DJ manquait de préparation, transitions hésitantes et sélection peu adaptée. L\'ambiance n\'était pas au top. Peut mieux faire.',
  ],
  1: [
    'Très décevant. Prestation médiocre avec de nombreuses erreurs. Le mixage était catastrophique, la sélection inadaptée. L\'ambiance était morte. À éviter.',
    'Prestation médiocre. Le DJ n\'était clairement pas à la hauteur. Mixage désastreux, transitions ratées et sélection inadaptée. Très déçu de cette soirée.',
    'Catastrophique. Le DJ n\'avait clairement pas le niveau. Erreurs constantes, mixage inexistant et sélection inadaptée. L\'ambiance était morte. À éviter absolument.',
  ],
};

async function addDjRatings() {
  try {
    console.log('⭐ Ajout de notes variées pour les DJs...\n');

    // Récupérer tous les DJs
    const djs = await prisma.userDj.findMany({
      include: {
        user: true,
      },
    });

    if (djs.length === 0) {
      console.log('❌ Aucun DJ trouvé dans la base de données');
      return;
    }

    console.log(`📊 ${djs.length} DJs trouvés\n`);

    // Récupérer tous les événements avec des DJs associés
    const events = await prisma.event.findMany({
      include: {
        eventDjs: true,
      },
      where: {
        eventDjs: {
          some: {},
        },
      },
    });

    if (events.length === 0) {
      console.log('❌ Aucun événement avec DJ trouvé dans la base de données');
      return;
    }

    console.log(`📅 ${events.length} événements trouvés\n`);

    // Récupérer des utilisateurs pour noter (COMMUNITY, BOOKER, VENUE)
    const communityUsers = await prisma.user.findMany({
      where: {
        accountType: 'COMMUNITY',
      },
      take: 20,
    });

    const bookerUsers = await prisma.user.findMany({
      where: {
        accountType: 'BOOKER',
      },
      take: 10,
    });

    const venueUsers = await prisma.user.findMany({
      where: {
        accountType: 'VENUE',
      },
      take: 10,
    });

    console.log(`👥 Utilisateurs disponibles: ${communityUsers.length} COMMUNITY, ${bookerUsers.length} BOOKER, ${venueUsers.length} VENUE\n`);

    let ratingsCreated = 0;
    let ratingsSkipped = 0;

    // Pour chaque DJ, créer plusieurs notes variées
    for (const dj of djs) {
      // Trouver les événements où ce DJ a joué
      const djEvents = events.filter((event) =>
        event.eventDjs.some((ed) => ed.djId === dj.userId)
      );

      if (djEvents.length === 0) {
        console.log(`⏭️  Aucun événement pour ${dj.artistName}, skip`);
        continue;
      }

      // Créer 3-8 notes par DJ avec des notes variées
      const numRatings = Math.floor(Math.random() * 6) + 3; // 3 à 8 notes
      const ratingsToCreate = [];

      for (let i = 0; i < numRatings; i++) {
        // Sélectionner un événement aléatoire
        const event = djEvents[Math.floor(Math.random() * djEvents.length)];

        // Déterminer le type de rater (60% COMMUNITY, 25% BOOKER, 15% VENUE)
        const rand = Math.random();
        let raterType, raterId;

        if (rand < 0.6 && communityUsers.length > 0) {
          raterType = 'COMMUNITY';
          raterId = communityUsers[Math.floor(Math.random() * communityUsers.length)].id;
        } else if (rand < 0.85 && bookerUsers.length > 0) {
          raterType = 'BOOKER';
          raterId = bookerUsers[Math.floor(Math.random() * bookerUsers.length)].id;
        } else if (venueUsers.length > 0) {
          raterType = 'VENUE';
          raterId = venueUsers[Math.floor(Math.random() * venueUsers.length)].id;
        } else {
          continue; // Pas de rater disponible
        }

        // Générer une note (distribution: 40% 5*, 30% 4*, 15% 3*, 10% 2*, 5% 1*)
        const ratingRand = Math.random();
        let rating;
        if (ratingRand < 0.4) {
          rating = 5;
        } else if (ratingRand < 0.7) {
          rating = 4;
        } else if (ratingRand < 0.85) {
          rating = 3;
        } else if (ratingRand < 0.95) {
          rating = 2;
        } else {
          rating = 1;
        }

        // Sélectionner un commentaire aléatoire
        const commentList = comments[rating] || ['Note'];
        const comment = commentList[Math.floor(Math.random() * commentList.length)];

        ratingsToCreate.push({
          djId: dj.id,
          raterId,
          raterType,
          rating,
          comment,
          eventId: event.id,
        });
      }

      // Créer les notes (en évitant les doublons)
      for (const ratingData of ratingsToCreate) {
        try {
          // Vérifier si la note existe déjà
          const existing = await prisma.djRating.findUnique({
            where: {
              djId_raterId_eventId: {
                djId: ratingData.djId,
                raterId: ratingData.raterId,
                eventId: ratingData.eventId,
              },
            },
          });

          if (existing) {
            ratingsSkipped++;
            continue;
          }

          await prisma.djRating.create({
            data: ratingData,
          });
          ratingsCreated++;
        } catch (error) {
          if (error.code === 'P2002') {
            // Contrainte unique violée
            ratingsSkipped++;
          } else {
            console.error(`❌ Erreur création note pour ${dj.artistName}:`, error.message);
          }
        }
      }

      console.log(`✅ ${ratingsCreated} notes créées pour ${dj.artistName}`);
    }

    // Recalculer les moyennes pour tous les DJs
    console.log('\n🔄 Recalcul des moyennes...');
    for (const dj of djs) {
      const ratings = await prisma.djRating.findMany({
        where: { djId: dj.id },
      });

      const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
      const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
      const venueRatings = ratings.filter((r) => r.raterType === 'VENUE');

      const avgCommunity =
        communityRatings.length > 0
          ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
          : 0;
      const avgBooker =
        bookerRatings.length > 0
          ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
          : 0;
      const avgVenue =
        venueRatings.length > 0
          ? venueRatings.reduce((sum, r) => sum + r.rating, 0) / venueRatings.length
          : 0;

      const avgGlobal =
        ratings.length > 0 ? (avgCommunity + avgBooker + avgVenue) / 3 : 0;

      await prisma.userDj.update({
        where: { id: dj.id },
        data: {
          averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
          averageRatingBooker: Math.round(avgBooker * 10) / 10,
          averageRatingVenue: Math.round(avgVenue * 10) / 10,
          averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
          totalRatingsCommunity: communityRatings.length,
          totalRatingsBooker: bookerRatings.length,
          totalRatingsVenue: venueRatings.length,
        },
      });
    }

    console.log(`\n✅ Terminé ! ${ratingsCreated} notes créées, ${ratingsSkipped} déjà existantes.`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des notes DJ:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addDjRatings();

