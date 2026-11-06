-- AlterTable
ALTER TABLE "EventVenue" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EventVenue" ADD COLUMN "slotStart" TEXT;
ALTER TABLE "EventVenue" ADD COLUMN "slotEnd" TEXT;

-- AlterTable
ALTER TABLE "EventDj" ADD COLUMN "venueId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "scannedVenueIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AddForeignKey
ALTER TABLE "EventDj" ADD CONSTRAINT "EventDj_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "UserVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
