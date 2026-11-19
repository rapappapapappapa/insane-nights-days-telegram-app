-- ✅ AJOUT: Création de la table FeedPost pour le feed d'actualité
CREATE TABLE "FeedPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "authorId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FeedPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FeedPost_djId_fkey" FOREIGN KEY ("djId") REFERENCES "UserDj" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "FeedPost_authorId_idx" ON "FeedPost"("authorId");
CREATE INDEX "FeedPost_djId_idx" ON "FeedPost"("djId");
CREATE INDEX "FeedPost_createdAt_idx" ON "FeedPost"("createdAt");
