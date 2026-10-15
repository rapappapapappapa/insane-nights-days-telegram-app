-- Paiement Stripe du booker avant envoi Yousign pour signature

ALTER TYPE "BookingContractStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';

ALTER TABLE "EventDj" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "EventVenue" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "EventPrestataire" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;

CREATE INDEX IF NOT EXISTS "EventDj_stripePaymentIntentId_idx" ON "EventDj"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "EventVenue_stripePaymentIntentId_idx" ON "EventVenue"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "EventPrestataire_stripePaymentIntentId_idx" ON "EventPrestataire"("stripePaymentIntentId");
