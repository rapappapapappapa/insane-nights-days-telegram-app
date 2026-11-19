-- AlterTable
ALTER TABLE "UserBooker" ADD COLUMN "helloAssoOrganizationSlug" TEXT,
ADD COLUMN "helloAssoAdhesionEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "helloAssoAdhesionLabel" TEXT,
ADD COLUMN "helloAssoAdhesionPriceCents" INTEGER;

-- CreateTable
CREATE TABLE "CollectifMembership" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "bookerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "checkoutIntentId" TEXT,
    "helloAssoOrderId" TEXT,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectifMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CollectifMembership_checkoutIntentId_key" ON "CollectifMembership"("checkoutIntentId");

-- CreateIndex
CREATE INDEX "CollectifMembership_bookerId_status_idx" ON "CollectifMembership"("bookerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CollectifMembership_communityId_bookerId_key" ON "CollectifMembership"("communityId", "bookerId");

-- AddForeignKey
ALTER TABLE "CollectifMembership" ADD CONSTRAINT "CollectifMembership_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "UserCommunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectifMembership" ADD CONSTRAINT "CollectifMembership_bookerId_fkey" FOREIGN KEY ("bookerId") REFERENCES "UserBooker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
