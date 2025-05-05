-- AlterTable
ALTER TABLE "PrayerPairing" ADD COLUMN     "isSpecialPairing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestId" INTEGER;

-- CreateTable
CREATE TABLE "PrayerRequest" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PrayerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrayerRequest_userId_idx" ON "PrayerRequest"("userId");

-- CreateIndex
CREATE INDEX "PrayerPairing_requestId_idx" ON "PrayerPairing"("requestId");

-- AddForeignKey
ALTER TABLE "PrayerRequest" ADD CONSTRAINT "PrayerRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPairing" ADD CONSTRAINT "PrayerPairing_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "PrayerRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
