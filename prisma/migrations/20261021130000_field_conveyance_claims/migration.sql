CREATE TYPE "FieldConveyanceStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PAID');
CREATE TYPE "FieldConveyanceAttachmentKind" AS ENUM ('JOURNEY_PROOF', 'BILL');
CREATE TYPE "FieldConveyanceAuditAction" AS ENUM ('SUBMITTED', 'RESUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

CREATE TABLE "FieldConveyanceClaim" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claimantUserId" TEXT NOT NULL,
    "visitId" TEXT,
    "claimDate" DATE NOT NULL,
    "claimedDistanceKm" DECIMAL(8,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "journeyDetails" TEXT NOT NULL,
    "status" "FieldConveyanceStatus" NOT NULL DEFAULT 'PENDING',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "paidByUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FieldConveyanceClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldConveyanceAttachment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "kind" "FieldConveyanceAttachmentKind" NOT NULL,
    "submissionRound" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldConveyanceAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FieldConveyanceAuditEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" "FieldConveyanceAuditAction" NOT NULL,
    "fromStatus" "FieldConveyanceStatus",
    "toStatus" "FieldConveyanceStatus" NOT NULL,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldConveyanceAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FieldConveyanceClaim_organizationId_paymentReference_key"
  ON "FieldConveyanceClaim"("organizationId", "paymentReference");
CREATE INDEX "FieldConveyanceClaim_organizationId_claimantUserId_claimDate_idx"
  ON "FieldConveyanceClaim"("organizationId", "claimantUserId", "claimDate");
CREATE INDEX "FieldConveyanceClaim_organizationId_status_submittedAt_idx"
  ON "FieldConveyanceClaim"("organizationId", "status", "submittedAt");
CREATE INDEX "FieldConveyanceAttachment_organizationId_claimId_kind_idx"
  ON "FieldConveyanceAttachment"("organizationId", "claimId", "submissionRound", "kind");
CREATE INDEX "FieldConveyanceAuditEvent_organizationId_claimId_createdAt_idx"
  ON "FieldConveyanceAuditEvent"("organizationId", "claimId", "createdAt");

ALTER TABLE "FieldConveyanceClaim"
  ADD CONSTRAINT "FieldConveyanceClaim_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceClaim_claimantUserId_fkey"
  FOREIGN KEY ("claimantUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceClaim_visitId_fkey"
  FOREIGN KEY ("visitId") REFERENCES "FieldVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceClaim_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceClaim_paidByUserId_fkey"
  FOREIGN KEY ("paidByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FieldConveyanceAttachment"
  ADD CONSTRAINT "FieldConveyanceAttachment_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceAttachment_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "FieldConveyanceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceAttachment_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FieldConveyanceAuditEvent"
  ADD CONSTRAINT "FieldConveyanceAuditEvent_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceAuditEvent_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "FieldConveyanceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldConveyanceAuditEvent_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
