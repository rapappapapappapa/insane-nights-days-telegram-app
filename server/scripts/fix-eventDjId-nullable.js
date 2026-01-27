const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEventDjIdNullable() {
  try {
    console.log('🔧 Application de la migration pour rendre eventDjId nullable...');
    
    // Utiliser une requête SQL brute pour recréer la table
    await prisma.$executeRawUnsafe(`
      PRAGMA foreign_keys=OFF;
      
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
      
      INSERT INTO "Message_new" ("id", "type", "eventDjId", "eventId", "senderId", "content", "read", "deleted", "createdAt", "updatedAt")
      SELECT "id", COALESCE("type", 'PRIVATE'), "eventDjId", "eventId", "senderId", "content", "read", COALESCE("deleted", false), "createdAt", COALESCE("updatedAt", "createdAt") FROM "Message";
      
      DROP TABLE "Message";
      
      ALTER TABLE "Message_new" RENAME TO "Message";
      
      CREATE INDEX "Message_eventDjId_idx" ON "Message"("eventDjId");
      CREATE INDEX "Message_eventId_idx" ON "Message"("eventId");
      CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
      CREATE INDEX "Message_type_idx" ON "Message"("type");
      CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");
      
      PRAGMA foreign_keys=ON;
    `);
    
    console.log('✅ Migration appliquée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixEventDjIdNullable();

