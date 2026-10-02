-- Location matériel : sélection par événement + catalogue personnel booker

ALTER TABLE "Event" ADD COLUMN "equipmentRental" JSONB;

ALTER TABLE "UserBooker" ADD COLUMN "rentalEquipmentInventory" JSONB;
