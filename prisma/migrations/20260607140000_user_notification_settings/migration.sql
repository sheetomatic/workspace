-- CreateTable
CREATE TABLE "UserNotificationSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "caseDueDateAlert" BOOLEAN NOT NULL DEFAULT true,
    "caseOverdueAlert" BOOLEAN NOT NULL DEFAULT true,
    "taskDueDateAlert" BOOLEAN NOT NULL DEFAULT true,
    "taskOverdueAlert" BOOLEAN NOT NULL DEFAULT true,
    "alertDaysBefore" INTEGER NOT NULL DEFAULT 1,
    "alertViaEmail" BOOLEAN NOT NULL DEFAULT true,
    "alertViaWhatsApp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserNotificationSettings_organizationId_idx" ON "UserNotificationSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "UserNotificationSettings_userId_organizationId_key" ON "UserNotificationSettings"("userId", "organizationId");

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNotificationSettings" ADD CONSTRAINT "UserNotificationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
