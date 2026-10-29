-- AlterTable: UserCommunity - ajout photo, bannière, pseudo, styles écoutés
ALTER TABLE "UserCommunity" ADD COLUMN "pseudo" TEXT;
ALTER TABLE "UserCommunity" ADD COLUMN "profileImage" TEXT;
ALTER TABLE "UserCommunity" ADD COLUMN "bannerImage" TEXT;
ALTER TABLE "UserCommunity" ADD COLUMN "genres" TEXT;

-- CreateEnum: statut des demandes d'amis
CREATE TYPE "CommunityFriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateTable: amis entre profils Communauté
CREATE TABLE "CommunityFriend" (
    "id" TEXT NOT NULL,
    "requesterCommunityId" TEXT NOT NULL,
    "requestedCommunityId" TEXT NOT NULL,
    "status" "CommunityFriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityFriend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityFriend_requesterCommunityId_requestedCommunityId_key" ON "CommunityFriend"("requesterCommunityId", "requestedCommunityId");

-- CreateIndex
CREATE INDEX "CommunityFriend_requesterCommunityId_idx" ON "CommunityFriend"("requesterCommunityId");

-- CreateIndex
CREATE INDEX "CommunityFriend_requestedCommunityId_idx" ON "CommunityFriend"("requestedCommunityId");

-- CreateIndex
CREATE INDEX "CommunityFriend_status_idx" ON "CommunityFriend"("status");

-- AddForeignKey
ALTER TABLE "CommunityFriend" ADD CONSTRAINT "CommunityFriend_requesterCommunityId_fkey" FOREIGN KEY ("requesterCommunityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityFriend" ADD CONSTRAINT "CommunityFriend_requestedCommunityId_fkey" FOREIGN KEY ("requestedCommunityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
