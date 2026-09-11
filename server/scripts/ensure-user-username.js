/**
 * Ajoute la colonne username à la table User si elle n'existe pas.
 * Utile si la DB a été créée sans cette colonne.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name IN ('User', 'user') AND column_name = 'username'
    `);
    if (!result || result.length === 0) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" TEXT`);
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "username" = COALESCE(NULLIF(TRIM(split_part("email", '@', 1)), ''), "id") WHERE "username" IS NULL OR TRIM("username") = ''`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL`);
      console.log('[ensure-user-username] Colonne username ajoutée.');
    } else {
      console.log('[ensure-user-username] Colonne username déjà présente.');
    }
  } catch (e) {
    console.log('[ensure-user-username]', e.message || e);
  }
}

main()
  .finally(() => prisma.$disconnect());
