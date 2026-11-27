-- CreateTable
CREATE TABLE "FollowDj" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowDj_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowBooker" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "bookerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowBooker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FollowDj_followerId_djId_key" ON "FollowDj"("followerId", "djId");

-- CreateIndex
CREATE INDEX "FollowDj_followerId_idx" ON "FollowDj"("followerId");

-- CreateIndex
CREATE INDEX "FollowDj_djId_idx" ON "FollowDj"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "FollowBooker_followerId_bookerId_key" ON "FollowBooker"("followerId", "bookerId");

-- CreateIndex
CREATE INDEX "FollowBooker_followerId_idx" ON "FollowBooker"("followerId");

-- CreateIndex
CREATE INDEX "FollowBooker_bookerId_idx" ON "FollowBooker"("bookerId");

-- AddForeignKey
ALTER TABLE "FollowDj" ADD CONSTRAINT "FollowDj_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowDj" ADD CONSTRAINT "FollowDj_djId_fkey" FOREIGN KEY ("djId") REFERENCES "UserDj"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowBooker" ADD CONSTRAINT "FollowBooker_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowBooker" ADD CONSTRAINT "FollowBooker_bookerId_fkey" FOREIGN KEY ("bookerId") REFERENCES "UserBooker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
