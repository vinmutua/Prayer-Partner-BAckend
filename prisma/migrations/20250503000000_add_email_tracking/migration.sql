-- Add email tracking fields to PrayerPairing
ALTER TABLE "PrayerPairing" ADD COLUMN "emailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PrayerPairing" ADD COLUMN "emailSentAt" TIMESTAMP;

-- Add isSpecial field to PrayerRequest if it doesn't exist
ALTER TABLE "PrayerRequest" ADD COLUMN IF NOT EXISTS "isSpecial" BOOLEAN NOT NULL DEFAULT false;
