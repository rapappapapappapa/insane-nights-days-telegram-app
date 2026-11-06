-- CreateTable
-- SQLite ne supporte pas les enums natifs, on utilise TEXT avec CHECK constraint
-- Ajout de la colonne status avec valeur par défaut 'PENDING'
ALTER TABLE "EventDj" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
-- Ajout de la colonne updatedAt (nullable d'abord pour les enregistrements existants)
ALTER TABLE "EventDj" ADD COLUMN "updatedAt" TIMESTAMP(3);
-- Mettre à jour les enregistrements existants avec la date actuelle
UPDATE "EventDj" SET "updatedAt" = datetime('now') WHERE "updatedAt" IS NULL;

-- Création d'un index sur status pour améliorer les performances
CREATE INDEX "EventDj_status_idx" ON "EventDj"("status");

-- Mise à jour des enregistrements existants pour qu'ils soient ACCEPTED (compatibilité)
-- Tous les enregistrements existants auront 'PENDING' par défaut, on les met à jour en 'ACCEPTED'
UPDATE "EventDj" SET "status" = 'ACCEPTED';

