export function delegationMenuText(
  userName: string,
  items: Array<{ title: string; type?: string }> = [],
) {
  const lines = [
    `Hi ${userName}! Sheetomatic Task Delegation`,
    "",
    "Tap *Open menu* if you see a list button above.",
    "",
    "Or reply:",
    "1 - Delegate a task",
    "2 - Team members",
    "3 - Help",
    "4 - Browse topics and videos",
  ];

  if (items.length > 0) {
    lines.push("", "Training topics in your menu:");
    items.slice(0, 5).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
    });
  }

  lines.push("", "Send a voice note or text to assign work.");
  return lines.join("\n");
}

export function delegateTaskPromptText() {
  return [
    "*Delegate a task*",
    "",
    "Send a voice note or type your instruction in one message.",
    "",
    "Example:",
    "_Satyam, please finish the website front-end phase 1 by today._",
  ].join("\n");
}

export function helpText() {
  return [
    "*How it works*",
    "",
    "1. Choose *Delegate a task* from the menu",
    "2. Send a voice note (Hindi/English) or typed message",
    "3. AI picks assignee, due date, and priority",
    "4. Assignee gets a WhatsApp notification",
    "",
    "Need video links or FAQs? Tap *Browse topics* or *Channel videos* in the menu.",
    "",
    "Reply *menu* anytime for the action list.",
  ].join("\n");
}

export function teamListText(
  members: { name: string; phoneFormatted: string | null }[],
) {
  if (members.length === 0) {
    return "No team members found. Add users in the workspace first.";
  }

  const lines = members.map(
    (m, i) => `${i + 1}. ${m.name}${m.phoneFormatted ? ` (${m.phoneFormatted})` : ""}`,
  );

  return ["*Team members*", ...lines, "", "Mention a name in your task message."].join(
    "\n",
  );
}

export function taskCreatedReply(params: {
  title: string;
  assigneeName: string;
  dueLabel: string;
  taskId: string;
  whatsappSent: boolean;
}) {
  const notifyLine = params.whatsappSent
    ? `${params.assigneeName} was notified on WhatsApp.`
    : `${params.assigneeName} was assigned. Add their WhatsApp number in Channels if notification failed.`;

  return [
    "*Task created*",
    "",
    params.title,
    `Assignee: ${params.assigneeName}`,
    `Due: ${params.dueLabel}`,
    `ID: ${params.taskId.slice(0, 8)}`,
    "",
    notifyLine,
    "",
    "Send another voice note or text to delegate more tasks.",
  ].join("\n");
}
