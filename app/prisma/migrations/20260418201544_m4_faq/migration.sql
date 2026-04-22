-- CreateTable
CREATE TABLE "FaqArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" TEXT,
    "order" INTEGER NOT NULL DEFAULT 100,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FaqArticle_slug_key" ON "FaqArticle"("slug");

-- CreateIndex
CREATE INDEX "FaqArticle_isPublished_category_order_idx" ON "FaqArticle"("isPublished", "category", "order");
