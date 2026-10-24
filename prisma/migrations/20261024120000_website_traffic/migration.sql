CREATE TABLE "WebsitePageView" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "visitorHash" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "WebsitePageView_createdAt_idx" ON "WebsitePageView"("createdAt");
CREATE INDEX "WebsitePageView_visitorHash_createdAt_idx" ON "WebsitePageView"("visitorHash", "createdAt");
