-- Repost feed : lien vers le post d'origine
ALTER TABLE "FeedPost" ADD COLUMN "originalPostId" TEXT;

CREATE INDEX "FeedPost_originalPostId_idx" ON "FeedPost"("originalPostId");

ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_originalPostId_fkey"
  FOREIGN KEY ("originalPostId") REFERENCES "FeedPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "FeedPost_originalPostId_authorId_key" ON "FeedPost"("originalPostId", "authorId")
  WHERE "originalPostId" IS NOT NULL;
