-- CreateTable
CREATE TABLE "ClinicalTrial" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "disease" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "phase" TEXT,
    "status" TEXT NOT NULL DEFAULT 'recruiting',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "inclusionBrief" TEXT,
    "exclusionBrief" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalTrial_slug_key" ON "ClinicalTrial"("slug");

-- CreateIndex
CREATE INDEX "ClinicalTrial_status_isPublic_idx" ON "ClinicalTrial"("status", "isPublic");

-- CreateIndex
CREATE INDEX "ClinicalTrial_disease_idx" ON "ClinicalTrial"("disease");
