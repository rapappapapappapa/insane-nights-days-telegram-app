const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Commentaires variés et détaillés pour les notes DJ
const djComments = {
  5: [
    'DJ exceptionnel ! Set incroyable, mixage parfait et sélection au top. L\'ambiance était de folie toute la nuit, on a dansé jusqu\'au bout. Technique impeccable et très professionnel. On reviendra sans hésiter !',
    'Meilleure soirée de l\'année ! Ce DJ a su créer une ambiance unique avec sa sélection. Les transitions étaient fluides, l\'énergie était au rendez-vous. Vraiment impressionnant, je recommande à 100%.',
    'Ambiance de folie garantie ! Set parfait du début à la fin, mixage impeccable. Le DJ a su lire la foule et adapter sa musique. Très professionnel et à l\'écoute. Une soirée mémorable !',
    'Technique parfaite et sélection au top ! Ce DJ maîtrise son art à la perfection. Les transitions sont fluides, le son est clair et puissant. L\'ambiance était électrique toute la nuit. Excellent !',
    'DJ au top, énergie incroyable ! Set dynamique et varié, le DJ a su maintenir l\'ambiance du début à la fin. Mixage parfait, sélection pointue. Une soirée inoubliable, on reviendra !',
  ],
  4: [
    'Très bon DJ, bonne sélection ! Set agréable avec de belles transitions. L\'ambiance était sympa, on a bien dansé. Quelques ajustements mineurs possibles mais globalement satisfait. Je recommande !',
    'Bonne prestation, quelques ajustements possibles. Le DJ a fait du bon travail, mixage correct et sélection variée. L\'ambiance était bonne mais pourrait être encore meilleure avec un peu plus d\'énergie.',
    'DJ solide, ambiance sympa ! Set correct avec de bonnes transitions. La sélection était variée et adaptée. Pas de surprise mais une soirée agréable. On reviendrait volontiers.',
    'Bon mixage, quelques transitions à améliorer. Globalement satisfait, le DJ a fait du bon travail. L\'ambiance était bonne, la sélection variée. Une soirée correcte.',
  ],
  3: [
    'DJ correct, rien de transcendant. Set passable avec des transitions parfois hésitantes. La sélection était OK mais manquait d\'originalité. Ambiance correcte mais pas folle.',
    'Prestation moyenne, peut mieux faire. Le mixage était correct mais les transitions manquaient de fluidité. La sélection était variée mais sans surprise. Ambiance correcte.',
    'OK mais manque d\'originalité. Set correct avec une sélection classique. Le mixage était passable, l\'ambiance correcte. Rien de mémorable mais pas décevant non plus.',
  ],
  2: [
    'Décevant, beaucoup d\'erreurs. Le mixage était approximatif avec plusieurs erreurs de transition. La sélection était moyenne et l\'ambiance en a souffert. Pas à la hauteur.',
    'Pas à la hauteur des attentes. Le DJ manquait de technique, transitions ratées et sélection peu adaptée. L\'ambiance n\'était pas au rendez-vous. Décevant.',
  ],
  1: [
    'Très décevant. Prestation médiocre avec de nombreuses erreurs. Le mixage était catastrophique, la sélection inadaptée. L\'ambiance était morte. À éviter.',
    'Prestation médiocre. Le DJ n\'était clairement pas à la hauteur. Mixage désastreux, transitions ratées et sélection inadaptée. Très déçu de cette soirée.',
  ],
};

