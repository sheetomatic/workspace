import { prisma } from "@/lib/db";
import { leadOutstandingBalance } from "@/lib/leads/payment-summary";
import { mergeLeadContactWhere } from "@/lib/leads/contact-validation";
import {
  getLeadNurtureConfig,
  type LeadAlertOrgConfig,
  type LeadNurtureOrgConfig,
} from "@/lib/leads/nurture/config";
import { eventSentWithinDays, readNurtureState } from "@/lib/leads/nurture/state";
import {
  alertEventForKind,
  type CrmAlertItem,
} from "@/lib/leads/alerts/types";

export type { CrmAlertItem, CrmAlertKind } from "@/lib/leads/alerts/types";
export { alertEventForKind, alertKindLabel } from "@/lib/leads/alerts/types";

function daysBetween(from: Date, to = new Date()) {
  return Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function daysAgo(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

/** Queue + UI: aged invoices / quotes / negotiation without resolution. */
export async function listCrmAlertCenterItems(
  organizationId: string,
  options?: { limit?: number; config?: LeadNurtureOrgConfig; assignedToId?: string },
): Promise<CrmAlertItem[]> {
  const config = options?.config ?? (await getLeadNurtureConfig(organizationId));
  const alerts = config.alerts;
  const limit = options?.limit ?? 60;
  const assignedToId = options?.assignedToId;

  const [paymentItems, quotationItems, negotiationItems] = await Promise.all([
    listPaymentNotReceivedAlerts(organizationId, alerts, assignedToId),
    listQuotationNotAcceptedAlerts(organizationId, alerts, assignedToId),
    listNegotiationAlerts(organizationId, alerts, assignedToId),
  ]);

  const items = [...paymentItems, ...quotationItems, ...negotiationItems];
  items.sort((a, b) => b.daysOverdue - a.daysOverdue || b.anchorAt.localeCompare(a.anchorAt));
  return items.slice(0, limit);
}

function formatInr(amount: number) {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

async function listPaymentNotReceivedAlerts(
  organizationId: string,
  alerts: LeadAlertOrgConfig,
  assignedToId?: string,
): Promise<CrmAlertItem[]> {
  if (!alerts.paymentNotReceived.enabled) {
    return [];
  }
  const afterDays = alerts.paymentNotReceived.afterDays;
  const cutoff = daysAgo(afterDays);

  // Balance-aware: a partial payment (e.g. advance) must NOT silence the
  // alert — keep reminding while an outstanding balance remains. The clock
  // restarts from the most recent payment so clients aren't nagged right
  // after paying an instalment.
  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      ...(assignedToId ? { assignedToId } : {}),
      status: { in: ["INVOICE", "PAYMENT", "PROJECT_ACTIVE"] },
      OR: [
        {
          quotations: {
            some: {
              requestType: "INVOICE",
              status: { in: ["SENT", "REVISED", "LOCKED"] },
              quotationDate: { lte: cutoff },
            },
          },
        },
        {
          modifiedAt: { lte: cutoff },
        },
      ],
    }),
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      status: true,
      modifiedAt: true,
      rawPayload: true,
      quotationValue: true,
      payments: { select: { receivedAmount: true, receivedDate: true, paymentType: true } },
      quotations: {
        where: { requestType: "INVOICE" },
        orderBy: { quotationDate: "desc" },
        take: 1,
        select: {
          quotationDate: true,
          sentAt: true,
          status: true,
          totalAmount: true,
        },
      },
    },
    take: 120,
  });

  const items: CrmAlertItem[] = [];
  for (const lead of leads) {
    const invoice = lead.quotations[0];
    const balance = leadOutstandingBalance({
      invoiceTotal: invoice?.totalAmount,
      quotationValue: lead.quotationValue,
      payments: lead.payments,
    });

    if (balance !== null && balance <= 0.5) {
      continue; // Fully paid.
    }
    if (balance === null && lead.payments.length > 0) {
      continue; // No known total — can't tell if anything is outstanding.
    }
    if (balance === null && lead.status !== "INVOICE") {
      continue; // Legacy no-total case only applies to invoiced leads.
    }

    const lastPaymentAt = lead.payments.reduce<Date | null>(
      (latest, payment) =>
        !latest || payment.receivedDate > latest ? payment.receivedDate : latest,
      null,
    );
    const invoiceAnchor =
      invoice?.sentAt ?? invoice?.quotationDate ?? lead.modifiedAt ?? new Date();
    const anchor =
      lastPaymentAt && lastPaymentAt > invoiceAnchor ? lastPaymentAt : invoiceAnchor;
    const days = daysBetween(anchor);
    if (days < afterDays) {
      continue;
    }
    const state = readNurtureState(lead.rawPayload);
    const event = alertEventForKind("payment_not_received");
    const pendingAmountLabel = balance !== null ? formatInr(balance) : null;
    items.push({
      id: `payment-${lead.id}`,
      kind: "payment_not_received",
      event,
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      daysOverdue: days,
      reason: pendingAmountLabel
        ? `${pendingAmountLabel} balance pending · ${days}d since ${lastPaymentAt && lastPaymentAt >= invoiceAnchor ? "last payment" : "invoice"}`
        : `No payment recorded · ${days}d since invoice`,
      anchorAt: anchor.toISOString(),
      alreadyMessaged: eventSentWithinDays(state, event, afterDays),
      pendingAmountLabel,
    });
  }
  return items;
}

