-- CreateTable
CREATE TABLE "CommunityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diseaseTag" TEXT,
    "introduction" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CommunityPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" TEXT NOT NULL DEFAULT 'patient',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postType" TEXT NOT NULL DEFAULT 'question',
    "relatedTrialId" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "rejectReason" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_relatedTrialId_fkey" FOREIGN KEY ("relatedTrialId") REFERENCES "ClinicalTrial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" TEXT NOT NULL DEFAULT 'patient',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunitySensitiveHit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT,
    "commentId" TEXT,
    "keyword" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "snippet" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunitySensitiveHit_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunitySensitiveHit_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "CommunityComment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommunityModerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT,
    "commentId" TEXT,
    "action" TEXT NOT NULL,
    "operatorId" TEXT,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommunityModerationLog_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityGroup_slug_key" ON "CommunityGroup"("slug");

-- CreateIndex
CREATE INDEX "CommunityGroup_isEnabled_sortOrder_idx" ON "CommunityGroup"("isEnabled", "sortOrder");

-- CreateIndex
CREATE INDEX "CommunityPost_groupId_reviewStatus_createdAt_idx" ON "CommunityPost"("groupId", "reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_reviewStatus_createdAt_idx" ON "CommunityPost"("reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityPost_isFeatured_createdAt_idx" ON "CommunityPost"("isFeatured", "createdAt");

-- CreateIndex
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunitySensitiveHit_postId_idx" ON "CommunitySensitiveHit"("postId");

-- CreateIndex
CREATE INDEX "CommunitySensitiveHit_commentId_idx" ON "CommunitySensitiveHit"("commentId");

-- CreateIndex
CREATE INDEX "CommunitySensitiveHit_riskType_idx" ON "CommunitySensitiveHit"("riskType");

-- CreateIndex
CREATE INDEX "CommunityModerationLog_postId_idx" ON "CommunityModerationLog"("postId");
