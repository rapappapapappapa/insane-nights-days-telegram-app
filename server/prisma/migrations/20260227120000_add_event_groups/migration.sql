-- CreateEnum
CREATE TYPE "EventGroupMemberStatus" AS ENUM ('INVITED', 'JOINED', 'DECLINED');

-- CreateTable
CREATE TABLE "EventGroup" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "creatorCommunityId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "status" "EventGroupMemberStatus" NOT NULL DEFAULT 'INVITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventGroup_eventId_creatorCommunityId_key" ON "EventGroup"("eventId", "creatorCommunityId");

-- CreateIndex
CREATE INDEX "EventGroup_eventId_idx" ON "EventGroup"("eventId");

-- CreateIndex
CREATE INDEX "EventGroup_creatorCommunityId_idx" ON "EventGroup"("creatorCommunityId");

-- CreateIndex
CREATE UNIQUE INDEX "EventGroupMember_groupId_communityId_key" ON "EventGroupMember"("groupId", "communityId");

-- CreateIndex
CREATE INDEX "EventGroupMember_groupId_idx" ON "EventGroupMember"("groupId");

-- CreateIndex
CREATE INDEX "EventGroupMember_communityId_idx" ON "EventGroupMember"("communityId");

-- AddForeignKey
ALTER TABLE "EventGroup" ADD CONSTRAINT "EventGroup_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGroup" ADD CONSTRAINT "EventGroup_creatorCommunityId_fkey" FOREIGN KEY ("creatorCommunityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGroupMember" ADD CONSTRAINT "EventGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventGroupMember" ADD CONSTRAINT "EventGroupMember_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
