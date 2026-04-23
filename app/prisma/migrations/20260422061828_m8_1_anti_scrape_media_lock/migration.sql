-- CreateTable
CREATE TABLE "UserBehaviorLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "guestToken" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AccountLock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "triggeredBy" TEXT,
    "lockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unlockedAt" DATETIME,
    "unlockedBy" TEXT,
    "unlockReason" TEXT,
    "appealText" TEXT,
    "appealedAt" DATETIME,
    "appealStatus" TEXT NOT NULL DEFAULT 'none',
    "appealReplyText" TEXT,
    "appealHandledBy" TEXT,
    "appealHandledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AccountLock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "sizeBytes" INTEGER,
    "mimeType" TEXT,
    "note" TEXT,
    "uploadedBy" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UserBehaviorLog_userId_action_createdAt_idx" ON "UserBehaviorLog"("userId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_guestToken_action_createdAt_idx" ON "UserBehaviorLog"("guestToken", "action", "createdAt");

-- CreateIndex
CREATE INDEX "UserBehaviorLog_action_createdAt_idx" ON "UserBehaviorLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountLock_userId_key" ON "AccountLock"("userId");

-- CreateIndex
CREATE INDEX "AccountLock_appealStatus_createdAt_idx" ON "AccountLock"("appealStatus", "createdAt");

-- CreateIndex
CREATE INDEX "AccountLock_unlockedAt_idx" ON "AccountLock"("unlockedAt");

-- CreateIndex
CREATE INDEX "MediaAsset_category_isEnabled_createdAt_idx" ON "MediaAsset"("category", "isEnabled", "createdAt");
