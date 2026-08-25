import { formatBillingDate } from "@/lib/billing/dates";
import { formatInrPaise } from "@/lib/billing/money";
import { sendPlainEmail } from "@/lib/integrations/email";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";

export async function sendSubscriptionInvoiceEmail(input: {
  toEmail: string;
  organizationName: string;
  invoiceNumber: string;
  invoiceId: string;
  totalPaise: number;
  dueAt: Date;
  kind: "invoice" | "reminder" | "due_today" | "overdue";
  daysLeft?: number;
}) {
  const amount = formatInrPaise(input.totalPaise);
  const due = formatBillingDate(input.dueAt);
  const billingUrl = `${getLoginBaseUrl()}/app/billing`;
  const printUrl = `${getLoginBaseUrl()}/app/billing/invoices/${input.invoiceId}`;

  const subject =
    input.kind === "overdue"
      ? `Overdue — ${input.invoiceNumber} ${amount} · ${input.organizationName}`
      : input.kind === "due_today"
        ? `Due today — ${input.invoiceNumber} ${amount} · ${input.organizationName}`
        : input.kind === "reminder"
          ? `Payment reminder — ${input.invoiceNumber} due ${due}`
          : `Invoice ${input.invoiceNumber} · ${input.organizationName}`;

  const lead =
    input.kind === "overdue"
      ? `Invoice ${input.invoiceNumber} is overdue. The workspace is on hold until this is paid.`
      : input.kind === "due_today"
        ? `Invoice ${input.invoiceNumber} is due today. After today the workspace will pause.`
        : input.kind === "reminder"
          ? `Friendly reminder — invoice ${input.invoiceNumber} is due in ${input.daysLeft ?? 0} day(s).`
          : `Your Sheetomatic invoice ${input.invoiceNumber} is ready.`;

  const text = [
    `Hi,`,
    ``,
    lead,
    ``,
    `Workspace: ${input.organizationName}`,
    `Amount: ${amount} (incl. GST)`,
    `Due: ${due}`,
    ``,
    `View and download: ${billingUrl}`,
    `Invoice: ${printUrl}`,
    ``,
    `Pay by UPI (sheetomatic@sbi) or bank transfer. Reply with the UTR so we can confirm.`,
    `If payment is not received by the due date, the workspace stops the next day.`,
  ].join("\n");

  return sendPlainEmail({
    toEmail: input.toEmail,
    subject,
    text,
    html: `<p>${lead}</p><p><strong>${input.organizationName}</strong><br/>Amount: ${amount} (incl. GST)<br/>Due: ${due}</p><p><a href="${billingUrl}">Open billing</a> · <a href="${printUrl}">Download invoice</a></p><p>Pay by UPI <code>sheetomatic@sbi</code> or bank transfer. If payment is not received by the due date, the workspace stops the next day.</p>`,
  });
}
