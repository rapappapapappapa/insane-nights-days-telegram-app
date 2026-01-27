-- SQLite ne supporte pas les enums natifs, on utilise TEXT avec CHECK constraint
-- Ajout de la colonne type avec valeur par défaut 'PRIVATE'
ALTER TABLE "Message" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'PRIVATE';

-- Ajouter eventId comme nullable (pour les messages de groupe)
ALTER TABLE "Message" ADD COLUMN "eventId" TEXT;

-- Créer les index
CREATE INDEX "Message_eventId_idx" ON "Message"("eventId");
CREATE INDEX "Message_type_idx" ON "Message"("type");

