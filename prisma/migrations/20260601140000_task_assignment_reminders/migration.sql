-- Separate assignment notifications from due-date reminder cron
ALTER TABLE "DelegatedTask" ADD COLUMN "emailAssignmentSentAt" TIMESTAMP(3);
ALTER TABLE "DelegatedTask" ADD COLUMN "whatsappAssignmentSentAt" TIMESTAMP(3);

-- Existing rows used reminder fields for assignment; free due-date cron when due is still ahead
UPDATE "DelegatedTask"
SET "emailAssignmentSentAt" = "emailReminderSentAt",
    "emailReminderSentAt" = NULL
WHERE "emailReminderSentAt" IS NOT NULL
  AND "dueAt" > "emailReminderSentAt";

UPDATE "DelegatedTask"
SET "whatsappAssignmentSentAt" = "whatsappReminderSentAt",
    "whatsappReminderSentAt" = NULL
WHERE "whatsappReminderSentAt" IS NOT NULL
  AND "dueAt" > "whatsappReminderSentAt";
