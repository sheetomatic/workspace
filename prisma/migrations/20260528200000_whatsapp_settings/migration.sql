-- CreateTable
CREATE TABLE "WorkspaceWhatsAppSettings" (
    "organizationId" TEXT NOT NULL,
    "businessPhone" TEXT,
    "redlavaApiKey" TEXT,
    "redlavaPhoneId" TEXT,
    "metaAccessToken" TEXT,
    "metaWabaId" TEXT,
    "metaBusinessId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceWhatsAppSettings_pkey" PRIMARY KEY ("organizationId")
);

-- AddForeignKey
ALTER TABLE "WorkspaceWhatsAppSettings" ADD CONSTRAINT "WorkspaceWhatsAppSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
