-- Persist last WhatsApp assignment delivery error for task UI diagnostics
ALTER TABLE "DelegatedTask" ADD COLUMN "whatsappAssignmentError" TEXT;
