-- CreateTable
CREATE TABLE "DjMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "djId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "thumbnail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DjMedia_djId_fkey" FOREIGN KEY ("djId") REFERENCES "UserDj" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserDj" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
    "bio" TEXT,
    "genre" TEXT,
    "mainCity" TEXT,
    "languages" TEXT,
    "profileImage" TEXT,
    "bannerImage" TEXT,
    "hourlyRate" REAL,
    "performanceRate" REAL,
    "minTravelFee" REAL,
    "extraFees" REAL,
    "availableDays" TEXT,
    "availableStatus" BOOLEAN NOT NULL DEFAULT true,
    "averageRatingCommunity" REAL NOT NULL DEFAULT 0.0,
    "averageRatingBooker" REAL NOT NULL DEFAULT 0.0,
    "averageRatingVenue" REAL NOT NULL DEFAULT 0.0,
    "averageRatingGlobal" REAL NOT NULL DEFAULT 0.0,
    "totalRatingsCommunity" INTEGER NOT NULL DEFAULT 0,
    "totalRatingsBooker" INTEGER NOT NULL DEFAULT 0,
    "totalRatingsVenue" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserDj_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserDj" ("artistName", "averageRatingBooker", "averageRatingCommunity", "averageRatingGlobal", "averageRatingVenue", "birthDate", "city", "createdAt", "id", "phone", "totalRatingsBooker", "totalRatingsCommunity", "totalRatingsVenue", "updatedAt", "userId") SELECT "artistName", "averageRatingBooker", "averageRatingCommunity", "averageRatingGlobal", "averageRatingVenue", "birthDate", "city", "createdAt", "id", "phone", "totalRatingsBooker", "totalRatingsCommunity", "totalRatingsVenue", "updatedAt", "userId" FROM "UserDj";
DROP TABLE "UserDj";
ALTER TABLE "new_UserDj" RENAME TO "UserDj";
CREATE INDEX "UserDj_userId_idx" ON "UserDj"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DjMedia_djId_idx" ON "DjMedia"("djId");

-- CreateIndex
CREATE INDEX "DjMedia_type_idx" ON "DjMedia"("type");
