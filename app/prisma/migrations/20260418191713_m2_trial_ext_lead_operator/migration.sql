-- AlterTable
ALTER TABLE "ClinicalTrial" ADD COLUMN "adVersion" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "adVersionDate" DATETIME;
ALTER TABLE "ClinicalTrial" ADD COLUMN "benefits" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "contactPerson" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "ethicsApproval" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "followUpPlan" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "intervention" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "qrcodeUrl" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "siteAddress" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "siteName" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "sponsor" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "studyDesign" TEXT;
ALTER TABLE "ClinicalTrial" ADD COLUMN "targetEnrollment" INTEGER;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trialId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" TEXT,
    "age" INTEGER,
    "city" TEXT,
    "condition" TEXT,
    "projectAnswers" TEXT,
    "agreePrivacy" BOOLEAN NOT NULL DEFAULT false,
    "agreeReuse" BOOLEAN NOT NULL DEFAULT false,
    "sourcePage" TEXT,
    "sourcePostId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "statusChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusChangedBy" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lead_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "ClinicalTrial" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OperatorUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Lead_trialId_status_idx" ON "Lead"("trialId", "status");

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "OperatorUser_username_key" ON "OperatorUser"("username");
