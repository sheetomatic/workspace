import { prisma } from "@/lib/db";

export type FmsReminderClaimField =
  | "whatsappDueSoonSentAt"
  | "whatsappSameDaySentAt"
  | "whatsappOverdueSentAt";

export const FMS_REMINDER_CLAIM_FIELD: Record<
  "due_coming" | "same_day" | "overdue",
  FmsReminderClaimField
> = {
  due_coming: "whatsappDueSoonSentAt",
  same_day: "whatsappSameDaySentAt",
  overdue: "whatsappOverdueSentAt",
};

/** Mark a reminder as in-flight so overlapping cron ticks cannot double-send. */
export async function claimFmsReminder(
  stepStateId: string,
  field: FmsReminderClaimField,
  claimedAt = new Date(),
) {
  const result = await prisma.fmsStepState.updateMany({
    where: {
      id: stepStateId,
      status: "IN_PROGRESS",
      [field]: null,
    },
    data: { [field]: claimedAt },
  });
  return result.count === 1;
}

/** Release the claim when no channel actually sent, so the next tick can retry. */
export async function releaseFmsReminder(
  stepStateId: string,
  field: FmsReminderClaimField,
) {
  await prisma.fmsStepState.updateMany({
    where: {
      id: stepStateId,
      [field]: { not: null },
    },
    data: { [field]: null },
  });
}
