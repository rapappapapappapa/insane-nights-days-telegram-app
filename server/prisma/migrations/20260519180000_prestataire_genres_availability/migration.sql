-- Genres de prestation (plusieurs) + disponibilités alignées DJ

ALTER TABLE "UserPrestataire" ADD COLUMN "prestationGenres" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "UserPrestataire" SET "prestationGenres" = ARRAY["serviceType"]
WHERE "serviceType" IS NOT NULL AND TRIM("serviceType") <> '';

ALTER TABLE "UserPrestataire" DROP COLUMN "serviceType";

ALTER TABLE "UserPrestataire" ADD COLUMN "availableDays" TEXT;

ALTER TABLE "UserPrestataire" ADD COLUMN "availableStatus" BOOLEAN NOT NULL DEFAULT true;
