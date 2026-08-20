import type { LeadCallingStatus } from "@prisma/client";
import { CALLING_STATUS_LABELS } from "@/lib/leads/status-labels";

export function buildCallNoteAckWhatsApp(params: {
  clientName: string | null;
  organizationName: string;
  callingStatus: LeadCallingStatus;
  notes: string | null;
}) {
  const firstName =
    params.clientName?.trim().split(/\s+/)[0] || "there";
  const org = params.organizationName.trim() || "Sheetomatic";
  const statusLabel = CALLING_STATUS_LABELS[params.callingStatus];
  const notes = params.notes?.trim() || null;

  if (params.callingStatus === "NO_ANSWER") {
    return [
      `Hi ${firstName},`,
      "",
      "We tried calling you today but couldn't connect.",
      "Please call us back when convenient — or reply here.",
      notes ? `\nNote: ${notes}` : null,
      "",
      `— ${org}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  if (params.callingStatus === "WILL_CALL_BACK") {
    return [
      `Hi ${firstName},`,
      "",
      "Thanks — noted that you will call us back.",
      notes ? `\nNotes:\n${notes}` : null,
      "",
      "Please reply to acknowledge.",
      "",
      `— ${org}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  if (params.callingStatus === "NOT_INTERESTED") {
    return [
      `Hi ${firstName},`,
      "",
      "Thanks for your time on the call.",
      notes ? `\nNotes:\n${notes}` : null,
      "",
      "Please reply if anything changes.",
      "",
      `— ${org}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  // CONNECTED / MEETING_DONE / others
  return [
    `Hi ${firstName},`,
    "",
    `Thanks for the call (${statusLabel.toLowerCase()}).`,
    notes ? `\nNotes:\n${notes}` : null,
    "",
    "Please reply to acknowledge.",
    "",
    `— ${org}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
