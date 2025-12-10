const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Commentaires variés et détaillés pour les notes (comme de vrais avis utilisateurs)
const comments = {
  5: [
    'Lieu exceptionnel, ambiance parfaite ! Infrastructure top avec un son excellent. L\'accueil était chaleureux, le personnel professionnel. Parfait pour organiser un événement, on reviendra sans hésiter !',
    'Meilleur endroit pour une soirée ! Lieu magnifique, bien équipé et bien organisé. Le son est parfait, l\'ambiance incroyable. Accueil au top, personnel à l\'écoute. Je recommande à 100% !',
    'Infrastructure top, son excellent ! Lieu spacieux et bien aménagé. L\'ambiance était parfaite, le personnel professionnel. Parfait pour une soirée réussie. On reviendra !',
    'Lieu magnifique, accueil chaleureux ! Endroit bien équipé avec un son de qualité. L\'organisation était parfaite, le personnel à l\'écoute. Ambiance incroyable, une soirée mémorable !',
    'Parfait pour organiser un événement ! Lieu spacieux, bien équipé et bien organisé. Le son est excellent, l\'ambiance au top. Personnel professionnel et accueillant. Excellent !',
    'Ambiance incroyable, lieu au top ! Infrastructure moderne et bien entretenue. Le son est parfait, l\'organisation impeccable. Personnel sympa et professionnel. On reviendra !',
    'Excellent lieu, très bien équipé ! Son de qualité, infrastructure moderne. L\'ambiance était parfaite, le personnel à l\'écoute. Organisation au top. Je recommande !',
    'Superbe endroit, on recommande ! Lieu magnifique avec une infrastructure top. Le son est excellent, l\'ambiance incroyable. Accueil chaleureux, personnel professionnel. Parfait !',
    'Lieu exceptionnel pour une soirée réussie ! Infrastructure moderne, son parfait. L\'organisation était impeccable, le personnel au top. Ambiance incroyable, on reviendra !',
    'Endroit parfait pour une soirée mémorable ! Lieu spacieux et bien équipé. Le son est excellent, l\'ambiance au top. Personnel professionnel et accueillant. Excellent !',
  ],
  4: [
    'Très bon lieu, bonne ambiance ! Infrastructure correcte avec un bon son. L\'organisation était bonne, le personnel sympa. Quelques améliorations possibles mais globalement satisfait. Je recommande !',
    'Bien équipé, quelques améliorations possibles. Lieu sympa avec un son correct. L\'ambiance était bonne, le personnel à l\'écoute. Organisation correcte mais peut être améliorée.',
    'Lieu sympa, bon accueil ! Infrastructure correcte, son acceptable. L\'organisation était bonne, le personnel sympa. Ambiance agréable, on reviendrait volontiers.',
    'Correct, quelques détails à améliorer. Lieu correct avec une infrastructure passable. Le son était OK, l\'ambiance sympa. Organisation correcte mais peut être améliorée.',
    'Satisfait, reviendrais volontiers ! Lieu agréable avec une bonne infrastructure. Le son était correct, l\'ambiance sympa. Organisation correcte, personnel sympa.',
    'Bon lieu, bonne organisation ! Infrastructure correcte, son acceptable. L\'ambiance était bonne, le personnel à l\'écoute. Organisation correcte, une soirée agréable.',
    'Lieu agréable avec une infrastructure correcte. Le son était OK, l\'ambiance sympa. Organisation bonne, personnel sympa. Rien d\'exceptionnel mais correct.',
    'Set agréable avec une bonne infrastructure. Le son était correct, l\'ambiance sympa. Organisation bonne, quelques améliorations possibles mais globalement satisfait.',
  ],
  3: [
    'Lieu correct, rien d\'exceptionnel. Infrastructure passable, son moyen. L\'organisation était correcte mais manquait de professionnalisme. Ambiance correcte mais pas folle.',
    'Moyen, peut mieux faire. Infrastructure à améliorer, son passable. L\'organisation était correcte mais manquait de rigueur. Ambiance correcte sans plus.',
    'OK mais manque de charme. Lieu correct avec une infrastructure basique. Le son était passable, l\'ambiance correcte. Organisation moyenne, peut mieux faire.',
    'Passable, ambiance correcte. Infrastructure basique, son moyen. L\'organisation était correcte mais manquait de professionnalisme. Rien d\'exceptionnel.',
    'Lieu moyen. Infrastructure à améliorer, son passable. L\'organisation était correcte mais manquait de rigueur. Ambiance correcte sans plus.',
  ],
  2: [
    'Décevant, infrastructure à revoir. Lieu mal entretenu, son moyen. L\'organisation laissait à désirer, le personnel peu professionnel. Ambiance en dessous des attentes.',
    'Pas à la hauteur des attentes. Infrastructure vieillissante, son moyen. L\'organisation était approximative, le personnel peu à l\'écoute. Décevant.',
    'Quelques problèmes d\'organisation. Infrastructure à améliorer, son passable. L\'organisation manquait de rigueur, le personnel peu professionnel. Pas satisfait.',
    'Infrastructure à revoir. Lieu mal entretenu, son moyen. L\'organisation était approximative, le personnel peu à l\'écoute. Décevant.',
  ],
  1: [
    'Très décevant. Infrastructure vétuste, son mauvais. L\'organisation était catastrophique, le personnel peu professionnel. Ambiance morte, à éviter absolument.',
    'Lieu médiocre. Infrastructure en mauvais état, son inexistant. L\'organisation était désastreuse, le personnel peu compétent. Très déçu, à éviter.',
    'Catastrophique. Infrastructure vétuste et mal entretenue. Son inexistant, organisation désastreuse. Personnel peu professionnel. À éviter absolument.',
  ],
};

