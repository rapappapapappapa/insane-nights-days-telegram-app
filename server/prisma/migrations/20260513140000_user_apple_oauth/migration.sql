-- Identifiant Apple Sign In (nullable, unique)
ALTER TABLE "User" ADD COLUMN "appleId" TEXT;

CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
