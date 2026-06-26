import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
import { sendPlainEmail } from "@/lib/integrations/email";

export async function sendChecklistReminderEmail(params: {
  toEmail: string;
  assigneeName: string;
  organizationName: string;
  title: string;
  team: string;
  plannedLabel: string;
  status: string;
}) {
  const text = [
    `Hello ${params.assigneeName},`,
    ``,
    `Process Checklist follow-up from ${params.organizationName}:`,
    ``,
    params.title,
    `Team: ${params.team}`,
    `Due: ${params.plannedLabel}`,
    `Status: ${params.status}`,
    ``,
    `Open My PC tasks: ${getLoginBaseUrl()}/app/checklists/my-tasks`,
    ``,
    `- Sheetomatic PC`,
  ].join("\n");

  return sendPlainEmail({
    toEmail: params.toEmail,
    subject: `PC pending: ${params.title}`,
    text,
  });
}

export async function sendTaskDueDigestEmail(params: {
  toEmail: string;
  assigneeName: string;
  organizationName: string;
  lines: string[];
}) {
  const text = [
    `Hello ${params.assigneeName},`,
    ``,
    `Your due task summary for ${params.organizationName} (EA / Task Delegation):`,
    ``,
    ...params.lines,
    ``,
    `Open task board: ${getLoginBaseUrl()}/app/tasks/my-work`,
    ``,
    `- Sheetomatic Tasks`,
  ].join("\n");

  return sendPlainEmail({
    toEmail: params.toEmail,
    subject: `Due tasks summary (${params.lines.length})`,
    text,
  });
}