async function addVenueRatings() {
  try {
    console.log('⭐ Ajout de notes variées pour les lieux...\n');

    // Récupérer tous les lieux
    const venues = await prisma.userVenue.findMany({
      include: {
        user: true,
      },
    });

    if (venues.length === 0) {
      console.log('❌ Aucun lieu trouvé dans la base de données');
      return;
    }

    console.log(`📊 ${venues.length} lieux trouvés\n`);

    // Récupérer tous les événements avec des lieux associés
    const events = await prisma.event.findMany({
      where: {
        venueId: {
          not: null,
        },
      },
    });

    if (events.length === 0) {
      console.log('❌ Aucun événement avec lieu trouvé dans la base de données');
      return;
    }

    console.log(`📅 ${events.length} événements trouvés\n`);

    // Récupérer des utilisateurs pour noter (COMMUNITY, BOOKER, DJ)
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

    const djUsers = await prisma.user.findMany({
      where: {
        accountType: 'DJ',
      },
      take: 10,
    });

    console.log(`👥 Utilisateurs disponibles: ${communityUsers.length} COMMUNITY, ${bookerUsers.length} BOOKER, ${djUsers.length} DJ\n`);

    let ratingsCreated = 0;
    let ratingsSkipped = 0;

    // Pour chaque lieu, créer plusieurs notes variées
    for (const venue of venues) {
      // Trouver les événements qui ont eu lieu dans ce lieu
      const venueEvents = events.filter((event) => event.venueId === venue.id);

      if (venueEvents.length === 0) {
        console.log(`⏭️  Aucun événement pour ${venue.venueName}, skip`);
        continue;
      }

      // Créer 3-8 notes par lieu avec des notes variées
      const numRatings = Math.floor(Math.random() * 6) + 3; // 3 à 8 notes
      const ratingsToCreate = [];

      for (let i = 0; i < numRatings; i++) {
        // Sélectionner un événement aléatoire
        const event = venueEvents[Math.floor(Math.random() * venueEvents.length)];

        // Déterminer le type de rater (60% COMMUNITY, 25% BOOKER, 15% DJ)
        const rand = Math.random();
        let raterType, raterId;

        if (rand < 0.6 && communityUsers.length > 0) {
          raterType = 'COMMUNITY';
          raterId = communityUsers[Math.floor(Math.random() * communityUsers.length)].id;
        } else if (rand < 0.85 && bookerUsers.length > 0) {
          raterType = 'BOOKER';
          raterId = bookerUsers[Math.floor(Math.random() * bookerUsers.length)].id;
        } else if (djUsers.length > 0) {
          raterType = 'DJ';
          raterId = djUsers[Math.floor(Math.random() * djUsers.length)].id;
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
          venueId: venue.id,
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
          const existing = await prisma.venueRating.findUnique({
            where: {
              venueId_raterId_eventId: {
                venueId: ratingData.venueId,
                raterId: ratingData.raterId,
                eventId: ratingData.eventId,
              },
            },
          });

          if (existing) {
            ratingsSkipped++;
            continue;
          }

          await prisma.venueRating.create({
            data: ratingData,
          });
          ratingsCreated++;
        } catch (error) {
          if (error.code === 'P2002') {
            // Contrainte unique violée
            ratingsSkipped++;
          } else {
            console.error(`❌ Erreur création note pour ${venue.venueName}:`, error.message);
          }
        }
      }

      console.log(`✅ ${ratingsCreated} notes créées pour ${venue.venueName}`);
    }

    // Recalculer les moyennes pour tous les lieux
    console.log('\n🔄 Recalcul des moyennes...');
    for (const venue of venues) {
      const ratings = await prisma.venueRating.findMany({
        where: { venueId: venue.id },
      });

      const communityRatings = ratings.filter((r) => r.raterType === 'COMMUNITY');
      const bookerRatings = ratings.filter((r) => r.raterType === 'BOOKER');
      const djRatings = ratings.filter((r) => r.raterType === 'DJ');

      const avgCommunity =
        communityRatings.length > 0
          ? communityRatings.reduce((sum, r) => sum + r.rating, 0) / communityRatings.length
          : 0;
      const avgBooker =
        bookerRatings.length > 0
          ? bookerRatings.reduce((sum, r) => sum + r.rating, 0) / bookerRatings.length
          : 0;
      const avgDj =
        djRatings.length > 0
          ? djRatings.reduce((sum, r) => sum + r.rating, 0) / djRatings.length
          : 0;

      const avgGlobal =
        ratings.length > 0 ? (avgCommunity + avgBooker + avgDj) / 3 : 0;

      await prisma.userVenue.update({
        where: { id: venue.id },
        data: {
          averageRatingCommunity: Math.round(avgCommunity * 10) / 10,
          averageRatingBooker: Math.round(avgBooker * 10) / 10,
          averageRatingDj: Math.round(avgDj * 10) / 10,
          averageRatingGlobal: Math.round(avgGlobal * 10) / 10,
          totalRatingsCommunity: communityRatings.length,
          totalRatingsBooker: bookerRatings.length,
          totalRatingsDj: djRatings.length,
        },
      });
    }

    console.log(`\n✅ Terminé ! ${ratingsCreated} notes créées, ${ratingsSkipped} déjà existantes.`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des notes lieu:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addVenueRatings();

