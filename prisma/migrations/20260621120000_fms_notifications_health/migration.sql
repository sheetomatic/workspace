-- CreateTable
CREATE TABLE "UserAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CronHeartbeat" (
    "jobKey" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,
    "lastOk" BOOLEAN NOT NULL DEFAULT true,
    "summary" TEXT,

    CONSTRAINT "CronHeartbeat_pkey" PRIMARY KEY ("jobKey")
);

-- CreateIndex
CREATE INDEX "UserAppNotification_userId_readAt_idx" ON "UserAppNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "UserAppNotification_organizationId_createdAt_idx" ON "UserAppNotification"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserAppNotification" ADD CONSTRAINT "UserAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAppNotification" ADD CONSTRAINT "UserAppNotification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
