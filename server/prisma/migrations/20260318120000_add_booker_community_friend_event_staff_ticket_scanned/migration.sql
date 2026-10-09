-- CreateEnum: statut des demandes d'amis booker-communauté
CREATE TYPE "BookerFriendStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum: rôle du staff événement
CREATE TYPE "EventStaffRole" AS ENUM ('STAFF_SCAN');

-- CreateTable: amis entre booker et profils Communauté
CREATE TABLE "BookerCommunityFriend" (
    "id" TEXT NOT NULL,
    "bookerId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "status" "BookerFriendStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookerCommunityFriend_pkey" PRIMARY KEY ("id")
);

-- CreateTable: staff événement (scan de billets)
CREATE TABLE "EventStaff" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "role" "EventStaffRole" NOT NULL DEFAULT 'STAFF_SCAN',
    "addedByBookerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventStaff_pkey" PRIMARY KEY ("id")
);

-- AlterTable: Ticket - ajout date de scan
ALTER TABLE "Ticket" ADD COLUMN "scannedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "BookerCommunityFriend_bookerId_communityId_key" ON "BookerCommunityFriend"("bookerId", "communityId");

-- CreateIndex
CREATE INDEX "BookerCommunityFriend_bookerId_idx" ON "BookerCommunityFriend"("bookerId");

-- CreateIndex
CREATE INDEX "BookerCommunityFriend_communityId_idx" ON "BookerCommunityFriend"("communityId");

-- CreateIndex
CREATE INDEX "BookerCommunityFriend_status_idx" ON "BookerCommunityFriend"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EventStaff_eventId_communityId_key" ON "EventStaff"("eventId", "communityId");

-- CreateIndex
CREATE INDEX "EventStaff_eventId_idx" ON "EventStaff"("eventId");

-- CreateIndex
CREATE INDEX "EventStaff_communityId_idx" ON "EventStaff"("communityId");

-- AddForeignKey
ALTER TABLE "BookerCommunityFriend" ADD CONSTRAINT "BookerCommunityFriend_bookerId_fkey" FOREIGN KEY ("bookerId") REFERENCES "UserBooker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookerCommunityFriend" ADD CONSTRAINT "BookerCommunityFriend_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventStaff" ADD CONSTRAINT "EventStaff_addedByBookerId_fkey" FOREIGN KEY ("addedByBookerId") REFERENCES "UserBooker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
