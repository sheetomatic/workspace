import { prisma } from "@/lib/db";
import { PRIMARY_ORG_SLUG } from "@/lib/platform";
import { daysUntilDue, isPastDueDate, shouldSendReminder } from "@/lib/billing/dates";
import { runWhatsAppApiRechargeReminders } from "@/lib/billing/whatsapp-api-reminders";
import { generateSubscriptionInvoice } from "@/lib/billing/invoices";
import { sendSubscriptionInvoiceEmail } from "@/lib/billing/email";
import { syncOrganizationPlanRecord } from "@/lib/organization-plan";

export async function runSubscriptionBillingCron(now = new Date()) {
  const remindersSent: string[] = [];
  const held: string[] = [];
  const generated: string[] = [];

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
            select: { user: { select: { email: true } } },
          },
        },
      },
    },
  });

  for (const invoice of openInvoices) {
    if (invoice.organization.isPrimary || invoice.organization.slug === PRIMARY_ORG_SLUG) {
      continue;
    }

    if (isPastDueDate(invoice.dueAt, now) && invoice.status !== "VOID") {
      if (invoice.status !== "OVERDUE") {
        await prisma.subscriptionInvoice.update({
          where: { id: invoice.id },
          data: { status: "OVERDUE" },
        });
      }
      if (invoice.organization.status === "ACTIVE") {
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
    if (
      shouldSendReminder(daysLeft, invoice.lastReminderAt, now) &&
      invoice.status !== "VOID"
    ) {
      const toEmail =
        invoice.organization.billing?.billingEmail ??
        invoice.organization.memberships[0]?.user.email ??
        null;
      if (toEmail) {
        await sendSubscriptionInvoiceEmail({
          toEmail,
          organizationName: invoice.organization.name,
          invoiceNumber: invoice.number,
          kind: daysLeft < 0 ? "overdue" : daysLeft === 0 ? "due_today" : "reminder",
          daysLeft,
          totalPaise: invoice.totalPaise,
          dueAt: invoice.dueAt,
          invoiceId: invoice.id,
        });
        await prisma.subscriptionInvoice.update({
          where: { id: invoice.id },
          data: {
            lastReminderAt: now,
            reminderCount: { increment: 1 },
            status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
            sentAt: invoice.sentAt ?? now,
          },
        });
        remindersSent.push(invoice.number);
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
    held: held.length,
    generated: generated.length,
    reminderNumbers: remindersSent,
    heldNumbers: held,
    generatedNumbers: generated,
    ...whatsappApi,
  };
}
