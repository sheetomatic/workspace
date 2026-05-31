export function isEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.TASK_EMAIL_FROM?.trim(),
  );
}

function buildTaskEmailBody(params: {
  assigneeName: string;
  taskTitle: string;
  organizationName: string;
  priority: string;
  dueLabel: string;
  frequencyLabel: string;
  isRecurring: boolean;
}) {
  const recurringLine = params.isRecurring
    ? `Recurrence: ${params.frequencyLabel}\n`
    : `Frequency: ${params.frequencyLabel}\n`;

  return [
    `Hello ${params.assigneeName},`,
    ``,
    `You have a new task in ${params.organizationName}:`,
    ``,
    params.taskTitle,
    ``,
    `Priority: ${params.priority}`,
    `Due: ${params.dueLabel}`,
    recurringLine,
    `_Assigned via Sheetomatic Task Delegation_`,
  ].join("\n");
}

export async function sendTaskAssignmentEmail(params: {
  toEmail: string;
  assigneeName: string;
  taskTitle: string;
  organizationName: string;
  priority: string;
  dueLabel: string;
  frequencyLabel: string;
  isRecurring: boolean;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TASK_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" as const };
  }

  const subject = `[${params.organizationName}] New task: ${params.taskTitle}`;
  const text = buildTaskEmailBody(params);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.toEmail],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      reason: "api_error" as const,
      detail: detail.slice(0, 300),
    };
  }

  return { sent: true as const };
}
