/**
 * Script de migration : définit un pseudo par défaut pour les bookers
 * qui n'en ont pas (pseudo = null).
 * Utilise "Nom Prénom" comme valeur par défaut.
 *
 * Usage: node server/scripts/update-booker-pseudo-defaults.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bookersWithoutPseudo = await prisma.userBooker.findMany({
    where: { pseudo: null },
  });

  if (bookersWithoutPseudo.length === 0) {
    console.log('Aucun booker sans pseudo. Rien à faire.');
    return;
  }

  console.log(`${bookersWithoutPseudo.length} booker(s) sans pseudo trouvé(s).`);

  let updated = 0;
  for (const booker of bookersWithoutPseudo) {
    const defaultPseudo = `${booker.nom} ${booker.prenom}`.trim();
    if (!defaultPseudo) continue;

    await prisma.userBooker.update({
      where: { id: booker.id },
      data: { pseudo: defaultPseudo },
    });
    console.log(`  ✓ ${booker.id}: pseudo = "${defaultPseudo}"`);
    updated++;
  }

  console.log(`\n${updated} profil(s) Booker mis à jour.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
