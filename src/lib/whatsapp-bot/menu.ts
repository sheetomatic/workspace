import type { Role } from "@prisma/client";
import { hasMinimumRole } from "@/lib/permissions";

export function delegationMenuText(
  userName: string,
  items: Array<{ title: string; type?: string }> = [],
  role: Role = "STAFF",
) {
  const firstName = userName.split(/\s+/)[0] || userName;
  const isManager = hasMinimumRole(role, "MANAGER");
  const lines = [
    `Hi ${firstName}! *Sheetomatic Tasks* on WhatsApp`,
    "",
    "Tap *Open menu* if you see a list button above.",
    "",
    "Or reply with a number:",
  ];

  if (isManager) {
    lines.push("1 - Assign a task");
    lines.push("2 - Team tasks");
    lines.push("3 - Team performance");
    lines.push("4 - Team members");
    lines.push("5 - How it works");
    lines.push("6 - Browse topics");
  } else {
    lines.push("1 - My tasks");
    lines.push("2 - My performance");
    lines.push("3 - How it works");
    lines.push("4 - Browse topics");
  }

  if (items.length > 0) {
    lines.push("", "Training topics in your menu:");
    items.slice(0, 5).forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
    });
  }

  lines.push(
    "",
    isManager
      ? "Send a voice note or text to assign work."
      : "Use start/done/help with a task ID to update tasks.",
  );
  return lines.join("\n");
}

/** Plain-text fallback when interactive menu delivery fails. */
export function delegationMenuFallbackText(
  userName: string,
  role: Role = "STAFF",
) {
  const firstName = userName.split(/\s+/)[0] || userName;
  const isManager = hasMinimumRole(role, "MANAGER");

  const lines = [
    `Hi ${firstName}! *Sheetomatic Tasks* on WhatsApp`,
    "",
  ];

  if (isManager) {
    lines.push(
      "1 - Assign a task",
      "2 - Team tasks",
      "3 - Team performance",
      "4 - Team members",
      "5 - How it works",
      "6 - Browse topics",
      "",
      "Reply *menu* anytime. Send a voice note or text to assign work.",
    );
  } else {
    lines.push(
      "1 - My tasks",
      "2 - My performance",
      "3 - How it works",
      "4 - Browse topics",
      "",
      "Reply *menu* anytime. Update tasks with start/done/help <id>.",
    );
  }

  return lines.join("\n");
}

/** Compact fallback for my-tasks interactive messages (list or action buttons). */
export function myTasksCompactFallbackText(
  role: Role,
  tasks: Array<{ id: string; title: string }>,
) {
  const isManager = hasMinimumRole(role, "MANAGER");

  if (tasks.length === 0) {
    return isManager
      ? "No active team tasks. Reply *menu* for options."
      : "You have no active tasks. Reply *menu* for options.";
  }

  if (tasks.length === 1) {
    const task = tasks[0];
    const shortId = task.id.slice(0, 8);
    return `*${task.title}* — Reply: start ${shortId} | done ${shortId} | help ${shortId}`;
  }

  const heading = isManager ? "*Team tasks*" : "*Your tasks*";
  const lines = tasks.slice(0, 10).map((task, index) => {
    const shortId = task.id.slice(0, 8);
    return `${index + 1}. ${task.title} (${shortId})`;
  });

  return [
    heading,
    ...lines,
    "",
    "Tap *View tasks* above, or reply start/done/help <id>.",
  ].join("\n");
}

export function delegateTaskPromptText() {
  return [
    "*Assign a task*",
    "",
    "Send a voice note or type your instruction in one message.",
    "",
    "Example:",
    "_Satyam, please finish the website front-end phase 1 by today._",
  ].join("\n");
}

export function helpText(role: Role = "STAFF") {
  const isManager = hasMinimumRole(role, "MANAGER");

  const lines = [
    "*How it works*",
    "",
    "*My tasks* — see active work and update status",
    "• start <id> — mark in progress",
    "• done <id> — mark complete",
    "• help <id> — notify your manager",
    "",
    "*Performance* — pending, overdue, and completed today",
  ];

  if (isManager) {
    lines.push(
      "",
      "*Assign a task*",
      "1. Choose *Assign a task* from the menu",
      "2. Send a voice note (Hindi/English) or typed message",
      "3. AI picks assignee, due date, and priority",
      "4. Assignee gets WhatsApp with Start / Done / Help buttons",
    );
  }

  lines.push(
    "",
    "Need video links or FAQs? Tap *Browse topics* in the menu.",
    "",
    "Reply *menu* anytime for the action list.",
  );

  return lines.join("\n");
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
    ? `${params.assigneeName} was notified on WhatsApp with action buttons.`
    : `${params.assigneeName} was assigned. Add their WhatsApp number in Team if notification failed.`;

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
    "Send another voice note or text to assign more tasks.",
  ].join("\n");
}
