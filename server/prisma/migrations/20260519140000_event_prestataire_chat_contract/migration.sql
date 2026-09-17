-- CreateEnum
CREATE TYPE "ContractPartyPrestataire" AS ENUM ('BOOKER', 'PRESTATAIRE');

-- CreateTable
CREATE TABLE "EventPrestataire" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "prestataireId" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "BookingPaymentStatus" NOT NULL DEFAULT 'UPCOMING',
    "paymentAmount" INTEGER,
    "paymentCurrency" TEXT NOT NULL DEFAULT 'eur',
    "paidAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "contractStatus" "BookingContractStatus" NOT NULL DEFAULT 'DRAFT',
    "contractVersion" INTEGER NOT NULL DEFAULT 1,
    "contractPayload" JSONB,
    "contractHash" TEXT,
    "contractSentAt" TIMESTAMP(3),
    "contractSentBy" "ContractPartyPrestataire",
    "bookerAcceptedAt" TIMESTAMP(3),
    "prestataireAcceptedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventPrestataire_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventPrestataire_eventId_prestataireId_key" ON "EventPrestataire"("eventId", "prestataireId");

-- CreateIndex
CREATE INDEX "EventPrestataire_eventId_idx" ON "EventPrestataire"("eventId");

-- CreateIndex
CREATE INDEX "EventPrestataire_prestataireId_idx" ON "EventPrestataire"("prestataireId");

-- CreateIndex
CREATE INDEX "EventPrestataire_status_idx" ON "EventPrestataire"("status");

-- AddForeignKey
ALTER TABLE "EventPrestataire" ADD CONSTRAINT "EventPrestataire_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPrestataire" ADD CONSTRAINT "EventPrestataire_prestataireId_fkey" FOREIGN KEY ("prestataireId") REFERENCES "UserPrestataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "eventPrestataireId" TEXT;

-- CreateIndex
CREATE INDEX "Message_eventPrestataireId_idx" ON "Message"("eventPrestataireId");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_eventPrestataireId_fkey" FOREIGN KEY ("eventPrestataireId") REFERENCES "EventPrestataire"("id") ON DELETE CASCADE ON UPDATE CASCADE;
