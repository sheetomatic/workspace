-- FMS WhatsApp alert config on templates and sent flags on step states
ALTER TABLE "FmsTemplate" ADD COLUMN "alertConfig" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "FmsStepState" ADD COLUMN "whatsappAssignSentAt" TIMESTAMP(3);
ALTER TABLE "FmsStepState" ADD COLUMN "whatsappDueSoonSentAt" TIMESTAMP(3);
ALTER TABLE "FmsStepState" ADD COLUMN "whatsappSameDaySentAt" TIMESTAMP(3);
ALTER TABLE "FmsStepState" ADD COLUMN "whatsappOverdueSentAt" TIMESTAMP(3);
