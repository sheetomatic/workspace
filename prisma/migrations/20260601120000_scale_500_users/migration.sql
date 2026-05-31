-- Composite index for paginated task lists
CREATE INDEX "DelegatedTask_organizationId_status_dueAt_idx" ON "DelegatedTask"("organizationId", "status", "dueAt");

-- Distributed rate limiting (serverless-safe)
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "RateLimitBucket_resetAt_idx" ON "RateLimitBucket"("resetAt");
