-- AlterTable UserBooker: infos légales pour contrats
ALTER TABLE "UserBooker" ADD COLUMN "companyName" TEXT;
ALTER TABLE "UserBooker" ADD COLUMN "address" TEXT;
ALTER TABLE "UserBooker" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "UserBooker" ADD COLUMN "city" TEXT;
ALTER TABLE "UserBooker" ADD COLUMN "country" TEXT;
ALTER TABLE "UserBooker" ADD COLUMN "siret" TEXT;

-- AlterTable UserVenue: infos légales pour contrats
ALTER TABLE "UserVenue" ADD COLUMN "companyName" TEXT;
ALTER TABLE "UserVenue" ADD COLUMN "legalRepresentative" TEXT;
ALTER TABLE "UserVenue" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "UserVenue" ADD COLUMN "city" TEXT;
ALTER TABLE "UserVenue" ADD COLUMN "country" TEXT;
ALTER TABLE "UserVenue" ADD COLUMN "siret" TEXT;

-- AlterTable UserDj: infos légales pour contrats (city existe déjà pour ville, on garde city pour l'affichage)
ALTER TABLE "UserDj" ADD COLUMN "legalName" TEXT;
ALTER TABLE "UserDj" ADD COLUMN "address" TEXT;
ALTER TABLE "UserDj" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "UserDj" ADD COLUMN "country" TEXT;
ALTER TABLE "UserDj" ADD COLUMN "siret" TEXT;
ALTER TABLE "UserDj" ADD COLUMN "vatNumber" TEXT;
