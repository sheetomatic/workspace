import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import {
  daysUntilDue,
  isPastDueDate,
  isPastGracePeriod,
} from "@/lib/billing/dates";
import { runWhatsAppApiRechargeReminders } from "@/lib/billing/whatsapp-api-reminders";
import { generateSubscriptionInvoice } from "@/lib/billing/invoices";
import {
  sendSubscriptionInvoiceEmail,
  subscriptionPaymentPendingText,
} from "@/lib/billing/email";
import { syncOrganizationPlanRecord } from "@/lib/organization-plan";
import { expireDueDemoTrials } from "@/lib/demo-workspace";
import { deliverWhatsAppMessage } from "@/lib/integrations/whatsapp-provider";

async function sendSubscriptionPaymentPendingWhatsApp(input: {
  phone: string | null | undefined;
  organizationName: string;
  invoiceNumber: string;
  totalPaise: number;
  dueAt: Date;
  daysLeft: number;
}) {
  const phone = input.phone?.trim();
  if (!phone) return false;

  const primary = await prisma.organization.findFirst({
    where: { OR: [{ isPrimary: true }, { slug: PRIMARY_ORG_SLUG }] },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!primary) return false;

  const body = subscriptionPaymentPendingText({
    organizationName: input.organizationName,
    invoiceNumber: input.invoiceNumber,
    totalPaise: input.totalPaise,
    dueAt: input.dueAt,
    daysLeft: input.daysLeft,
  });

  const wa = await deliverWhatsAppMessage({
    organizationId: primary.id,
    toPhone: phone,
    preferOfficial: false,
    message: { type: "text", text: { body } },
  });
  if (wa.sent) return true;

  const official = await deliverWhatsAppMessage({
    organizationId: primary.id,
    toPhone: phone,
    preferOfficial: true,
    message: { type: "text", text: { body } },
  });
  return official.sent;
}

/** Email and WhatsApp for one invoice. Called only from the Billing follow-up button. */
export async function startPaymentFollowUp(invoiceId: string) {
  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          isPrimary: true,
          billing: { select: { billingEmail: true } },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            select: { user: { select: { email: true, phone: true } } },
          },
        },
      },
    },
  });

  if (!invoice || invoice.status === "VOID" || invoice.status === "PAID") {
    return { ok: false as const, message: "That invoice is not open for follow-up." };
  }
  if (invoice.organization.isPrimary || invoice.organization.slug === PRIMARY_ORG_SLUG) {
    return { ok: false as const, message: "The primary workspace is not a client follow-up." };
  }

  const now = new Date();
  const daysLeft = daysUntilDue(invoice.dueAt, now);
  const toEmail =
    invoice.organization.billing?.billingEmail ??
    invoice.organization.memberships[0]?.user.email ??
    null;
  const ownerPhone = invoice.organization.memberships[0]?.user.phone ?? null;
  const kind = daysLeft <= 0 ? "payment_pending" : "reminder";

  let emailed = false;
  let whatsapped = false;
  if (toEmail) {
    const sent = await sendSubscriptionInvoiceEmail({
      toEmail,
      organizationName: invoice.organization.name,
      invoiceNumber: invoice.number,
      kind,
      daysLeft,
      totalPaise: invoice.totalPaise,
      dueAt: invoice.dueAt,
      invoiceId: invoice.id,
    });
    emailed = sent.sent;
  }
  whatsapped = await sendSubscriptionPaymentPendingWhatsApp({
    phone: ownerPhone,
    organizationName: invoice.organization.name,
    invoiceNumber: invoice.number,
    totalPaise: invoice.totalPaise,
    dueAt: invoice.dueAt,
    daysLeft,
  });

  if (!emailed && !whatsapped) {
    return {
      ok: false as const,
      message: `No message went out for ${invoice.number}. Add a billing email or the owner's phone, then start follow-up again.`,
    };
  }

  await prisma.subscriptionInvoice.update({
    where: { id: invoice.id },
    data: {
      lastReminderAt: now,
      reminderCount: { increment: 1 },
      status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      sentAt: invoice.sentAt ?? now,
    },
  });

  const channels = [emailed ? `email ${toEmail}` : null, whatsapped ? "WhatsApp" : null]
    .filter(Boolean)
    .join(" and ");
  return {
    ok: true as const,
    message: `Follow-up started for ${invoice.organization.name} (${invoice.number}) by ${channels}.`,
  };
}

export async function runSubscriptionBillingCron(now = new Date()) {
  const remindersSent: string[] = [];
  const paymentPendingSent: string[] = [];
  const held: string[] = [];
  const generated: string[] = [];

  const demoExpiry = await expireDueDemoTrials(now);

  const openInvoices = await prisma.subscriptionInvoice.findMany({
    where: { status: { in: ["DRAFT", "SENT", "OVERDUE"] } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isPrimary: true,
          billing: { select: { billingEmail: true } },
          memberships: {
            where: { role: "OWNER" },
            take: 1,
            select: { user: { select: { email: true, phone: true } } },
          },
        },
      },
    },
  });

  for (const invoice of openInvoices) {
    if (invoice.organization.isPrimary || invoice.organization.slug === PRIMARY_ORG_SLUG) {
      continue;
    }

    const pastDue = isPastDueDate(invoice.dueAt, now);
    const pastGrace = isPastGracePeriod(invoice.dueAt, now);

    if (pastDue && invoice.status !== "VOID") {
      if (invoice.status !== "OVERDUE") {
        await prisma.subscriptionInvoice.update({
          where: { id: invoice.id },
          data: { status: "OVERDUE" },
        });
      }
      // 1 calendar day grace after due — stop workspace only after grace ends.
      if (pastGrace && invoice.organization.status === "ACTIVE") {
        await prisma.organization.update({
          where: { id: invoice.organizationId },
          data: { status: "HOLD", planStatus: "PAST_DUE" },
        });
        await syncOrganizationPlanRecord(invoice.organizationId, {
          status: "PAST_DUE",
          renewalAt: invoice.dueAt,
        });
        held.push(invoice.number);
      }
    }

  }

  const soon = await prisma.organizationPlan.findMany({
    where: {
      renewalAt: {
        gte: now,
        lte: new Date(now.getTime() + 7 * 86_400_000),
      },
      organization: {
        isPrimary: false,
        status: "ACTIVE",
      },
    },
    select: { organizationId: true, renewalAt: true },
  });

  for (const plan of soon) {
    const existing = await prisma.subscriptionInvoice.findFirst({
      where: {
        organizationId: plan.organizationId,
        status: { in: ["DRAFT", "SENT", "OVERDUE"] },
      },
      select: { id: true },
    });
    if (existing) continue;
    const created = await generateSubscriptionInvoice({
      organizationId: plan.organizationId,
      prorate: false,
    });
    if (created.ok) {
      generated.push(created.invoice.number);
    }
  }

  const whatsappApi = await runWhatsAppApiRechargeReminders(now);

  return {
    remindersSent: remindersSent.length,
    paymentPendingSent: paymentPendingSent.length,
    held: held.length,
    generated: generated.length,
    demoExpired: demoExpiry.expired,
    reminderNumbers: remindersSent,
    paymentPendingNumbers: paymentPendingSent,
    heldNumbers: held,
    generatedNumbers: generated,
    ...whatsappApi,
  };
}
