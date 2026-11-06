-- CreateTable
CREATE TABLE "UserPrestataire" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "phonePro" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "bio" TEXT,
    "profileImage" TEXT,
    "bannerImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrestataire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPrestataire_userId_key" ON "UserPrestataire"("userId");

-- CreateIndex
CREATE INDEX "UserPrestataire_userId_idx" ON "UserPrestataire"("userId");

-- AddForeignKey
ALTER TABLE "UserPrestataire" ADD CONSTRAINT "UserPrestataire_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'PRESTATAIRE_PROFILE';
