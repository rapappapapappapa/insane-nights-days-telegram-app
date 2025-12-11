const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔄 Application de la migration pour les invitations...');
    
    // Vérifier si les colonnes existent déjà
    const result = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='EventDj'
    `;
    
    if (result.length === 0) {
      console.log('❌ Table EventDj non trouvée');
      return;
    }
    
    // Vérifier si la colonne status existe
    const columns = await prisma.$queryRaw`
      PRAGMA table_info(EventDj)
    `;
    
    const hasStatus = columns.some(col => col.name === 'status');
    const hasUpdatedAt = columns.some(col => col.name === 'updatedAt');
    
    if (!hasStatus) {
      console.log('➕ Ajout de la colonne status...');
      await prisma.$executeRaw`ALTER TABLE "EventDj" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING'`;
      console.log('✅ Colonne status ajoutée');
    } else {
      console.log('ℹ️  Colonne status existe déjà');
    }
    
    if (!hasUpdatedAt) {
      console.log('➕ Ajout de la colonne updatedAt...');
      await prisma.$executeRaw`ALTER TABLE "EventDj" ADD COLUMN "updatedAt" DATETIME`;
      await prisma.$executeRaw`UPDATE "EventDj" SET "updatedAt" = datetime('now') WHERE "updatedAt" IS NULL`;
      console.log('✅ Colonne updatedAt ajoutée');
    } else {
      console.log('ℹ️  Colonne updatedAt existe déjà');
    }
    
    // Créer l'index si nécessaire
    const indexes = await prisma.$queryRaw`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name='EventDj_status_idx'
    `;
    
    if (indexes.length === 0) {
      console.log('➕ Création de l\'index sur status...');
      await prisma.$executeRaw`CREATE INDEX "EventDj_status_idx" ON "EventDj"("status")`;
      console.log('✅ Index créé');
    } else {
      console.log('ℹ️  Index existe déjà');
    }
    
    // Mettre à jour les enregistrements existants en ACCEPTED
    const count = await prisma.$executeRaw`
      UPDATE "EventDj" SET "status" = 'ACCEPTED' WHERE "status" = 'PENDING'
    `;
    console.log(`✅ ${count} enregistrement(s) mis à jour en ACCEPTED`);
    
    console.log('✨ Migration appliquée avec succès !');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

