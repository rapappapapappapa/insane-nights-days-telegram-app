-- Add pseudo column to UserBooker for display on feed
ALTER TABLE "UserBooker" ADD COLUMN IF NOT EXISTS "pseudo" TEXT;
