import { sendPlainEmail } from "@/lib/integrations/email";

export async function notifyTaskAssigner(params: {
  assignerEmail: string;
  assignerName: string | null;
  assigneeName: string;
  taskTitle: string;
  organizationName: string;
  subject: string;
  bodyLines: string[];
}) {
  const greeting = params.assignerName?.trim() || "there";
  const text = [
    `Hi ${greeting},`,
    "",
    ...params.bodyLines,
    "",
    `Task: ${params.taskTitle}`,
    `From: ${params.assigneeName}`,
    `Workspace: ${params.organizationName}`,
    "",
    "Open Tasks in Sheetomatic to review and respond.",
    "https://sheetomatic.com/app/tasks",
  ].join("\n");

  return sendPlainEmail({
    toEmail: params.assignerEmail,
    subject: params.subject,
    text,
  });
}
