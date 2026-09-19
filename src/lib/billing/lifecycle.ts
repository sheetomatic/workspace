import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import {
  daysUntilDue,
  isPastDueDate,
  isPastGracePeriod,
  shouldSendPaymentPendingAlert,
  shouldSendReminder,
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

    const daysLeft = daysUntilDue(invoice.dueAt, now);
    if (invoice.status === "VOID") continue;

    const toEmail =
      invoice.organization.billing?.billingEmail ??
      invoice.organization.memberships[0]?.user.email ??
      null;
    const ownerPhone = invoice.organization.memberships[0]?.user.phone ?? null;

    const paymentPending = shouldSendPaymentPendingAlert(
      daysLeft,
      invoice.lastReminderAt,
      now,
    );
    const reminder =
      !paymentPending &&
      shouldSendReminder(daysLeft, invoice.lastReminderAt, now);

    if (!paymentPending && !reminder) continue;
    if (!toEmail && !(paymentPending && ownerPhone)) continue;

    if (paymentPending) {
      if (toEmail) {
        await sendSubscriptionInvoiceEmail({
          toEmail,
          organizationName: invoice.organization.name,
          invoiceNumber: invoice.number,
          kind: "payment_pending",
          daysLeft,
          totalPaise: invoice.totalPaise,
          dueAt: invoice.dueAt,
          invoiceId: invoice.id,
        });
      }
      await sendSubscriptionPaymentPendingWhatsApp({
        phone: ownerPhone,
        organizationName: invoice.organization.name,
        invoiceNumber: invoice.number,
        totalPaise: invoice.totalPaise,
        dueAt: invoice.dueAt,
        daysLeft,
      });
      paymentPendingSent.push(invoice.number);
    } else if (toEmail) {
      await sendSubscriptionInvoiceEmail({
        toEmail,
        organizationName: invoice.organization.name,
        invoiceNumber: invoice.number,
        kind: "reminder",
        daysLeft,
        totalPaise: invoice.totalPaise,
        dueAt: invoice.dueAt,
        invoiceId: invoice.id,
      });
      remindersSent.push(invoice.number);
    }

    await prisma.subscriptionInvoice.update({
      where: { id: invoice.id },
      data: {
        lastReminderAt: now,
        reminderCount: { increment: 1 },
        status: pastDue
          ? "OVERDUE"
          : invoice.status === "DRAFT"
            ? "SENT"
            : invoice.status,
        sentAt: invoice.sentAt ?? now,
      },
    });
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
