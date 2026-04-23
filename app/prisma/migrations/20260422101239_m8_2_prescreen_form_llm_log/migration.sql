-- CreateTable
CREATE TABLE "TrialPrescreenForm" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trialId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT,
    "description" TEXT,
    "successMessage" TEXT,
    "generatedBy" TEXT,
    "generatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrialPrescreenForm_trialId_fkey" FOREIGN KEY ("trialId") REFERENCES "ClinicalTrial" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrialPrescreenFormItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "formId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "helpText" TEXT,
    "fieldType" TEXT NOT NULL,
    "options" TEXT,
    "placeholder" TEXT,
    "defaultValue" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minValue" REAL,
    "maxValue" REAL,
    "regex" TEXT,
    "errorMessage" TEXT,
    "showWhen" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TrialPrescreenFormItem_formId_fkey" FOREIGN KEY ("formId") REFERENCES "TrialPrescreenForm" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LlmCallLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "operatorId" TEXT,
    "scenario" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptHash" TEXT NOT NULL,
    "promptChars" INTEGER NOT NULL,
    "responseChars" INTEGER,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "estimatedCostCny" REAL,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "TrialPrescreenForm_trialId_key" ON "TrialPrescreenForm"("trialId");

-- CreateIndex
CREATE INDEX "TrialPrescreenForm_isPublished_idx" ON "TrialPrescreenForm"("isPublished");

-- CreateIndex
CREATE INDEX "TrialPrescreenFormItem_formId_sortOrder_idx" ON "TrialPrescreenFormItem"("formId", "sortOrder");

-- CreateIndex
CREATE INDEX "LlmCallLog_scenario_createdAt_idx" ON "LlmCallLog"("scenario", "createdAt");

-- CreateIndex
CREATE INDEX "LlmCallLog_provider_status_createdAt_idx" ON "LlmCallLog"("provider", "status", "createdAt");
