import { prisma, withDbRetry } from "@/lib/db";
import {
  followUpTypeToNurtureEvent,
  isInboundLeadFollowUpType,
} from "@/lib/leads/follow-up-types";
import { triggerLeadNurtureEvent } from "@/lib/leads/nurture/run";

const DUE_FOLLOW_UP_BATCH = 40;

/** Reasons that will never succeed on retry — mark notified to avoid loops. */
const PERMANENT_SKIP_REASONS = new Set([
  "invalid_lead",
  "status_stopped",
  "already_sent_for_assignee",
  "welcome_already_delivered",
  "sibling_lead",
]);

/**
 * Send WhatsApp nurture for open follow-ups that are due and not yet notified.
 * Called from leads background maintenance.
 */
export async function runDueFollowUpNurture(organizationId: string) {
  const now = new Date();
  const due = await withDbRetry((db) =>
    db.inboundLeadFollowUp.findMany({
      where: {
        organizationId,
        completedAt: null,
        waNotifiedAt: null,
        scheduledAt: { lte: now },
      },
      orderBy: { scheduledAt: "asc" },
      take: DUE_FOLLOW_UP_BATCH,
      select: {
        id: true,
        leadId: true,
        type: true,
      },
    }),
  );

  let sent = 0;
  let marked = 0;

  for (const row of due) {
    const type = isInboundLeadFollowUpType(row.type) ? row.type : "LEAD";
    const event = followUpTypeToNurtureEvent(type);
    // Payment stage is a nurture stop status; alert_payment_pending still needs force.
    const force = type === "PAYMENT";

    const result = await triggerLeadNurtureEvent({
      organizationId,
      leadId: row.leadId,
      event,
      force,
    });

    const shouldMark =
      result.sent ||
      (result.reason != null && PERMANENT_SKIP_REASONS.has(result.reason));

    if (!shouldMark) {
      continue;
    }

    await withDbRetry((db) =>
      db.inboundLeadFollowUp.updateMany({
        where: {
          id: row.id,
          organizationId,
          waNotifiedAt: null,
        },
        data: { waNotifiedAt: new Date() },
      }),
    );
    marked += 1;
    if (result.sent) {
      sent += 1;
    }
  }

  return { scanned: due.length, sent, marked };
}
