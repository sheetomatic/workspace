import { formatBillingDate, SUBSCRIPTION_GRACE_DAYS } from "@/lib/billing/dates";
import { formatInrPaise } from "@/lib/billing/money";
import { sendPlainEmail } from "@/lib/integrations/email";
import { getLoginBaseUrl } from "@/lib/integrations/email-base-url";
import { SHEETOMATIC_QUOTATION_ACCOUNT } from "@/lib/leads/seller-account";

export type SubscriptionInvoiceEmailKind =
  | "invoice"
  | "reminder"
  | "due_today"
  | "payment_pending"
  | "overdue";

function graceCopyFooter() {
  return `If payment is not received by the due date, you get ${SUBSCRIPTION_GRACE_DAYS} day of grace. After that the workspace stops until payment is confirmed.`;
}

export function subscriptionPaymentPendingText(input: {
  organizationName: string;
  invoiceNumber: string;
  totalPaise: number;
  dueAt: Date;
  daysLeft: number;
}) {
  const amount = formatInrPaise(input.totalPaise);
  const due = formatBillingDate(input.dueAt);
  const stage =
    input.daysLeft <= -2
      ? `Workspace access has been *stopped* until this invoice is paid.`
      : input.daysLeft === -1
        ? `This is your *grace day*. Pay today or the workspace stops tomorrow.`
        : `Invoice is *due today*. You get ${SUBSCRIPTION_GRACE_DAYS} day of grace after this; then the workspace stops.`;

  return [
    `*Payment Pending*`,
    ``,
    `Hi,`,
    ``,
    `Invoice *${input.invoiceNumber}* for *${input.organizationName}* is unpaid.`,
    stage,
    ``,
    `Amount: *${amount}* (incl. GST)`,
    `Due: ${due}`,
    ``,
    `Pay UPI: ${SHEETOMATIC_QUOTATION_ACCOUNT.upiId}`,
    `Reply with the UTR after payment so we can confirm.`,
    ``,
    `— Team Sheetomatic`,
  ].join("\n");
}

export async function sendSubscriptionInvoiceEmail(input: {
  toEmail: string;
  organizationName: string;
  invoiceNumber: string;
  invoiceId: string;
  totalPaise: number;
  dueAt: Date;
  kind: SubscriptionInvoiceEmailKind;
  daysLeft?: number;
}) {
  const amount = formatInrPaise(input.totalPaise);
  const due = formatBillingDate(input.dueAt);
  const billingUrl = `${getLoginBaseUrl()}/app/billing`;
  const printUrl = `${getLoginBaseUrl()}/app/billing/invoices/${input.invoiceId}`;
  const daysLeft = input.daysLeft ?? 0;

  const subject =
    input.kind === "payment_pending" || input.kind === "overdue"
      ? `Payment Pending — ${input.invoiceNumber} ${amount} · ${input.organizationName}`
      : input.kind === "due_today"
        ? `Due today — ${input.invoiceNumber} ${amount} · ${input.organizationName}`
        : input.kind === "reminder"
          ? `Payment reminder — ${input.invoiceNumber} due ${due}`
          : `Invoice ${input.invoiceNumber} · ${input.organizationName}`;

  const lead =
    input.kind === "payment_pending" || input.kind === "overdue"
      ? daysLeft <= -2
        ? `Payment Pending — invoice ${input.invoiceNumber} is unpaid and the workspace is on hold until this is paid.`
        : daysLeft === -1
          ? `Payment Pending — invoice ${input.invoiceNumber} is past due. Today is your grace day; pay now or the workspace stops tomorrow.`
          : `Payment Pending — invoice ${input.invoiceNumber} is due today. After ${SUBSCRIPTION_GRACE_DAYS} day of grace the workspace will stop.`
      : input.kind === "due_today"
        ? `Invoice ${input.invoiceNumber} is due today. After ${SUBSCRIPTION_GRACE_DAYS} day of grace the workspace will pause.`
        : input.kind === "reminder"
          ? `Friendly reminder — invoice ${input.invoiceNumber} is due in ${daysLeft} day(s).`
          : `Your Sheetomatic invoice ${input.invoiceNumber} is ready.`;

  const footer = graceCopyFooter();
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
    `Pay by UPI (${SHEETOMATIC_QUOTATION_ACCOUNT.upiId}) or bank transfer. Reply with the UTR so we can confirm.`,
    footer,
  ].join("\n");

  return sendPlainEmail({
    toEmail: input.toEmail,
    subject,
    text,
    html: `<p>${lead}</p><p><strong>${input.organizationName}</strong><br/>Amount: ${amount} (incl. GST)<br/>Due: ${due}</p><p><a href="${billingUrl}">Open billing</a> · <a href="${printUrl}">Download invoice</a></p><p>Pay by UPI <code>${SHEETOMATIC_QUOTATION_ACCOUNT.upiId}</code> or bank transfer. ${footer}</p>`,
  });
}
