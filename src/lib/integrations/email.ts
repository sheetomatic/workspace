import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";

export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "api_error"; detail?: string };

export function isEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.TASK_EMAIL_FROM?.trim(),
  );
}

export async function sendPlainEmail(params: {
  toEmail: string;
  subject: string;
  text: string;
}): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TASK_EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.toEmail],
      subject: params.subject,
      text: params.text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      sent: false,
      reason: "api_error",
      detail: detail.slice(0, 300),
    };
  }

  return { sent: true };
}

export async function sendFmsStepReminderEmail(params: {
  toEmail: string;
  kind: "assign" | "due_coming" | "same_day" | "overdue";
  assigneeName: string;
  referenceLabel: string;
  stepName: string;
  plannedLabel: string;
  organizationName: string;
  instanceUrl: string;
  dueComingDaysBefore?: number;
}): Promise<EmailSendResult> {
  const subjectByKind = {
    assign: `FMS step assigned: ${params.stepName}`,
    due_coming: `FMS step due soon: ${params.stepName}`,
    same_day: `FMS step due today: ${params.stepName}`,
    overdue: `FMS step overdue: ${params.stepName}`,
  } as const;

  const introByKind = {
    assign: "A workflow step has been assigned to you.",
    due_coming: `This step is due in ${params.dueComingDaysBefore ?? 1} day(s).`,
    same_day: "This step is due today.",
    overdue: "This step is past its planned date.",
  } as const;

  const text = [
    `Hello ${params.assigneeName},`,
    ``,
    introByKind[params.kind],
    ``,
    `Job: ${params.referenceLabel}`,
    `Step: ${params.stepName}`,
    `Planned: ${params.plannedLabel}`,
    `Team: ${params.organizationName}`,
    ``,
    `Open in Sheetomatic:`,
    params.instanceUrl,
    ``,
    `- Sheetomatic FMS`,
  ].join("\n");

  return sendPlainEmail({
    toEmail: params.toEmail,
    subject: subjectByKind[params.kind],
    text,
  });
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
  const subject = `[${params.organizationName}] New task: ${params.taskTitle}`;
  const text = buildTaskEmailBody(params);
  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

export async function sendTaskDueReminderEmail(params: {
  toEmail: string;
  assigneeName: string;
  taskTitle: string;
  organizationName: string;
  priority: string;
  dueLabel: string;
}) {
  const subject = `[${params.organizationName}] Reminder — due: ${params.taskTitle}`;
  const text = [
    `Hello ${params.assigneeName},`,
    ``,
    `This is a reminder that your task in ${params.organizationName} is due:`,
    ``,
    params.taskTitle,
    ``,
    `Priority: ${params.priority}`,
    `Due: ${params.dueLabel}`,
    ``,
    `Open Sheetomatic to update status or request help.`,
    ``,
    `_Sheetomatic Task Reminder_`,
  ].join("\n");
  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

export async function sendTeamWelcomeEmail(params: {
  toEmail: string;
  memberName: string;
  organizationName: string;
  roleLabel: string;
  tempPassword: string;
  invitedByName: string;
}) {
  const loginUrl = `${getLoginBaseUrl()}/login`;
  const subject = `Your Sheetomatic login for ${params.organizationName}`;
  const text = [
    `Hello ${params.memberName},`,
    ``,
    `${params.invitedByName} added you to ${params.organizationName} on Sheetomatic.`,
    ``,
    `Sign in here: ${loginUrl}`,
    `Email: ${params.toEmail}`,
    `Temporary password: ${params.tempPassword}`,
    `Role: ${params.roleLabel}`,
    ``,
    `After signing in, open Tasks, MIS, and HR modules assigned to your role.`,
    ``,
    `If you did not expect this invite, reply to your admin or contact Sheetomatic support.`,
    ``,
    `— Sheetomatic Workspace`,
  ].join("\n");

  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

export async function sendTeamWorkspaceAccessEmail(params: {
  toEmail: string;
  memberName: string;
  organizationName: string;
  roleLabel: string;
  invitedByName: string;
}) {
  const loginUrl = `${getLoginBaseUrl()}/login`;
  const subject = `You now have access to ${params.organizationName} on Sheetomatic`;
  const text = [
    `Hello ${params.memberName},`,
    ``,
    `${params.invitedByName} added you to ${params.organizationName} on Sheetomatic.`,
    ``,
    `Sign in with your existing Sheetomatic password:`,
    `${loginUrl}`,
    ``,
    `Email: ${params.toEmail}`,
    `Role: ${params.roleLabel}`,
    ``,
    `— Sheetomatic Workspace`,
  ].join("\n");

  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

export async function sendTeamPasswordResetEmail(params: {
  toEmail: string;
  memberName: string;
  organizationName: string;
  tempPassword: string;
}) {
  const loginUrl = `${getLoginBaseUrl()}/login`;
  const subject = `Your Sheetomatic password was reset`;
  const text = [
    `Hello ${params.memberName},`,
    ``,
    `An admin reset your password for ${params.organizationName} on Sheetomatic.`,
    ``,
    `Sign in here: ${loginUrl}`,
    `Email: ${params.toEmail}`,
    `New temporary password: ${params.tempPassword}`,
    ``,
    `If you did not request this, contact your workspace admin immediately.`,
    ``,
    `— Sheetomatic Workspace`,
  ].join("\n");

  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

export async function sendPasswordResetLinkEmail(params: {
  toEmail: string;
  resetUrl: string;
}) {
  const subject = "Reset your Sheetomatic password";
  const text = [
    "Hello,",
    "",
    "We received a request to reset your Sheetomatic password.",
    "",
    "Open this link to choose a new password (valid for 1 hour):",
    params.resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "— Sheetomatic",
  ].join("\n");

  return sendPlainEmail({ toEmail: params.toEmail, subject, text });
}

function emailStatusMessage(
  email: string,
  result: EmailSendResult,
  fallback: string,
) {
  if (result.sent) {
    return `Login details emailed to ${email}.`;
  }
  if (result.reason === "not_configured") {
    return `${fallback} Email is not configured — share the details below once.`;
  }
  return `${fallback} Email could not be sent — share the details below once.`;
}

export { emailStatusMessage };
