-- CreateTable
CREATE TABLE "SensitiveWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyword" TEXT NOT NULL,
    "riskType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "SensitiveWord_keyword_key" ON "SensitiveWord"("keyword");

-- CreateIndex
CREATE INDEX "SensitiveWord_isEnabled_riskLevel_idx" ON "SensitiveWord"("isEnabled", "riskLevel");
