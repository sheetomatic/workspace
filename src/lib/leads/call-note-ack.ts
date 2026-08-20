import type { LeadCallingStatus } from "@prisma/client";

export function buildCallNoteAckWhatsApp(params: {
  clientName: string | null;
  organizationName: string;
  callingStatus: LeadCallingStatus;
  notes: string | null;
}) {
  const firstName =
    params.clientName?.trim().split(/\s+/)[0] || "there";
  const org = params.organizationName.trim() || "Sheetomatic";
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

  if (params.callingStatus === "MEETING_DONE") {
    return [
      `Hi ${firstName},`,
      "",
      "Thank you for the meeting today.",
      notes ? `\n*As discussed:*\n${notes}` : null,
      "",
      "We will work on these points and share the next update with you shortly.",
      "If anything was missed, reply here and we will update it.",
      "",
      `— ${org}`,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  // CONNECTED / others
  return [
    `Hi ${firstName},`,
    "",
    "Thanks for the call today.",
    notes ? `\nNotes:\n${notes}` : null,
    "",
    "Please reply to acknowledge.",
    "",
    `— ${org}`,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
