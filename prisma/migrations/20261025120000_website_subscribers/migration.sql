CREATE TABLE "WebsiteSubscriber" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "consentVersion" TEXT NOT NULL,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  "unsubscribedAt" TIMESTAMP(3),
  "confirmationHash" TEXT,
  "confirmationExpiresAt" TIMESTAMP(3),
  "unsubscribeToken" TEXT NOT NULL,
  "lastConfirmationAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebsiteSubscriber_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WebsiteSubscriber_status_check" CHECK ("status" IN ('PENDING', 'ACTIVE', 'UNSUBSCRIBED'))
);
CREATE UNIQUE INDEX "WebsiteSubscriber_email_key" ON "WebsiteSubscriber"("email");
CREATE UNIQUE INDEX "WebsiteSubscriber_confirmationHash_key" ON "WebsiteSubscriber"("confirmationHash");
CREATE UNIQUE INDEX "WebsiteSubscriber_unsubscribeToken_key" ON "WebsiteSubscriber"("unsubscribeToken");
CREATE INDEX "WebsiteSubscriber_status_requestedAt_idx" ON "WebsiteSubscriber"("status", "requestedAt");
