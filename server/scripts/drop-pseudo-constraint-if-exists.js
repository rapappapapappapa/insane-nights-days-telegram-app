/**
 * Supprime la contrainte unique UserCommunity_pseudo_key si elle existe.
 * Utile quand prisma db push échoue avec "relation already exists".
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // PostgreSQL: UNIQUE crée un index. Supprimer les deux (contrainte et index).
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "UserCommunity" DROP CONSTRAINT IF EXISTS "UserCommunity_pseudo_key";
    `);
    await prisma.$executeRawUnsafe(`
      DROP INDEX IF EXISTS "UserCommunity_pseudo_key";
    `);
    console.log('[drop-pseudo-constraint] Contrainte/index supprimé(s).');
  } catch (e) {
    console.log('[drop-pseudo-constraint]', e.message || e);
  }
}

main()
  .finally(() => prisma.$disconnect());
