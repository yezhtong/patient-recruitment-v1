-- CreateTable
CREATE TABLE "UserMedicalRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "note" TEXT,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "deletedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserMedicalRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserGroupMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" DATETIME,
    "joinSymptoms" TEXT,
    "joinDiseaseTagsJson" TEXT,
    CONSTRAINT "UserGroupMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserGroupMembership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MatchAssistantSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "transcript" TEXT NOT NULL,
    "symptomsSnapshot" TEXT,
    "recommendedTrialIds" TEXT,
    "recommendedDepartment" TEXT,
    "symptomDirection" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MatchAssistantSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiAccountTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenario" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "triggerRule" TEXT NOT NULL,
    "contentTemplate" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CommunityComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "authorRole" TEXT NOT NULL DEFAULT 'patient',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'approved',
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "aiReviewedAt" DATETIME,
    "aiReviewResult" TEXT,
    "aiReviewConfidence" REAL,
    "aiReviewReason" TEXT,
    "humanOverride" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityComment_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommunityComment" ("authorRole", "authorUserId", "content", "createdAt", "id", "isAnonymous", "postId", "reviewStatus", "reviewedAt", "reviewedBy", "updatedAt") SELECT "authorRole", "authorUserId", "content", "createdAt", "id", "isAnonymous", "postId", "reviewStatus", "reviewedAt", "reviewedBy", "updatedAt" FROM "CommunityComment";
DROP TABLE "CommunityComment";
ALTER TABLE "new_CommunityComment" RENAME TO "CommunityComment";
CREATE INDEX "CommunityComment_postId_createdAt_idx" ON "CommunityComment"("postId", "createdAt");
CREATE TABLE "new_CommunityGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "diseaseTag" TEXT,
    "introduction" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "headerImageUrl" TEXT,
    "recommendedDiseaseKeywords" TEXT,
    "allowAiComment" BOOLEAN NOT NULL DEFAULT true,
    "allowDoctorComment" BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO "new_CommunityGroup" ("createdAt", "diseaseTag", "id", "introduction", "isEnabled", "name", "slug", "sortOrder", "updatedAt") SELECT "createdAt", "diseaseTag", "id", "introduction", "isEnabled", "name", "slug", "sortOrder", "updatedAt" FROM "CommunityGroup";
DROP TABLE "CommunityGroup";
ALTER TABLE "new_CommunityGroup" RENAME TO "CommunityGroup";
CREATE UNIQUE INDEX "CommunityGroup_slug_key" ON "CommunityGroup"("slug");
CREATE INDEX "CommunityGroup_isEnabled_sortOrder_idx" ON "CommunityGroup"("isEnabled", "sortOrder");
CREATE TABLE "new_CommunityPost" (
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
    "tags" TEXT,
    "aiReviewedAt" DATETIME,
    "aiReviewResult" TEXT,
    "aiReviewConfidence" REAL,
    "aiReviewReason" TEXT,
    "humanOverride" TEXT,
    "isAiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CommunityPost_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CommunityGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommunityPost_relatedTrialId_fkey" FOREIGN KEY ("relatedTrialId") REFERENCES "ClinicalTrial" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommunityPost" ("authorRole", "authorUserId", "content", "createdAt", "groupId", "id", "isAnonymous", "isFeatured", "postType", "rejectReason", "relatedTrialId", "reviewStatus", "reviewedAt", "reviewedBy", "title", "updatedAt", "viewCount") SELECT "authorRole", "authorUserId", "content", "createdAt", "groupId", "id", "isAnonymous", "isFeatured", "postType", "rejectReason", "relatedTrialId", "reviewStatus", "reviewedAt", "reviewedBy", "title", "updatedAt", "viewCount" FROM "CommunityPost";
DROP TABLE "CommunityPost";
ALTER TABLE "new_CommunityPost" RENAME TO "CommunityPost";
CREATE INDEX "CommunityPost_groupId_reviewStatus_createdAt_idx" ON "CommunityPost"("groupId", "reviewStatus", "createdAt");
CREATE INDEX "CommunityPost_reviewStatus_createdAt_idx" ON "CommunityPost"("reviewStatus", "createdAt");
CREATE INDEX "CommunityPost_isFeatured_createdAt_idx" ON "CommunityPost"("isFeatured", "createdAt");
CREATE TABLE "new_User" (
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
    "updatedAt" DATETIME NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'patient',
    "isSystemAi" BOOLEAN NOT NULL DEFAULT false,
    "symptomsText" TEXT,
    "aiDiseaseTags" TEXT,
    "symptomsUpdatedAt" DATETIME,
    "lastMatchedAt" DATETIME
);
INSERT INTO "new_User" ("age", "agreeReuse", "city", "condition", "createdAt", "displayName", "gender", "id", "lastLoginAt", "name", "phone", "updatedAt") SELECT "age", "agreeReuse", "city", "condition", "createdAt", "displayName", "gender", "id", "lastLoginAt", "name", "phone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "UserMedicalRecord_userId_createdAt_idx" ON "UserMedicalRecord"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "UserMedicalRecord_isReviewed_createdAt_idx" ON "UserMedicalRecord"("isReviewed", "createdAt");

-- CreateIndex
CREATE INDEX "UserMedicalRecord_deletedAt_idx" ON "UserMedicalRecord"("deletedAt");

-- CreateIndex
CREATE INDEX "UserGroupMembership_userId_leftAt_idx" ON "UserGroupMembership"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "UserGroupMembership_groupId_leftAt_idx" ON "UserGroupMembership"("groupId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserGroupMembership_userId_groupId_key" ON "UserGroupMembership"("userId", "groupId");

-- CreateIndex
CREATE INDEX "MatchAssistantSession_userId_createdAt_idx" ON "MatchAssistantSession"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiAccountTemplate_scenario_key" ON "AiAccountTemplate"("scenario");
