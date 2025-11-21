-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountType" TEXT;
ALTER TABLE "User" ADD COLUMN "activeProfileType" TEXT;

-- CreateTable
CREATE TABLE "UserCommunity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "dateNaissance" TEXT NOT NULL,
    "isnNumber" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserCommunity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserDj" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birthDate" TEXT NOT NULL,
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

-- CreateTable
CREATE TABLE "UserBooker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "phonePro" TEXT NOT NULL,
    "bookerType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserBooker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserVenue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "venueName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "averageRatingCommunity" REAL NOT NULL DEFAULT 0.0,
    "averageRatingBooker" REAL NOT NULL DEFAULT 0.0,
    "averageRatingDj" REAL NOT NULL DEFAULT 0.0,
    "averageRatingGlobal" REAL NOT NULL DEFAULT 0.0,
    "totalRatingsCommunity" INTEGER NOT NULL DEFAULT 0,
    "totalRatingsBooker" INTEGER NOT NULL DEFAULT 0,
    "totalRatingsDj" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserVenue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DjRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "djId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "raterType" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "comment" TEXT,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DjRating_djId_fkey" FOREIGN KEY ("djId") REFERENCES "UserDj" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DjRating_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DjRating_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VenueRating" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "raterType" TEXT NOT NULL,
    "rating" REAL NOT NULL,
    "comment" TEXT,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VenueRating_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "UserVenue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "VenueRating_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VenueRating_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "capacity" INTEGER NOT NULL,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "genre" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "venueId" TEXT,
    "bookerId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "UserVenue" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Event_bookerId_fkey" FOREIGN KEY ("bookerId") REFERENCES "UserBooker" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventDj" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "djId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventDj_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "qrCode" TEXT NOT NULL,
    "purchaseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Ticket_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCommunity_isnNumber_key" ON "UserCommunity"("isnNumber");

-- CreateIndex
CREATE INDEX "UserCommunity_userId_idx" ON "UserCommunity"("userId");

-- CreateIndex
CREATE INDEX "UserDj_userId_idx" ON "UserDj"("userId");

-- CreateIndex
CREATE INDEX "UserBooker_userId_idx" ON "UserBooker"("userId");

-- CreateIndex
CREATE INDEX "UserVenue_userId_idx" ON "UserVenue"("userId");

-- CreateIndex
CREATE INDEX "DjRating_djId_idx" ON "DjRating"("djId");

-- CreateIndex
CREATE INDEX "DjRating_raterId_idx" ON "DjRating"("raterId");

-- CreateIndex
CREATE INDEX "DjRating_eventId_idx" ON "DjRating"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "DjRating_djId_raterId_eventId_key" ON "DjRating"("djId", "raterId", "eventId");

-- CreateIndex
CREATE INDEX "VenueRating_venueId_idx" ON "VenueRating"("venueId");

-- CreateIndex
CREATE INDEX "VenueRating_raterId_idx" ON "VenueRating"("raterId");

-- CreateIndex
CREATE INDEX "VenueRating_eventId_idx" ON "VenueRating"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "VenueRating_venueId_raterId_eventId_key" ON "VenueRating"("venueId", "raterId", "eventId");

-- CreateIndex
CREATE INDEX "EventDj_eventId_idx" ON "EventDj"("eventId");

-- CreateIndex
CREATE INDEX "EventDj_djId_idx" ON "EventDj"("djId");

-- CreateIndex
CREATE UNIQUE INDEX "EventDj_eventId_djId_key" ON "EventDj"("eventId", "djId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_qrCode_key" ON "Ticket"("qrCode");

-- CreateIndex
CREATE INDEX "Ticket_userId_idx" ON "Ticket"("userId");

-- CreateIndex
CREATE INDEX "Ticket_eventId_idx" ON "Ticket"("eventId");
