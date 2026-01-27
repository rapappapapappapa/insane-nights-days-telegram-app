const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEventDjIdNullable() {
  try {
    console.log('🔧 Nettoyage et application de la migration pour rendre eventDjId nullable...');
    
    // Désactiver les clés étrangères
    await prisma.$executeRawUnsafe(`PRAGMA foreign_keys=OFF;`);
    
    // Supprimer Message_new si elle existe
    try {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "Message_new";`);
      console.log('✅ Table Message_new supprimée si elle existait');
    } catch (e) {
      console.log('ℹ️ Message_new n\'existait pas ou déjà supprimée');
    }
    
    // Vérifier si Message existe
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name='Message';`);
    if (tables.length === 0) {
      console.log('❌ La table Message n\'existe pas !');
      return;
    }
    
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
    console.log('✅ Table Message_new créée');
    
    // Copier les données
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Message_new" ("id", "type", "eventDjId", "eventId", "senderId", "content", "read", "deleted", "createdAt", "updatedAt")
      SELECT "id", COALESCE("type", 'PRIVATE'), "eventDjId", "eventId", "senderId", "content", "read", COALESCE("deleted", false), "createdAt", COALESCE("updatedAt", "createdAt") FROM "Message";
    `);
    console.log('✅ Données copiées');
    
    // Supprimer l'ancienne table
    await prisma.$executeRawUnsafe(`DROP TABLE "Message";`);
    console.log('✅ Ancienne table Message supprimée');
    
    // Renommer la nouvelle table
    await prisma.$executeRawUnsafe(`ALTER TABLE "Message_new" RENAME TO "Message";`);
    console.log('✅ Table renommée');
    
    // Recréer les index
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_eventDjId_idx" ON "Message"("eventDjId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_eventId_idx" ON "Message"("eventId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_senderId_idx" ON "Message"("senderId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_type_idx" ON "Message"("type");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Message_createdAt_idx" ON "Message"("createdAt");`);
    console.log('✅ Index recréés');
    
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

