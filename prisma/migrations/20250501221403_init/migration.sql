-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerTheme" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PrayerTheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrayerPairing" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "partner1Id" INTEGER NOT NULL,
    "partner2Id" INTEGER NOT NULL,
    "themeId" INTEGER NOT NULL,

    CONSTRAINT "PrayerPairing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "PrayerPairing_partner1Id_idx" ON "PrayerPairing"("partner1Id");

-- CreateIndex
CREATE INDEX "PrayerPairing_partner2Id_idx" ON "PrayerPairing"("partner2Id");

-- CreateIndex
CREATE INDEX "PrayerPairing_themeId_idx" ON "PrayerPairing"("themeId");

-- AddForeignKey
ALTER TABLE "PrayerPairing" ADD CONSTRAINT "PrayerPairing_partner1Id_fkey" FOREIGN KEY ("partner1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPairing" ADD CONSTRAINT "PrayerPairing_partner2Id_fkey" FOREIGN KEY ("partner2Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPairing" ADD CONSTRAINT "PrayerPairing_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "PrayerTheme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
