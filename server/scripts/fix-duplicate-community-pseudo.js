/**
 * Corrige les pseudos en double dans UserCommunity avant d'ajouter la contrainte unique.
 * À exécuter avant `prisma db push` si la migration échoue à cause de doublons.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver les pseudos en double (non null)
  const duplicates = await prisma.$queryRaw`
    SELECT pseudo, COUNT(*) as count
    FROM "UserCommunity"
    WHERE pseudo IS NOT NULL AND pseudo != ''
    GROUP BY pseudo
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log('[fix-duplicate-pseudo] Aucun doublon trouvé.');
    return;
  }

  console.log(`[fix-duplicate-pseudo] ${duplicates.length} pseudo(s) en double à corriger.`);

  for (const row of duplicates) {
    const pseudo = row.pseudo;
    // Récupérer les UserCommunity avec ce pseudo (triés par createdAt pour garder le plus ancien intact)
    const communities = await prisma.userCommunity.findMany({
      where: { pseudo },
      orderBy: { createdAt: 'asc' },
    });

    // Garder le premier tel quel, rendre les autres uniques
    for (let i = 1; i < communities.length; i++) {
      const suffix = `_${communities[i].id.slice(0, 8)}`;
      const newPseudo = `${pseudo}${suffix}`.slice(0, 50); // Limiter la longueur
      await prisma.userCommunity.update({
        where: { id: communities[i].id },
        data: { pseudo: newPseudo },
      });
      console.log(`[fix-duplicate-pseudo] ${pseudo} -> ${newPseudo} (id: ${communities[i].id})`);
    }
  }

  console.log('[fix-duplicate-pseudo] Terminé.');
}

main()
  .catch((e) => {
    console.error('[fix-duplicate-pseudo] Erreur:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
