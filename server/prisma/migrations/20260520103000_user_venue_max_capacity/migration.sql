-- AlterTable UserVenue: capacité maximale du lieu pour plafonner la capacité des événements booker
ALTER TABLE "UserVenue" ADD COLUMN "maxCapacity" INTEGER;
