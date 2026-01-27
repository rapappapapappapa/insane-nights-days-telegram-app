const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEventDjIdNullable() {
  try {
    console.log('🔧 Application de la migration pour rendre eventDjId nullable...');
    
    // Désactiver les clés étrangères
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=OFF;`);
    
    // Créer la nouvelle table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "Message_new" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "type" TEXT NOT NULL DEFAULT 'PRIVATE',
        "eventDjId" TEXT,
        "eventId" TEXT,
        "senderId" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "read" BOOLEAN NOT NULL DEFAULT false,
        "deleted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Copier les données
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Message_new" ("id", "type", "eventDjId", "eventId", "senderId", "content", "read", "deleted", "createdAt", "updatedAt")
      SELECT "id", COALESCE("type", 'PRIVATE'), "eventDjId", "eventId", "senderId", "content", "read", COALESCE("deleted", false), "createdAt", COALESCE("updatedAt", "createdAt") FROM "Message";
    `);
    
    // Supprimer l'ancienne table
    await prisma.$executeRawUnsafe(`DROP TABLE "Message";`);
    
    // Renommer la nouvelle table
    await prisma.$executeRawUnsafe(`ALTER TABLE "Message_new" RENAME TO "Message";`);
    
    // Recréer les index
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_eventDjId_idx" ON "Message"("eventDjId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_eventId_idx" ON "Message"("eventId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_type_idx" ON "Message"("type");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");`);
    
    // Réactiver les clés étrangères
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=ON;`);
    
    console.log('✅ Migration appliquée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEventDjIdNullable();