// Commentaires variés et détaillés pour les notes Lieux
const venueComments = {
  5: [
    'Lieu exceptionnel, ambiance parfaite ! Infrastructure top avec un son excellent. L\'accueil était chaleureux, le personnel professionnel. Parfait pour organiser un événement, on reviendra sans hésiter !',
    'Meilleur endroit pour une soirée ! Lieu magnifique, bien équipé et bien organisé. Le son est parfait, l\'ambiance incroyable. Accueil au top, personnel à l\'écoute. Je recommande à 100% !',
    'Infrastructure top, son excellent ! Lieu spacieux et bien aménagé. L\'ambiance était parfaite, le personnel professionnel. Parfait pour une soirée réussie. On reviendra !',
    'Lieu magnifique, accueil chaleureux ! Endroit bien équipé avec un son de qualité. L\'organisation était parfaite, le personnel à l\'écoute. Ambiance incroyable, une soirée mémorable !',
  ],
  4: [
    'Très bon lieu, bonne ambiance ! Infrastructure correcte avec un bon son. L\'organisation était bonne, le personnel sympa. Quelques améliorations possibles mais globalement satisfait. Je recommande !',
    'Bien équipé, quelques améliorations possibles. Lieu sympa avec un son correct. L\'ambiance était bonne, le personnel à l\'écoute. Organisation correcte mais peut être améliorée.',
    'Lieu sympa, bon accueil ! Infrastructure correcte, son acceptable. L\'organisation était bonne, le personnel sympa. Ambiance agréable, on reviendrait volontiers.',
  ],
  3: [
    'Lieu correct, rien d\'exceptionnel. Infrastructure passable, son moyen. L\'organisation était correcte mais manquait de professionnalisme. Ambiance correcte mais pas folle.',
    'Moyen, peut mieux faire. Infrastructure à améliorer, son passable. L\'organisation était correcte mais manquait de rigueur. Ambiance correcte sans plus.',
  ],
  2: [
    'Décevant, infrastructure à revoir. Lieu mal entretenu, son moyen. L\'organisation laissait à désirer, le personnel peu professionnel. Ambiance en dessous des attentes.',
    'Pas à la hauteur des attentes. Infrastructure vieillissante, son moyen. L\'organisation était approximative, le personnel peu à l\'écoute. Décevant.',
  ],
  1: [
    'Très décevant. Infrastructure vétuste, son mauvais. L\'organisation était catastrophique, le personnel peu professionnel. Ambiance morte, à éviter absolument.',
    'Lieu médiocre. Infrastructure en mauvais état, son inexistant. L\'organisation était désastreuse, le personnel peu compétent. Très déçu, à éviter.',
  ],
};

async function addCommentsToExistingRatings() {
  try {
    console.log('💬 Ajout de commentaires aux notes existantes...\n');

    // Récupérer toutes les notes DJ sans commentaire
    const djRatingsWithoutComments = await prisma.djRating.findMany({
      where: {
        OR: [
          { comment: null },
          { comment: '' },
        ],
      },
    });

    console.log(`📊 ${djRatingsWithoutComments.length} notes DJ sans commentaire trouvées\n`);

    let djCommentsAdded = 0;
    for (const rating of djRatingsWithoutComments) {
      const ratingValue = Math.round(rating.rating);
      const commentList = djComments[ratingValue] || djComments[3] || ['Note'];
      const comment = commentList[Math.floor(Math.random() * commentList.length)];

      try {
        await prisma.djRating.update({
          where: { id: rating.id },
          data: { comment },
        });
        djCommentsAdded++;
      } catch (error) {
        console.error(`❌ Erreur mise à jour note DJ ${rating.id}:`, error.message);
      }
    }

    console.log(`✅ ${djCommentsAdded} commentaires ajoutés aux notes DJ\n`);

    // Récupérer toutes les notes Lieu sans commentaire
    const venueRatingsWithoutComments = await prisma.venueRating.findMany({
      where: {
        OR: [
          { comment: null },
          { comment: '' },
        ],
      },
    });

    console.log(`📊 ${venueRatingsWithoutComments.length} notes Lieu sans commentaire trouvées\n`);

    let venueCommentsAdded = 0;
    for (const rating of venueRatingsWithoutComments) {
      const ratingValue = Math.round(rating.rating);
      const commentList = venueComments[ratingValue] || venueComments[3] || ['Note'];
      const comment = commentList[Math.floor(Math.random() * commentList.length)];

      try {
        await prisma.venueRating.update({
          where: { id: rating.id },
          data: { comment },
        });
        venueCommentsAdded++;
      } catch (error) {
        console.error(`❌ Erreur mise à jour note Lieu ${rating.id}:`, error.message);
      }
    }

    console.log(`✅ ${venueCommentsAdded} commentaires ajoutés aux notes Lieu\n`);
    console.log(`\n✅ Terminé ! ${djCommentsAdded + venueCommentsAdded} commentaires ajoutés au total.`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'ajout des commentaires:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addCommentsToExistingRatings();

