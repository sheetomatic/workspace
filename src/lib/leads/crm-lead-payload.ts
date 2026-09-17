import type { getInboundLeadForCrmDrawer } from "@/lib/leads/queries";
import type { LeadSalesOrderData } from "@/lib/leads/sales-order-types";

type CrmDrawerLead = NonNullable<
  Awaited<ReturnType<typeof getInboundLeadForCrmDrawer>>
>;

type CrmListLead = {
  id: string;
  channel: CrmDrawerLead["channel"];
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  city: string | null;
  address: string | null;
  zipCode: string | null;
  requirement: string | null;
  category: string | null;
  status: CrmDrawerLead["status"];
  aiSuggestedStatus: CrmDrawerLead["aiSuggestedStatus"];
  callingStatus: CrmDrawerLead["callingStatus"];
  projectStatus: CrmDrawerLead["projectStatus"];
  trainingRequired: boolean;
  score: number | null;
  temperature: CrmDrawerLead["temperature"];
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  campaign: string | null;
  landingPage: string | null;
  expectedCloseAt: Date | null;
  winProbability: number | null;
  archivedAt: Date | null;
  discussionNotes: string | null;
  meetingNotes: string | null;
  quotationValue: { toString(): string } | null;
  pipeValue: { toString(): string } | null;
  nextFollowUpAt: Date | null;
  capturedAt: Date | null;
  modifiedAt: Date | null;
  createdAt: Date;
  assignedTo: { id: string; name: string | null; email: string } | null;
  fmsInstance: CrmDrawerLead["fmsInstance"];
};

function serializeCrmLeadBase(lead: CrmListLead) {
  return {
    id: lead.id,
    channel: lead.channel,
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    company: lead.company,
    city: lead.city,
    address: lead.address,
    zipCode: lead.zipCode,
    requirement: lead.requirement,
    category: lead.category,
    status: lead.status,
    aiSuggestedStatus: lead.aiSuggestedStatus,
    callingStatus: lead.callingStatus,
    projectStatus: lead.projectStatus,
    trainingRequired: lead.trainingRequired,
    score: lead.score ?? null,
    temperature: lead.temperature ?? null,
    utmSource: lead.utmSource ?? null,
    utmMedium: lead.utmMedium ?? null,
    utmCampaign: lead.utmCampaign ?? null,
    utmContent: lead.utmContent ?? null,
    utmTerm: lead.utmTerm ?? null,
    campaign: lead.campaign ?? null,
    landingPage: lead.landingPage ?? null,
    expectedCloseAt: lead.expectedCloseAt?.toISOString() ?? null,
    winProbability: lead.winProbability ?? null,
    archivedAt: lead.archivedAt?.toISOString() ?? null,
    discussionNotes: lead.discussionNotes,
    meetingNotes: lead.meetingNotes,
    quotationValue: lead.quotationValue?.toString() ?? null,
    pipeValue: lead.pipeValue?.toString() ?? null,
    nextFollowUpAt: lead.nextFollowUpAt?.toISOString() ?? null,
    capturedAt: lead.capturedAt?.toISOString() ?? null,
    modifiedAt: lead.modifiedAt?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    assignedTo: lead.assignedTo,
    fmsInstance: lead.fmsInstance
      ? {
          id: lead.fmsInstance.id,
          referenceLabel: lead.fmsInstance.referenceLabel,
          status: lead.fmsInstance.status,
          template: { name: lead.fmsInstance.template.name },
        }
      : null,
  };
}

export function serializeCrmListLead(lead: CrmListLead) {
  return {
    ...serializeCrmLeadBase(lead),
    followUps: [],
    payments: [],
    quotations: [],
    offeredServices: [],
    activities: [],
    salesOrders: [],
    salesOrder: null,
    pendingTemplateOrders: [],
    drawerLoaded: false as const,
  };
}

export function serializeCrmDrawerLead(lead: CrmDrawerLead) {
  return {
    ...serializeCrmLeadBase(lead),
    followUps: lead.followUps.map((item) => ({
      id: item.id,
      scheduledAt: item.scheduledAt.toISOString(),
      notes: item.notes,
      type: item.type,
    })),
    payments: (lead.payments ?? []).map((item) => ({
      id: item.id,
      paymentType: item.paymentType,
      receivedAmount: item.receivedAmount.toString(),
      receivedDate: item.receivedDate.toISOString(),
      paymentMethod: item.paymentMethod,
      notes: item.notes,
    })),
    quotations: (lead.quotations ?? []).map((item) => ({
      id: item.id,
      quotationNumber: item.quotationNumber,
      requestType: item.requestType,
      status: item.status,
      revisionNumber: item.revisionNumber,
      totalAmount: item.totalAmount.toString(),
      subtotal: item.subtotal.toString(),
      quotationDate: item.quotationDate.toISOString(),
      projectStartDate: item.projectStartDate?.toISOString() ?? null,
      endDate: item.endDate?.toISOString() ?? null,
      durationDays: item.durationDays,
      company: item.company,
      address: item.address,
      zipCode: item.zipCode,
      scopeNotes: item.scopeNotes,
      paymentTerms: item.paymentTerms,
      advanceRequired: item.advanceRequired?.toString() ?? null,
      notes: item.notes,
      sentAt: item.sentAt?.toISOString() ?? null,
      lockedAt: item.lockedAt?.toISOString() ?? null,
      shareToken: item.shareToken,
      lines: (item.lines ?? []).map((line) => ({
        id: line.id,
        serviceCategory: line.serviceCategory,
        subCategory: line.subCategory,
        quantity: line.quantity,
        unitPrice: line.unitPrice.toString(),
        lineTotal: line.lineTotal.toString(),
      })),
    })),
    offeredServices: (lead.offeredServices ?? []).map((item) => ({
      id: item.id,
      catalogId: item.catalogId,
      serviceCategory: item.serviceCategory,
      subCategory: item.subCategory,
      unitPrice: item.unitPrice?.toString() ?? null,
    })),
    activities: (lead.activities ?? []).map((item) => ({
      id: item.id,
      type: item.type,
      body: item.body,
      createdAt: item.createdAt.toISOString(),
      createdBy: item.createdBy,
    })),
    drawerLoaded: true as const,
  };
}

export function withCrmDrawerExtras(
  lead: ReturnType<typeof serializeCrmDrawerLead>,
  salesOrders: LeadSalesOrderData[],
  pendingTemplateOrders: Array<{
    id: string;
    status: string;
    customerEmail: string;
    paymentRef: string | null;
    paymentClaimedAt?: string | null;
    hasPaymentProof?: boolean;
    productName: string;
    priceInr: number;
  }>,
) {
  return {
    ...lead,
    salesOrders,
    salesOrder: salesOrders[0] ?? null,
    pendingTemplateOrders,
    drawerLoaded: true as const,
  };
}
