-- Per-workspace WhatsApp provider selection (Sheetomatic vs Message Auto Sender)
CREATE TYPE "WhatsAppProvider" AS ENUM ('SHEETOMATIC', 'MESSAGEAUTOSENDER');

ALTER TABLE "WorkspaceWhatsAppSettings"
  ADD COLUMN "whatsappProvider" "WhatsAppProvider" NOT NULL DEFAULT 'SHEETOMATIC',
  ADD COLUMN "masUsername" TEXT,
  ADD COLUMN "masPassword" TEXT;
