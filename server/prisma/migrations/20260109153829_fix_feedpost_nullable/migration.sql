-- Migration pour corriger les contraintes NULL sur djId et bookerId dans FeedPost

-- Sauvegarder les données existantes
CREATE TABLE IF NOT EXISTS FeedPost_backup AS SELECT * FROM FeedPost;

-- Supprimer la table existante
DROP TABLE IF EXISTS FeedPost;

-- Recréer la table avec les bonnes contraintes (djId et bookerId optionnels)
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "djId" TEXT,
    "bookerId" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("djId") REFERENCES "UserDj"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("bookerId") REFERENCES "UserBooker"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Recréer les index
CREATE INDEX "FeedPost_authorId_idx" ON "FeedPost"("authorId");
CREATE INDEX "FeedPost_djId_idx" ON "FeedPost"("djId");
CREATE INDEX "FeedPost_bookerId_idx" ON "FeedPost"("bookerId");
CREATE INDEX "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");

-- Restaurer les données
INSERT INTO "FeedPost" ("id","authorId","djId","bookerId","content","imageUrl","likes","createdAt","updatedAt")
SELECT
  "id",
  "authorId",
  "djId",
  NULL AS "bookerId",
  "content",
  "imageUrl",
  "likes",
  "createdAt",
  "updatedAt"
FROM FeedPost_backup;

-- Supprimer la table de sauvegarde
DROP TABLE IF EXISTS FeedPost_backup;
