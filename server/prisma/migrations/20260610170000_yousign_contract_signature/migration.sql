-- Signature électronique Yousign sur les contrats
-- Nouveau statut intermédiaire : les deux parties ont accepté sur Nox,
-- la signature électronique est en cours chez Yousign.
ALTER TYPE "BookingContractStatus" ADD VALUE IF NOT EXISTS 'PENDING_SIGNATURE';

ALTER TABLE "EventDj" ADD COLUMN IF NOT EXISTS "yousignSignatureRequestId" TEXT;
ALTER TABLE "EventVenue" ADD COLUMN IF NOT EXISTS "yousignSignatureRequestId" TEXT;
ALTER TABLE "EventPrestataire" ADD COLUMN IF NOT EXISTS "yousignSignatureRequestId" TEXT;

CREATE INDEX IF NOT EXISTS "EventDj_yousignSignatureRequestId_idx" ON "EventDj"("yousignSignatureRequestId");
CREATE INDEX IF NOT EXISTS "EventVenue_yousignSignatureRequestId_idx" ON "EventVenue"("yousignSignatureRequestId");
CREATE INDEX IF NOT EXISTS "EventPrestataire_yousignSignatureRequestId_idx" ON "EventPrestataire"("yousignSignatureRequestId");
