import { prisma } from "@/lib/db";
import { mergeLeadContactWhere } from "@/lib/leads/contact-validation";
import {
  getLeadNurtureConfig,
  type LeadAlertOrgConfig,
  type LeadNurtureOrgConfig,
} from "@/lib/leads/nurture/config";
import { eventAlreadySent, readNurtureState } from "@/lib/leads/nurture/state";
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
  options?: { limit?: number; config?: LeadNurtureOrgConfig },
): Promise<CrmAlertItem[]> {
  const config = options?.config ?? (await getLeadNurtureConfig(organizationId));
  const alerts = config.alerts;
  const limit = options?.limit ?? 60;

  const [paymentItems, quotationItems, negotiationItems] = await Promise.all([
    listPaymentNotReceivedAlerts(organizationId, alerts),
    listQuotationNotAcceptedAlerts(organizationId, alerts),
    listNegotiationAlerts(organizationId, alerts),
  ]);

  const items = [...paymentItems, ...quotationItems, ...negotiationItems];
  items.sort((a, b) => b.daysOverdue - a.daysOverdue || b.anchorAt.localeCompare(a.anchorAt));
  return items.slice(0, limit);
}

async function listPaymentNotReceivedAlerts(
  organizationId: string,
  alerts: LeadAlertOrgConfig,
): Promise<CrmAlertItem[]> {
  if (!alerts.paymentNotReceived.enabled) {
    return [];
  }
  const afterDays = alerts.paymentNotReceived.afterDays;
  const cutoff = daysAgo(afterDays);

  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
      status: "INVOICE",
      payments: { none: {} },
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
      quotations: {
        where: { requestType: "INVOICE" },
        orderBy: { quotationDate: "desc" },
        take: 1,
        select: { quotationDate: true, sentAt: true, status: true },
      },
    },
    take: 80,
  });

  return leads
    .map((lead) => {
      const invoice = lead.quotations[0];
      const anchor =
        invoice?.sentAt ?? invoice?.quotationDate ?? lead.modifiedAt ?? new Date();
      const days = daysBetween(anchor);
      if (days < afterDays) {
        return null;
      }
      const state = readNurtureState(lead.rawPayload);
      const event = alertEventForKind("payment_not_received");
      return {
        id: `payment-${lead.id}`,
        kind: "payment_not_received" as const,
        event,
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        daysOverdue: days,
        reason: `No payment recorded · ${days}d since invoice`,
        anchorAt: anchor.toISOString(),
        alreadyMessaged: eventAlreadySent(state, event),
      };
    })
    .filter((item): item is CrmAlertItem => Boolean(item));
}

async function listQuotationNotAcceptedAlerts(
  organizationId: string,
  alerts: LeadAlertOrgConfig,
): Promise<CrmAlertItem[]> {
  if (!alerts.quotationNotAccepted.enabled) {
    return [];
  }
  const afterDays = alerts.quotationNotAccepted.afterDays;
  const cutoff = daysAgo(afterDays);

  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
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

  return leads
    .map((lead) => {
      const quote = lead.quotations[0];
      if (!quote) {
        return null;
      }
      const anchor = quote.sentAt ?? quote.quotationDate;
      const days = daysBetween(anchor);
      if (days < afterDays) {
        return null;
      }
      const state = readNurtureState(lead.rawPayload);
      const event = alertEventForKind("quotation_not_accepted");
      return {
        id: `quotation-${lead.id}`,
        kind: "quotation_not_accepted" as const,
        event,
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        company: lead.company,
        status: lead.status,
        daysOverdue: days,
        reason: `Quotation not accepted · ${days}d since sent`,
        anchorAt: anchor.toISOString(),
        alreadyMessaged: eventAlreadySent(state, event),
      };
    })
    .filter((item): item is CrmAlertItem => Boolean(item));
}

async function listNegotiationAlerts(
  organizationId: string,
  alerts: LeadAlertOrgConfig,
): Promise<CrmAlertItem[]> {
  if (!alerts.negotiationFollowUp.enabled) {
    return [];
  }
  const afterDays = alerts.negotiationFollowUp.afterDays;
  const cutoff = daysAgo(afterDays);

  const leads = await prisma.inboundLead.findMany({
    where: mergeLeadContactWhere({
      organizationId,
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
      alreadyMessaged: eventAlreadySent(state, event),
    };
  });
}
