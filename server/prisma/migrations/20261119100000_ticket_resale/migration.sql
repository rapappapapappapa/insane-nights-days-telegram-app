-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "resaleId" TEXT;

-- CreateTable
CREATE TABLE "TicketResale" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "buyerId" TEXT,
    "buyerPaymentIntentId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "sellerPaymentIntentId" TEXT NOT NULL,
    "sellerRefundId" TEXT,
    "refundStatus" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketResale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketResale_buyerPaymentIntentId_key" ON "TicketResale"("buyerPaymentIntentId");

-- CreateIndex
CREATE INDEX "TicketResale_eventId_status_idx" ON "TicketResale"("eventId", "status");

-- CreateIndex
CREATE INDEX "TicketResale_ticketId_idx" ON "TicketResale"("ticketId");

-- CreateIndex
CREATE INDEX "TicketResale_sellerId_idx" ON "TicketResale"("sellerId");

-- AddForeignKey
ALTER TABLE "TicketResale" ADD CONSTRAINT "TicketResale_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketResale" ADD CONSTRAINT "TicketResale_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketResale" ADD CONSTRAINT "TicketResale_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
