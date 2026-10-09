-- AlterTable
ALTER TABLE "FeedPost" ADD COLUMN "venueId" TEXT;

-- CreateIndex
CREATE INDEX "FeedPost_venueId_idx" ON "FeedPost"("venueId");

-- AddForeignKey
ALTER TABLE "FeedPost" ADD CONSTRAINT "FeedPost_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "UserVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "FollowVenue" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowVenue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowVenue_followerId_venueId_key" ON "FollowVenue"("followerId", "venueId");

-- CreateIndex
CREATE INDEX "FollowVenue_followerId_idx" ON "FollowVenue"("followerId");

-- CreateIndex
CREATE INDEX "FollowVenue_venueId_idx" ON "FollowVenue"("venueId");

-- AddForeignKey
ALTER TABLE "FollowVenue" ADD CONSTRAINT "FollowVenue_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowVenue" ADD CONSTRAINT "FollowVenue_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "UserVenue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
