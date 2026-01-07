-- SQLite ne supporte pas ALTER COLUMN, on doit recréer la table
-- Désactiver temporairement les clés étrangères
PRAGMA foreign_keys=OFF;

-- Créer une nouvelle table avec eventDjId nullable
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

-- Copier les données de l'ancienne table vers la nouvelle
INSERT INTO "Message_new" ("id", "type", "eventDjId", "eventId", "senderId", "content", "read", "deleted", "createdAt", "updatedAt")
SELECT "id", COALESCE("type", 'PRIVATE'), "eventDjId", "eventId", "senderId", "content", "read", COALESCE("deleted", false), "createdAt", COALESCE("updatedAt", "createdAt") FROM "Message";

-- Supprimer l'ancienne table
DROP TABLE "Message";

-- Renommer la nouvelle table
ALTER TABLE "Message_new" RENAME TO "Message";

-- Recréer les index
CREATE INDEX "Message_eventDjId_idx" ON "Message"("eventDjId");
CREATE INDEX "Message_eventId_idx" ON "Message"("eventId");
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");
CREATE INDEX "Message_type_idx" ON "Message"("type");
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- Réactiver les clés étrangères
PRAGMA foreign_keys=ON;
