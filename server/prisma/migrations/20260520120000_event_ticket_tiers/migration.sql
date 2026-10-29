-- AlterTable Event: plusieurs paliers tarifaires (JSON)
ALTER TABLE "Event" ADD COLUMN "ticketTiers" JSONB;

-- AlterTable Ticket: lien optionnel vers un palier
ALTER TABLE "Ticket" ADD COLUMN "tierId" TEXT;

-- AlterTable Payment: même palier pour tout le lot de tickets Stripe
ALTER TABLE "Payment" ADD COLUMN "tierId" TEXT;

CREATE INDEX "Ticket_eventId_tierId_idx" ON "Ticket"("eventId", "tierId");
