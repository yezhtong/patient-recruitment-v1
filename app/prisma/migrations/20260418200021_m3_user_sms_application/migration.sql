-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "displayName" TEXT,
    "name" TEXT,
    "gender" TEXT,
    "age" INTEGER,
    "city" TEXT,
    "condition" TEXT,
    "agreeReuse" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SmsCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "phone" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "consumedAt" DATETIME,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "trialId" TEXT NOT NULL,
    "leadId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'submitted',
    "stageChangedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextAction" TEXT,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "ClinicalTrial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trialId" TEXT NOT NULL,
    "userId" TEXT,
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
    CONSTRAINT "Lead_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "ClinicalTrial" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lead" ("age", "agreePrivacy", "agreeReuse", "city", "condition", "createdAt", "gender", "id", "name", "note", "phone", "projectAnswers", "sourcePage", "sourcePostId", "status", "statusChangedAt", "statusChangedBy", "trialId", "updatedAt") SELECT "age", "agreePrivacy", "agreeReuse", "city", "condition", "createdAt", "gender", "id", "name", "note", "phone", "projectAnswers", "sourcePage", "sourcePostId", "status", "statusChangedAt", "statusChangedBy", "trialId", "updatedAt" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE INDEX "Lead_trialId_status_idx" ON "Lead"("trialId", "status");
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");
CREATE INDEX "Lead_userId_createdAt_idx" ON "Lead"("userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "SmsCode_phone_createdAt_idx" ON "SmsCode"("phone", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Application_leadId_key" ON "Application"("leadId");

-- CreateIndex
CREATE INDEX "Application_userId_createdAt_idx" ON "Application"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Application_trialId_stage_idx" ON "Application"("trialId", "stage");
