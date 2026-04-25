-- AlterTable
ALTER TABLE "ClinicalTrial" ADD COLUMN "coverMediaId" TEXT;

-- AlterTable
ALTER TABLE "CommunityGroup" ADD COLUMN "coverMediaId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "recommendDismissedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "welcomeTriggeredAt" DATETIME;