async function listQuotationNotAcceptedAlerts(
  organizationId: string,
  alerts: LeadAlertOrgConfig,
  assignedToId?: string,
): Promise<CrmAlertItem[]> {
  if (!alerts.quotationNotAccepted.enabled) {
    return [];
  }
  const afterDays = alerts.quotationNotAccepted.afterDays;
  const cutoff = daysAgo(afterDays);

  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      ...(assignedToId ? { assignedToId } : {}),
      status: { in: ["PROPOSAL", "NEGOTIATION", "INVOICE"] },
      quotations: {
        some: {
          requestType: "PROPOSAL",
          status: { in: ["SENT", "REVISED"] },
          lockedAt: null,
          OR: [{ sentAt: { lte: cutoff } }, { quotationDate: { lte: cutoff } }],
        },
      },
      payments: { none: {} },
    }),
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      status: true,
      rawPayload: true,
      quotations: {
        where: {
          requestType: "PROPOSAL",
          status: { in: ["SENT", "REVISED"] },
          lockedAt: null,
        },
        orderBy: [{ sentAt: "desc" }, { quotationDate: "desc" }],
        take: 1,
        select: { sentAt: true, quotationDate: true },
      },
    },
    take: 80,
  });

  const items: CrmAlertItem[] = [];
  for (const lead of leads) {
    const quote = lead.quotations[0];
    if (!quote) {
      continue;
    }
    const anchor = quote.sentAt ?? quote.quotationDate;
    const days = daysBetween(anchor);
    if (days < afterDays) {
      continue;
    }
    const state = readNurtureState(lead.rawPayload);
    const event = alertEventForKind("quotation_not_accepted");
    items.push({
      id: `quotation-${lead.id}`,
      kind: "quotation_not_accepted",
      event,
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      daysOverdue: days,
      reason: `Quotation not accepted · ${days}d since sent`,
      anchorAt: anchor.toISOString(),
      alreadyMessaged: eventSentWithinDays(state, event, afterDays),
    });
  }
  return items;
}

async function listNegotiationAlerts(
  organizationId: string,
  alerts: LeadAlertOrgConfig,
  assignedToId?: string,
): Promise<CrmAlertItem[]> {
  if (!alerts.negotiationFollowUp.enabled) {
    return [];
  }
  const afterDays = alerts.negotiationFollowUp.afterDays;
  const cutoff = daysAgo(afterDays);

  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      ...(assignedToId ? { assignedToId } : {}),
      status: "NEGOTIATION",
      modifiedAt: { lte: cutoff },
    }),
    select: {
      id: true,
      name: true,
      phone: true,
      company: true,
      status: true,
      modifiedAt: true,
      rawPayload: true,
    },
    take: 80,
  });

  return leads.map((lead) => {
    const anchor = lead.modifiedAt ?? new Date();
    const days = daysBetween(anchor);
    const state = readNurtureState(lead.rawPayload);
    const event = alertEventForKind("negotiation");
    return {
      id: `negotiation-${lead.id}`,
      kind: "negotiation" as const,
      event,
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      company: lead.company,
      status: lead.status,
      daysOverdue: days,
      reason: `In negotiation · ${days}d without update`,
      anchorAt: anchor.toISOString(),
      alreadyMessaged: eventSentWithinDays(state, event, afterDays),
    };
  });
}
