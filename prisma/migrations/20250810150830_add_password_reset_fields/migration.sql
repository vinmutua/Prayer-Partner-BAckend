-- DropForeignKey
ALTER TABLE "PrayerPairing" DROP CONSTRAINT "PrayerPairing_partner1Id_fkey";

-- DropForeignKey
ALTER TABLE "PrayerPairing" DROP CONSTRAINT "PrayerPairing_partner2Id_fkey";

-- DropForeignKey
ALTER TABLE "PrayerRequest" DROP CONSTRAINT "PrayerRequest_userId_fkey";

-- AlterTable
ALTER TABLE "PrayerPairing" ALTER COLUMN "emailSentAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "resetToken" TEXT,
ADD COLUMN     "resetTokenExpiry" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "PrayerPairing_startDate_endDate_idx" ON "PrayerPairing"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "PrayerRequest_isActive_idx" ON "PrayerRequest"("isActive");

-- CreateIndex
CREATE INDEX "PrayerRequest_createdAt_idx" ON "PrayerRequest"("createdAt");

-- CreateIndex
CREATE INDEX "PrayerTheme_active_idx" ON "PrayerTheme"("active");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_active_idx" ON "User"("active");

-- CreateIndex
CREATE INDEX "User_resetToken_idx" ON "User"("resetToken");

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPairing" ADD CONSTRAINT "PrayerPairing_partner1Id_fkey" FOREIGN KEY ("partner1Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPairing" ADD CONSTRAINT "PrayerPairing_partner2Id_fkey" FOREIGN KEY ("partner2Id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
