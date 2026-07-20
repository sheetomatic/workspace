"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import type {
  InboundLeadStatus,
  LeadCallingStatus,
  LeadPaymentMethod,
  LeadPaymentType,
  LeadProjectStatus,
  LeadTemperature,
  QuotationRequestType,
  QuotationStatus,
} from "@prisma/client";
import {
  addInboundLeadNote,
  addInboundLeadPayment,
  applyAiSuggestedLeadStatus,
  archiveInboundLeadAction,
  assignInboundLead,
  clearInboundLeadHistory,
  deleteInboundLeadActivity,
  listLeadDuplicateMatchesAction,
  logLeadTimelineActivity,
  mergeInboundLeadsAction,
  scheduleInboundLeadFollowUp,
  scheduleLeadClientMeeting,
  sendLeadNurtureWhatsAppAction,
  unarchiveInboundLeadAction,
  updateInboundLeadDetails,
  updateInboundLeadStatus,
  updateLeadMeetingNotes,
  updateLeadCallingStatus,
  updateLeadProjectStatus,
} from "@/app/app/leads/actions";
import { QuotationBuilderPanel } from "@/components/saas/quotation-builder-panel";
import { LeadTemperatureBadge } from "@/components/saas/lead-temperature-badge";
import type { LeadDeliveryInput } from "@/lib/leads/delivery-journey";
import { deliveryJourneySummary, buildDeliveryJourney } from "@/lib/leads/delivery-journey";
import { SalesOrderPanel } from "@/components/saas/sales-order-panel";
import { LeadTrainingSlotsPanel } from "@/components/saas/lead-training-slots-panel";
import {
  partitionSalesOrdersByLifecycle,
  salesOrderStatusLabel,
  type LeadSalesOrderData,
} from "@/lib/leads/sales-order-types";
import { formatInr, leadCategoryLabel, listLeadCategoryOptions, resolveLeadCategoryId, type LeadCategoryId } from "@/lib/leads/categories";
import {
  buildDemoIcsContent,
  buildGoogleCalendarUrl,
  buildOutlookWebUrl,
  downloadIcsFilename,
} from "@/lib/leads/calendar-links";
import {
  followUpTypeLabel,
  listFollowUpTypeOptions,
  suggestFollowUpTypeFromStatus,
  type InboundLeadFollowUpTypeId,
} from "@/lib/leads/follow-up-types";
import { leadWhatsAppHref } from "@/lib/leads/contact-links";
import { computeLeadPaymentSummary } from "@/lib/leads/payment-summary";
import { buildLeadsListQuery, type LeadsListSearchParams } from "@/lib/leads/list-params";
import {
  CALLING_STATUS_LABELS,
  listLeadStatusOptions,
  PROJECT_STATUS_LABELS,
  leadStatusLabel,
  resolveLeadStatus,
} from "@/lib/leads/status-labels";

const PAYMENT_TYPE_LABELS: Record<LeadPaymentType, string> = {
  ADVANCE: "1. Advance Payment",
  PARTIAL: "2. Partial Payment",
  FULL: "3. Full Payment",
  TRAINING_FEE: "4. Training Fee",
  WHATSAPP_API_SETUP: "5. WhatsApp API Setup",
  WHATSAPP_API_RECHARGE: "6. WhatsApp API Recharge",
  YOUTUBE_ADSENSE: "7. YouTube Adsense",
  COURSE_FEE: "8. Course Fee",
};

const PAYMENT_METHOD_LABELS: Record<LeadPaymentMethod, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CASH_DEPOSIT: "Cash Deposit",
  UPI: "UPI",
};

type CatalogItem = {
  id: string;
  serviceCategory: string;
  subCategory: string;
};

type PaymentRow = {
  id: string;
  paymentType: LeadPaymentType;
  receivedAmount: string | number;
  receivedDate: string;
  paymentMethod: LeadPaymentMethod;
  notes: string | null;
};

type QuotationLine = {
  id: string;
  serviceCategory: string;
  subCategory: string;
  quantity: number;
  unitPrice: string | number;
  lineTotal: string | number;
};

type QuotationRow = {
  id: string;
  quotationNumber: string;
  requestType: QuotationRequestType;
  status: QuotationStatus;
  revisionNumber: number;
  totalAmount: string | number;
  subtotal: string | number;
  quotationDate: string;
  projectStartDate: string | null;
  endDate: string | null;
  durationDays: number | null;
  company: string | null;
  address: string | null;
  zipCode: string | null;
  scopeNotes: string | null;
  paymentTerms: string | null;
  advanceRequired: string | number | null;
  notes: string | null;
  sentAt: string | null;
  lockedAt: string | null;
  shareToken: string | null;
  lines: QuotationLine[];
};

type OfferedServiceRow = {
  id: string;
  catalogId: string | null;
  serviceCategory: string;
  subCategory: string;
  unitPrice: string | number | null;
};

type ActivityRow = {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
};

type FollowUpRow = {
  id: string;
  scheduledAt: string;
  notes: string | null;
  type?: InboundLeadFollowUpTypeId | string | null;
};

type DrawerTab =
  | "details"
  | "activity"
  | "meeting"
  | "payments"
  | "quote"
  | "projects"
  | "training";

type ActionKey =
  | "details"
  | "calling"
  | "meeting-notes"
  | "schedule-meeting"
  | "follow-up"
  | "payment"
  | "activity"
  | "history"
  | "nurture";

type ActivityComposerType = "NOTE" | "CALL" | "WHATSAPP";

type DetailsSaveStatus = "idle" | "saving" | "saved" | "error";

function tempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export type LeadDrawerData = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  zipCode: string | null;
  requirement: string | null;
  category: string | null;
  status: InboundLeadStatus;
  aiSuggestedStatus: InboundLeadStatus | null;
  callingStatus: LeadCallingStatus;
  projectStatus: LeadProjectStatus;
  score: number | null;
  temperature: LeadTemperature | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  campaign: string | null;
  landingPage: string | null;
  expectedCloseAt: string | null;
  winProbability: number | null;
  archivedAt: string | null;
  discussionNotes: string | null;
  meetingNotes: string | null;
  quotationValue: string | number | null;
  pipeValue: string | number | null;
  nextFollowUpAt: string | null;
  modifiedAt: string | null;
  capturedAt?: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  payments: PaymentRow[];
  quotations: QuotationRow[];
  offeredServices: OfferedServiceRow[];
  activities: ActivityRow[];
  followUps?: Array<{
    id: string;
    scheduledAt: string;
    notes: string | null;
    type?: InboundLeadFollowUpTypeId | string | null;
  }>;
  /** All projects/SOs for this client (newest first). */
  salesOrders?: LeadSalesOrderData[];
  /** Latest SO — kept for list badges / journey default. */
  salesOrder?: LeadSalesOrderData | null;
};

function defaultFollowUpLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadDrawerPanel({
  lead,
  canManage,
  serviceCatalog,
  teamMembers,
  organizationName,
  organizationLogoUrl,
  pending,
  startTransition,
  onClose,
  onDeleted: _onDeleted,
  onLeadPatched,
  listParams = {},
}: {
  lead: LeadDrawerData;
  canManage: boolean;
  serviceCatalog: CatalogItem[];
  teamMembers: Array<{ user: { id: string; name: string | null; email: string } }>;
  organizationName: string;
  organizationLogoUrl: string | null;
  pending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  onClose: () => void;
  onDeleted?: () => void;
  onLeadPatched?: (id: string, patch: Partial<LeadDrawerData>) => void;
  listParams?: LeadsListSearchParams;
}) {
  void _onDeleted;
  const router = useRouter();
  const [fieldPending, startFieldTransition] = useTransition();
  const [, startActionTransition] = useTransition();
  const [tab, setTab] = useState<DrawerTab>("details");
  const allSalesOrders = lead.salesOrders?.length
    ? lead.salesOrders
    : lead.salesOrder
      ? [lead.salesOrder]
      : [];
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    allSalesOrders[0]?.id ?? null,
  );
  const [name, setName] = useState(lead.name ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [company, setCompany] = useState(lead.company ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [zipCode, setZipCode] = useState(lead.zipCode ?? "");
  const [requirement, setRequirement] = useState(lead.requirement ?? "");
  const [category, setCategory] = useState<LeadCategoryId>(resolveLeadCategoryId(lead.category));
  const [meetingNotes, setMeetingNotes] = useState(lead.meetingNotes ?? "");
  const [callingStatus, setCallingStatus] = useState(lead.callingStatus);
  const [quotationValue, setQuotationValue] = useState(String(lead.quotationValue ?? ""));
  const [utmSource, setUtmSource] = useState(lead.utmSource ?? "");
  const [utmMedium, setUtmMedium] = useState(lead.utmMedium ?? "");
  const [utmCampaign, setUtmCampaign] = useState(lead.utmCampaign ?? "");
  const [utmContent, setUtmContent] = useState(lead.utmContent ?? "");
  const [utmTerm, setUtmTerm] = useState(lead.utmTerm ?? "");
  const [campaign, setCampaign] = useState(lead.campaign ?? "");
  const [landingPage, setLandingPage] = useState(lead.landingPage ?? "");
  const [expectedCloseAt, setExpectedCloseAt] = useState(
    lead.expectedCloseAt ? lead.expectedCloseAt.slice(0, 10) : "",
  );
  const [winProbability, setWinProbability] = useState(
    lead.winProbability != null ? String(lead.winProbability) : "",
  );
  const [status, setStatus] = useState(() => resolveLeadStatus(lead.status));
  const [projectStatus, setProjectStatus] = useState(lead.projectStatus);
  const [assignedToId, setAssignedToId] = useState(lead.assignedTo?.id ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [detailsSaveStatus, setDetailsSaveStatus] = useState<DetailsSaveStatus>("idle");
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [savingKey, setSavingKey] = useState<ActionKey | null>(null);
  const [duplicateMatch, setDuplicateMatch] = useState<{
    id: string;
    name: string | null;
  } | null>(null);
  const [dupCandidates, setDupCandidates] = useState<
    Array<{
      id: string;
      name: string | null;
      phone: string | null;
      email: string | null;
      company: string | null;
      status: InboundLeadStatus;
      matchKind: string;
    }>
  >([]);
  const [followUpAt, setFollowUpAt] = useState(defaultFollowUpLocal());
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpType, setFollowUpType] = useState<InboundLeadFollowUpTypeId>(
    () => suggestFollowUpTypeFromStatus(lead.status),
  );
  const [followUpQueueWa, setFollowUpQueueWa] = useState(true);
  const [followUpSendNow, setFollowUpSendNow] = useState(false);
  const [followUpMsg, setFollowUpMsg] = useState<string | null>(null);
  const [activityComposerType, setActivityComposerType] =
    useState<ActivityComposerType>("NOTE");
  const [activityDraft, setActivityDraft] = useState("");
  const [activityError, setActivityError] = useState<string | null>(null);
  const [meetingAt, setMeetingAt] = useState(defaultFollowUpLocal());
  const [meetingDuration, setMeetingDuration] = useState(45);
  const [meetingEmail, setMeetingEmail] = useState(lead.email ?? "");
  const [meetingMeetUrl, setMeetingMeetUrl] = useState("");
  const [meetingScheduleMsg, setMeetingScheduleMsg] = useState<string | null>(null);
  const [meetingScheduleErr, setMeetingScheduleErr] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentType, setPaymentType] = useState<LeadPaymentType>("ADVANCE");
  const [paymentMethod, setPaymentMethod] = useState<LeadPaymentMethod>("UPI");
  const [activities, setActivities] = useState(lead.activities);
  const [payments, setPayments] = useState(lead.payments);
  const [followUpsState, setFollowUpsState] = useState<FollowUpRow[]>(
    lead.followUps ?? [],
  );
  const detailsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const detailsSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aiStatus = lead.aiSuggestedStatus ?? null;
  const showAiHint = aiStatus && aiStatus !== status && canManage;
  const isArchived = Boolean(lead.archivedAt);
  const isDemoScheduled = resolveLeadStatus(status) === "DEMO_SCHEDULED";

  function markDetailsDirty() {
    setDetailsDirty(true);
    setDetailsSaveStatus("idle");
  }

  function appendActivity(entry: Omit<ActivityRow, "id" | "createdAt" | "createdBy"> & {
    id?: string;
    createdAt?: string;
  }) {
    const next: ActivityRow = {
      id: entry.id ?? tempId("act"),
      type: entry.type,
      body: entry.body,
      createdAt: entry.createdAt ?? new Date().toISOString(),
      createdBy: null,
    };
    setActivities((current) => {
      const merged = [next, ...current];
      onLeadPatched?.(lead.id, { activities: merged });
      return merged;
    });
  }

  function runAction(key: ActionKey, work: () => Promise<void>) {
    setSavingKey(key);
    startActionTransition(async () => {
      try {
        await work();
      } finally {
        setSavingKey((current) => (current === key ? null : current));
      }
    });
  }

  async function persistDetails(options?: { explicit?: boolean }) {
    if (!canManage) return;
    if (savingKey === "details") return;
    if (!detailsDirty && !options?.explicit) return;

    setSavingKey("details");
    setDetailsSaveStatus("saving");
    setSaveError(null);
    setDuplicateMatch(null);

    const result = await updateInboundLeadDetails({
      leadId: lead.id,
      name,
      phone,
      email,
      company,
      address,
      zipCode,
      requirement,
      category,
      quotationValue,
      pipeValue: quotationValue,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      campaign,
      landingPage,
      expectedCloseAt,
      winProbability,
    });

    setSavingKey((current) => (current === "details" ? null : current));

    if (!result.ok) {
      setDetailsSaveStatus("error");
      setSaveError(result.message ?? "Could not save lead.");
      if ("duplicate" in result && result.duplicate && result.matches?.[0]) {
        setDuplicateMatch({
          id: result.matches[0].id,
          name: result.matches[0].name,
        });
      }
      return;
    }

    setDetailsDirty(false);
    setDetailsSaveStatus("saved");
    onLeadPatched?.(lead.id, {
      name: name || null,
      phone: phone || null,
      email: email || null,
      company: company || null,
      address: address || null,
      zipCode: zipCode || null,
      requirement: requirement || null,
      category,
      quotationValue: quotationValue || null,
      pipeValue: quotationValue || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
      utmCampaign: utmCampaign || null,
      utmContent: utmContent || null,
      utmTerm: utmTerm || null,
      campaign: campaign || null,
      landingPage: landingPage || null,
      expectedCloseAt: expectedCloseAt || null,
      winProbability: winProbability ? Number(winProbability) : null,
    });
    if (detailsSavedTimerRef.current) {
      clearTimeout(detailsSavedTimerRef.current);
    }
    detailsSavedTimerRef.current = setTimeout(() => {
      setDetailsSaveStatus((current) => (current === "saved" ? "idle" : current));
    }, 2000);
  }

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    void listLeadDuplicateMatchesAction(lead.id).then((result) => {
      if (cancelled || !result.ok) return;
      setDupCandidates(result.matches);
    });
    return () => {
      cancelled = true;
    };
  }, [lead.id, canManage, lead.phone, lead.email, lead.company]);

  useEffect(() => {
    setStatus(resolveLeadStatus(lead.status));
    setProjectStatus(lead.projectStatus);
    setAssignedToId(lead.assignedTo?.id ?? "");
    setCallingStatus(lead.callingStatus);
    setMeetingEmail(lead.email ?? "");
    setMeetingScheduleMsg(null);
    setMeetingScheduleErr(null);
    setFollowUpMsg(null);
    setFollowUpType(suggestFollowUpTypeFromStatus(lead.status));
    setFollowUpQueueWa(true);
    setFollowUpSendNow(false);
    setSaveError(null);
    setDetailsSaveStatus("idle");
    setDetailsDirty(false);
    setActivities(lead.activities);
    setPayments(lead.payments);
    setFollowUpsState(lead.followUps ?? []);
    const orders = lead.salesOrders?.length
      ? lead.salesOrders
      : lead.salesOrder
        ? [lead.salesOrder]
        : [];
    setSelectedOrderId(orders[0]?.id ?? null);
    // Remount-equivalent reset when switching leads only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  useEffect(() => {
    setStatus(resolveLeadStatus(lead.status));
  }, [lead.status]);

  useEffect(() => {
    setProjectStatus(lead.projectStatus);
  }, [lead.projectStatus]);

  useEffect(() => {
    setCallingStatus(lead.callingStatus);
  }, [lead.callingStatus]);

  useEffect(() => {
    setAssignedToId(lead.assignedTo?.id ?? "");
  }, [lead.assignedTo?.id]);

  useEffect(() => {
    setMeetingEmail(lead.email ?? "");
  }, [lead.email]);

  useEffect(() => {
    setActivities(lead.activities);
  }, [lead.activities]);

  useEffect(() => {
    setPayments(lead.payments);
  }, [lead.payments]);

  useEffect(() => {
    setFollowUpsState(lead.followUps ?? []);
  }, [lead.followUps]);

  useEffect(() => {
    const orders = lead.salesOrders?.length
      ? lead.salesOrders
      : lead.salesOrder
        ? [lead.salesOrder]
        : [];
    setSelectedOrderId(orders[0]?.id ?? null);
  }, [lead.salesOrder?.id, lead.salesOrders]);

  useEffect(() => {
    const body = document.querySelector(".leads-drawer-body");
    if (body instanceof HTMLElement) {
      body.scrollTop = 0;
    }
  }, [tab, lead.id]);

  useEffect(() => {
    if (!canManage || !detailsDirty) return;
    if (detailsDebounceRef.current) {
      clearTimeout(detailsDebounceRef.current);
    }
    detailsDebounceRef.current = setTimeout(() => {
      void persistDetails();
    }, 750);
    return () => {
      if (detailsDebounceRef.current) {
        clearTimeout(detailsDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on field dirtiness
  }, [
    canManage,
    detailsDirty,
    name,
    phone,
    email,
    company,
    address,
    zipCode,
    requirement,
    category,
    quotationValue,
    utmSource,
    utmMedium,
    utmCampaign,
    utmContent,
    utmTerm,
    campaign,
    landingPage,
    expectedCloseAt,
    winProbability,
  ]);

  useEffect(() => {
    return () => {
      if (detailsDebounceRef.current) clearTimeout(detailsDebounceRef.current);
      if (detailsSavedTimerRef.current) clearTimeout(detailsSavedTimerRef.current);
    };
  }, []);

  const demoStartsAt = lead.nextFollowUpAt
    ? new Date(lead.nextFollowUpAt)
    : followUpAt
      ? new Date(followUpAt)
      : null;
  const demoCalendarInput =
    demoStartsAt && !Number.isNaN(demoStartsAt.getTime())
      ? {
          leadName: lead.name,
          company: lead.company,
          requirement: lead.requirement,
          meetingNotes: meetingNotes || lead.meetingNotes,
          startsAt: demoStartsAt,
          durationMinutes: meetingDuration,
          meetUrl: meetingMeetUrl.trim() || null,
        }
      : null;

  const selectedSalesOrder =
    allSalesOrders.find((order) => order.id === selectedOrderId) ??
    allSalesOrders[0] ??
    null;
  const { running: runningProjects, delivered: deliveredProjects } =
    partitionSalesOrdersByLifecycle(allSalesOrders);
  const leadDelivery: LeadDeliveryInput = {
    quotations: lead.quotations,
    payments,
    salesOrder: selectedSalesOrder,
  };
  const deliverySummary = deliveryJourneySummary(buildDeliveryJourney(leadDelivery));
  const paymentSummary = computeLeadPaymentSummary({
    quotationValue: lead.quotationValue,
    quotations: lead.quotations,
    payments,
  });
  const followUps = [...followUpsState].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );
  const detailsBusy = savingKey === "details" || fieldPending;
  const now = Date.now();
  const upcomingMeetings = followUps.filter(
    (item) => new Date(item.scheduledAt).getTime() >= now - 60_000,
  );
  const pastMeetings = followUps
    .filter((item) => new Date(item.scheduledAt).getTime() < now - 60_000)
    .reverse();
  const openFollowUps = upcomingMeetings;
  const waPaymentHref = leadWhatsAppHref(
    lead.phone,
    lead.name,
    `Hi ${lead.name?.split(/\s+/)[0] || "there"}, friendly reminder — Total ${paymentSummary.totalLabel}, Received ${paymentSummary.receivedLabel}, Due ${paymentSummary.dueLabel}. Last payment date: ${paymentSummary.lastDateLabel}. — Sheetomatic`,
  );

  return (
    <aside
      className="leads-drawer leads-drawer-wide"
      role="dialog"
      aria-label="Lead details"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="leads-drawer-head">
        <div className="leads-drawer-head-copy">
          <h2>
            {lead.name || "Lead details"}
            {isArchived ? (
              <span className="leads-archived-pill"> · Archived</span>
            ) : null}
          </h2>
          <p className="leads-machine-muted">
            {leadCategoryLabel(lead.category)} · {leadStatusLabel(lead.status)}
          </p>
          <div className="leads-drawer-score-row">
            <LeadTemperatureBadge score={lead.score} temperature={lead.temperature} />
          </div>
          {lead.nextFollowUpAt ? (
            <p className="leads-machine-muted leads-drawer-followup-line">
              Next follow-up:{" "}
              {new Date(lead.nextFollowUpAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}
          {showAiHint ? (
            <button
              type="button"
              className="leads-ai-status-btn"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await applyAiSuggestedLeadStatus(lead.id);
                })
              }
            >
              AI: {leadStatusLabel(aiStatus)} — Apply
            </button>
          ) : null}
        </div>
        <div className="leads-drawer-head-actions">
          {canManage ? (
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  if (isArchived) {
                    await unarchiveInboundLeadAction(lead.id);
                  } else {
                    await archiveInboundLeadAction(lead.id);
                    onClose();
                  }
                  router.refresh();
                })
              }
            >
              {isArchived ? "Unarchive" : "Archive"}
            </button>
          ) : null}
          {selectedSalesOrder ? (
            <Link
              href={`/app/sales-orders/${selectedSalesOrder.id}`}
              className="btn-secondary btn-sm leads-drawer-so-link"
            >
              {selectedSalesOrder.orderNumber}
            </Link>
          ) : (
            <Link
              href="/app/sales-orders"
              className="btn-secondary btn-sm leads-drawer-so-link"
            >
              Sales orders
            </Link>
          )}
          <button
            type="button"
            className="leads-icon-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      <nav className="leads-drawer-tabs" aria-label="Lead sections">
        {(
          [
            { key: "details" as const, label: "Details" },
            { key: "activity" as const, label: "Activity" },
            { key: "meeting" as const, label: "Meeting" },
            { key: "quote" as const, label: "Quotation" },
            { key: "payments" as const, label: "Payment" },
            { key: "projects" as const, label: "Projects" },
            { key: "training" as const, label: "Training" },
          ]
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? "active" : ""}
            aria-current={tab === item.key ? "true" : undefined}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            {item.key === "activity" && activities.length > 0 ? (
              <span className="leads-drawer-tab-meta">{activities.length}</span>
            ) : null}
            {item.key === "projects" ? (
              <span className="leads-drawer-tab-meta">
                {allSalesOrders.length > 0
                  ? `${runningProjects.length} running · ${deliveredProjects.length} done`
                  : deliverySummary}
              </span>
            ) : null}
            {item.key === "meeting" && upcomingMeetings.length > 0 ? (
              <span className="leads-drawer-tab-meta">
                {upcomingMeetings.length} upcoming
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="leads-drawer-body">
      {tab === "details" ? (
        <>
          {canManage && dupCandidates.length > 0 ? (
            <div className="leads-merge-panel" role="region" aria-label="Duplicate leads">
              <h3>Possible duplicates</h3>
              <p className="leads-machine-muted">
                Phone/email matches are hard; company name is soft. GST/PAN merge is not
                available yet. Merge keeps this lead and archives the other.
              </p>
              <ul className="leads-merge-list">
                {dupCandidates.map((dup) => (
                  <li key={dup.id}>
                    <span>
                      <strong>{dup.name || "Unnamed"}</strong>
                      {dup.company ? ` · ${dup.company}` : ""}
                      <span className="leads-merge-kind"> · {dup.matchKind}</span>
                    </span>
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      disabled={pending}
                      onClick={() => {
                        const label = dup.name || dup.phone || dup.id;
                        if (
                          !window.confirm(
                            `Merge “${label}” into this lead? Activities and quotes move here; the other lead is archived.`,
                          )
                        ) {
                          return;
                        }
                        startTransition(async () => {
                          const result = await mergeInboundLeadsAction({
                            primaryId: lead.id,
                            secondaryId: dup.id,
                          });
                          if (!result.ok) {
                            window.alert(result.message);
                            return;
                          }
                          setDupCandidates((prev) =>
                            prev.filter((item) => item.id !== dup.id),
                          );
                          router.refresh();
                        });
                      }}
                    >
                      Merge into this
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {canManage ? (
            <div className="leads-drawer-form">
              <label>
                Status (next stage)
                <select
                  value={status}
                  disabled={fieldPending}
                  onChange={(event) => {
                    const next = event.target.value as InboundLeadStatus;
                    const previous = status;
                    setStatus(next);
                    setDetailsSaveStatus("idle");
                    startFieldTransition(async () => {
                      const result = await updateInboundLeadStatus(lead.id, next);
                      if (!result.ok) {
                        setStatus(previous);
                        setSaveError(result.message ?? "Could not update status.");
                        return;
                      }
                      setSaveError(null);
                      onLeadPatched?.(lead.id, { status: next });
                    });
                  }}
                >
                  {listLeadStatusOptions().map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Project status
                <select
                  value={projectStatus}
                  disabled={fieldPending}
                  onChange={(event) => {
                    const next = event.target.value as LeadProjectStatus;
                    const previous = projectStatus;
                    setProjectStatus(next);
                    setDetailsSaveStatus("idle");
                    startFieldTransition(async () => {
                      const result = await updateLeadProjectStatus(lead.id, next);
                      if (!result.ok) {
                        setProjectStatus(previous);
                        setSaveError(result.message ?? "Could not update project status.");
                        return;
                      }
                      setSaveError(null);
                      onLeadPatched?.(lead.id, { projectStatus: next });
                    });
                  }}
                >
                  {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Owner
                <select
                  value={assignedToId}
                  disabled={fieldPending}
                  onChange={(event) => {
                    const next = event.target.value;
                    const previous = assignedToId;
                    setAssignedToId(next);
                    setDetailsSaveStatus("idle");
                    startFieldTransition(async () => {
                      const result = await assignInboundLead(
                        lead.id,
                        next || null,
                      );
                      if (!result.ok) {
                        setAssignedToId(previous);
                        setSaveError(result.message ?? "Could not update owner.");
                        return;
                      }
                      setSaveError(null);
                      const member = teamMembers.find((m) => m.user.id === next);
                      onLeadPatched?.(lead.id, {
                        assignedTo: member
                          ? {
                              id: member.user.id,
                              name: member.user.name,
                              email: member.user.email,
                            }
                          : null,
                      });
                    });
                  }}
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member) => (
                    <option key={member.user.id} value={member.user.id}>
                      {member.user.name || member.user.email}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Name
                <input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Phone
                <input
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Email
                <input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Company
                <input
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Address
                <input
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                ZIP
                <input
                  value={zipCode}
                  onChange={(e) => {
                    setZipCode(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  disabled={!canManage}
                  onChange={(event) => {
                    setCategory(event.target.value as LeadCategoryId);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                >
                  {listLeadCategoryOptions().map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Requirement
                <textarea
                  value={requirement}
                  onChange={(e) => {
                    setRequirement(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Quotation amount (₹)
                <input
                  type="number"
                  value={quotationValue}
                  onChange={(e) => {
                    setQuotationValue(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Expected close
                <input
                  type="date"
                  value={expectedCloseAt}
                  onChange={(e) => {
                    setExpectedCloseAt(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                />
              </label>
              <label>
                Win probability %
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={winProbability}
                  onChange={(e) => {
                    setWinProbability(e.target.value);
                    markDetailsDirty();
                  }}
                  onBlur={() => void persistDetails()}
                  placeholder="Stage default if blank"
                />
              </label>
              <details className="leads-attribution">
                <summary>Attribution</summary>
                <div className="leads-drawer-grid">
                  <label>
                    Campaign
                    <input
                      value={campaign}
                      onChange={(e) => {
                        setCampaign(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                      placeholder="Campaign name"
                    />
                  </label>
                  <label>
                    Landing page
                    <input
                      value={landingPage}
                      onChange={(e) => {
                        setLandingPage(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                      placeholder="https://…"
                    />
                  </label>
                  <label>
                    UTM source
                    <input
                      value={utmSource}
                      onChange={(e) => {
                        setUtmSource(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                      placeholder="google"
                    />
                  </label>
                  <label>
                    UTM medium
                    <input
                      value={utmMedium}
                      onChange={(e) => {
                        setUtmMedium(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                      placeholder="cpc"
                    />
                  </label>
                  <label>
                    UTM campaign
                    <input
                      value={utmCampaign}
                      onChange={(e) => {
                        setUtmCampaign(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                    />
                  </label>
                  <label>
                    UTM content
                    <input
                      value={utmContent}
                      onChange={(e) => {
                        setUtmContent(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                    />
                  </label>
                  <label>
                    UTM term
                    <input
                      value={utmTerm}
                      onChange={(e) => {
                        setUtmTerm(e.target.value);
                        markDetailsDirty();
                      }}
                      onBlur={() => void persistDetails()}
                    />
                  </label>
                </div>
              </details>
              {saveError ? (
                <div className="leads-duplicate-alert" role="alert">
                  <p>{saveError}</p>
                  {duplicateMatch ? (
                    <div className="leads-duplicate-alert-actions">
                      <Link
                        href={`/app/leads?${buildLeadsListQuery(listParams, {
                          leadId: duplicateMatch.id,
                          page: "1",
                        })}`}
                        onClick={onClose}
                      >
                        Open existing lead
                        {duplicateMatch.name ? ` · ${duplicateMatch.name}` : ""}
                      </Link>
                      {canManage ? (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={pending}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Merge the other lead into this one? The duplicate will be archived.`,
                              )
                            ) {
                              return;
                            }
                            startTransition(async () => {
                              const result = await mergeInboundLeadsAction({
                                primaryId: lead.id,
                                secondaryId: duplicateMatch.id,
                              });
                              if (!result.ok) {
                                setSaveError(result.message);
                                return;
                              }
                              setSaveError(null);
                              setDuplicateMatch(null);
                              router.refresh();
                            });
                          }}
                        >
                          Merge into this lead
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="leads-details-save-row">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={detailsBusy}
                  onClick={() => void persistDetails({ explicit: true })}
                >
                  Save lead
                </button>
                <span className="leads-save-status" role="status" aria-live="polite">
                  {detailsSaveStatus === "saving"
                    ? "Saving…"
                    : detailsSaveStatus === "saved"
                      ? "Saved"
                      : detailsDirty
                        ? "Unsaved changes"
                        : null}
                </span>
              </div>
            </div>
          ) : (
            <div className="leads-drawer-readonly">
              <LeadTemperatureBadge score={lead.score} temperature={lead.temperature} />
              {(lead.campaign ||
                lead.landingPage ||
                lead.utmSource ||
                lead.utmMedium ||
                lead.utmCampaign) && (
                <details className="leads-attribution">
                  <summary>Attribution</summary>
                  <dl className="leads-attribution-dl">
                    {lead.campaign ? (
                      <>
                        <dt>Campaign</dt>
                        <dd>{lead.campaign}</dd>
                      </>
                    ) : null}
                    {lead.landingPage ? (
                      <>
                        <dt>Landing page</dt>
                        <dd>{lead.landingPage}</dd>
                      </>
                    ) : null}
                    {lead.utmSource ? (
                      <>
                        <dt>UTM source</dt>
                        <dd>{lead.utmSource}</dd>
                      </>
                    ) : null}
                    {lead.utmMedium ? (
                      <>
                        <dt>UTM medium</dt>
                        <dd>{lead.utmMedium}</dd>
                      </>
                    ) : null}
                    {lead.utmCampaign ? (
                      <>
                        <dt>UTM campaign</dt>
                        <dd>{lead.utmCampaign}</dd>
                      </>
                    ) : null}
                  </dl>
                </details>
              )}
            </div>
          )}
        </>
      ) : null}

      {tab === "meeting" ? (
        <section className="leads-drawer-section">
          <h3>Call & meeting</h3>
          {canManage ? (
            <label className="leads-drawer-field">
              Calling status
              <select
                value={callingStatus}
                disabled={savingKey === "calling"}
                onChange={(e) => {
                  const next = e.target.value as LeadCallingStatus;
                  const previous = callingStatus;
                  setCallingStatus(next);
                  onLeadPatched?.(lead.id, { callingStatus: next });
                  runAction("calling", async () => {
                    const result = await updateLeadCallingStatus(
                      lead.id,
                      next,
                      meetingNotes || undefined,
                    );
                    if (!result.ok || !("lead" in result) || !result.lead) {
                      setCallingStatus(previous);
                      onLeadPatched?.(lead.id, { callingStatus: previous });
                      return;
                    }
                    const patched = result.lead;
                    appendActivity({
                      type: "CALL",
                      body: meetingNotes.trim()
                        ? `Call status: ${next.replaceAll("_", " ")} — ${meetingNotes.trim()}`
                        : `Call status: ${next.replaceAll("_", " ")}`,
                    });
                    onLeadPatched?.(lead.id, patched);
                    if (patched.status) {
                      setStatus(patched.status);
                    }
                  });
                }}
              >
                {(Object.keys(CALLING_STATUS_LABELS) as LeadCallingStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {CALLING_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="leads-machine-muted">
              Calling: {CALLING_STATUS_LABELS[callingStatus]}
            </p>
          )}
          <textarea
            value={meetingNotes}
            onChange={(e) => setMeetingNotes(e.target.value)}
            placeholder="What was discussed in the meeting?"
            rows={6}
          />
          {canManage ? (
            <button
              type="button"
              className="btn-primary"
              disabled={savingKey === "meeting-notes"}
              onClick={() =>
                runAction("meeting-notes", async () => {
                  const result = await updateLeadMeetingNotes(lead.id, meetingNotes);
                  if (!result.ok || !("lead" in result) || !result.lead) return;
                  const patched = result.lead;
                  onLeadPatched?.(lead.id, patched);
                  if (patched.status) {
                    setStatus(patched.status);
                  }
                  if (patched.meetingNotes) {
                    appendActivity({ type: "MEETING", body: patched.meetingNotes });
                  }
                })
              }
            >
              {savingKey === "meeting-notes" ? "Saving…" : "Save meeting notes"}
            </button>
          ) : null}

          {canManage ? (
            <div className="leads-schedule-meeting">
              <h4>Schedule meeting with client</h4>
              <p className="leads-machine-muted">
                From this CRM panel only — emails the client a calendar link. Does not open
                Google Calendar to create the booking.
              </p>
              <div className="leads-drawer-grid">
                <label>
                  Meeting date &amp; time
                  <input
                    type="datetime-local"
                    value={meetingAt}
                    onChange={(e) => setMeetingAt(e.target.value)}
                  />
                </label>
                <label>
                  Duration
                  <select
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(Number(e.target.value))}
                  >
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                  </select>
                </label>
                <label>
                  Client email
                  <input
                    type="email"
                    value={meetingEmail}
                    onChange={(e) => setMeetingEmail(e.target.value)}
                    placeholder="client@company.com"
                    required
                  />
                </label>
                <label>
                  Meet / join link (optional)
                  <input
                    type="url"
                    value={meetingMeetUrl}
                    onChange={(e) => setMeetingMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/…"
                  />
                </label>
              </div>
              {meetingScheduleErr ? (
                <p className="leads-schedule-meeting__err" role="alert">
                  {meetingScheduleErr}
                </p>
              ) : null}
              {meetingScheduleMsg ? (
                <p className="leads-schedule-meeting__ok">{meetingScheduleMsg}</p>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                disabled={savingKey === "schedule-meeting"}
                onClick={() => {
                  setMeetingScheduleErr(null);
                  setMeetingScheduleMsg(null);
                  runAction("schedule-meeting", async () => {
                    const result = await scheduleLeadClientMeeting({
                      leadId: lead.id,
                      startsAt: meetingAt,
                      durationMinutes: meetingDuration,
                      clientEmail: meetingEmail,
                      meetUrl: meetingMeetUrl || undefined,
                      notes: meetingNotes.trim() || undefined,
                      sendEmail: true,
                    });
                    if (!result.ok) {
                      setMeetingScheduleErr(result.message);
                      return;
                    }
                    setMeetingScheduleMsg(result.message);
                    setFollowUpAt(meetingAt);
                    const followUp: FollowUpRow = {
                      id: tempId("fu"),
                      scheduledAt: result.lead.nextFollowUpAt,
                      type: "MEETING",
                      notes:
                        meetingNotes.trim() ||
                        `Client meeting scheduled (${meetingDuration} min)`,
                    };
                    setFollowUpsState((current) => {
                      const merged = [...current, followUp];
                      onLeadPatched?.(lead.id, {
                        ...result.lead,
                        followUps: merged,
                      });
                      return merged;
                    });
                    setStatus(result.lead.status);
                    if (result.lead.meetingNotes) {
                      setMeetingNotes(result.lead.meetingNotes);
                    }
                    appendActivity({
                      type: "MEETING",
                      body: `Meeting scheduled for ${result.whenLabel}`,
                    });
                  });
                }}
              >
                {savingKey === "schedule-meeting"
                  ? "Scheduling…"
                  : "Schedule & email client"}
              </button>
            </div>
          ) : null}

          {(isDemoScheduled || demoCalendarInput) && (
            <div className="leads-calendar-links">
              <h4>Add to your calendar (team)</h4>
              <p className="leads-machine-muted">
                Optional for you — Google / Outlook / ICS. Client already gets the link by email
                when you use Schedule &amp; email above.
              </p>
              {demoCalendarInput ? (
                <div className="leads-calendar-actions">
                  <a
                    className="btn-secondary btn-sm"
                    href={buildGoogleCalendarUrl(demoCalendarInput)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Calendar
                  </a>
                  <a
                    className="btn-secondary btn-sm"
                    href={buildOutlookWebUrl(demoCalendarInput)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Outlook web
                  </a>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    onClick={() => {
                      const blob = new Blob(
                        [buildDemoIcsContent(demoCalendarInput)],
                        { type: "text/calendar;charset=utf-8" },
                      );
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = downloadIcsFilename(lead.name);
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    Download ICS
                  </button>
                </div>
              ) : (
                <p className="leads-machine-muted">
                  Schedule the meeting above (or set a follow-up time) to enable calendar links.
                </p>
              )}
            </div>
          )}
          <section className="leads-meeting-calendar" aria-label="Scheduled meetings">
            <h4>Calendar — time-wise schedule</h4>
            <p className="leads-machine-muted">
              Upcoming and past meetings / follow-ups for this client (IST).
            </p>
            <div className="leads-meeting-calendar__cols">
              <div>
                <h5>Upcoming</h5>
                {upcomingMeetings.length === 0 ? (
                  <p className="leads-machine-muted">No upcoming meetings.</p>
                ) : (
                  <ul className="leads-meeting-timeline">
                    {upcomingMeetings.map((item) => (
                      <li key={item.id}>
                        <strong>
                          {new Date(item.scheduledAt).toLocaleString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        <span>{item.notes?.trim() || "Scheduled meeting"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h5>Past</h5>
                {pastMeetings.length === 0 ? (
                  <p className="leads-machine-muted">No past meetings yet.</p>
                ) : (
                  <ul className="leads-meeting-timeline">
                    {pastMeetings.slice(0, 8).map((item) => (
                      <li key={item.id}>
                        <strong>
                          {new Date(item.scheduledAt).toLocaleString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </strong>
                        <span>{item.notes?.trim() || "Meeting"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <section className="leads-drawer-section leads-drawer-section-nested">
            <h3>Follow-up</h3>
            <p className="leads-machine-muted leads-followup-hint">
              Pick a standard type so WhatsApp nurture can send the matching
              follow-up message when due.
            </p>
            <div className="leads-drawer-grid">
              <label>
                Follow-up type
                <select
                  value={followUpType}
                  onChange={(e) =>
                    setFollowUpType(e.target.value as InboundLeadFollowUpTypeId)
                  }
                >
                  {listFollowUpTypeOptions().map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Next follow-up
                <input
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                />
              </label>
              <label className="leads-drawer-span-2">
                Follow-up notes
                <input
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Optional note for your team / AI context"
                />
              </label>
            </div>

            <div className="leads-followup-last-logs" aria-label="Last logs">
              <h5>Last logs</h5>
              {activities.length === 0 ? (
                <p className="leads-machine-muted">No activity logged yet.</p>
              ) : (
                <ul>
                  {activities.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <strong>{item.type.replaceAll("_", " ")}</strong>
                      <span>
                        {item.body?.trim() || "—"} ·{" "}
                        {new Date(item.createdAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {openFollowUps.length > 0 ? (
              <div className="leads-followup-open-list" aria-label="Open follow-ups">
                <h5>Open follow-ups</h5>
                <ul>
                  {openFollowUps.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <span className="leads-followup-type-pill">
                        {followUpTypeLabel(item.type)}
                      </span>
                      <strong>
                        {new Date(item.scheduledAt).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                      <span>{item.notes?.trim() || "—"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {canManage ? (
              <div className="leads-followup-wa-options">
                <label className="leads-followup-check">
                  <input
                    type="checkbox"
                    checked={followUpQueueWa}
                    onChange={(e) => setFollowUpQueueWa(e.target.checked)}
                  />
                  Queue WhatsApp when due
                </label>
                <label className="leads-followup-check">
                  <input
                    type="checkbox"
                    checked={followUpSendNow}
                    onChange={(e) => setFollowUpSendNow(e.target.checked)}
                  />
                  Send WhatsApp now
                </label>
              </div>
            ) : null}

            {followUpMsg ? (
              <p className="leads-machine-muted" role="status">
                {followUpMsg}
              </p>
            ) : null}

            {canManage ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={savingKey === "follow-up"}
                onClick={() =>
                  runAction("follow-up", async () => {
                    setFollowUpMsg(null);
                    const result = await scheduleInboundLeadFollowUp({
                      leadId: lead.id,
                      scheduledAt: followUpAt,
                      notes: followUpNotes,
                      type: followUpType,
                      queueWhatsApp: followUpQueueWa,
                      sendWhatsAppNow: followUpSendNow,
                    });
                    if (
                      !result.ok ||
                      !("followUp" in result) ||
                      !result.followUp ||
                      !result.lead
                    ) {
                      setFollowUpMsg(
                        "message" in result && typeof result.message === "string"
                          ? result.message
                          : "Could not schedule follow-up.",
                      );
                      return;
                    }
                    const followUp: FollowUpRow = {
                      id: result.followUp.id,
                      scheduledAt: result.followUp.scheduledAt,
                      notes: result.followUp.notes,
                      type: result.followUp.type,
                    };
                    const patchedLead = result.lead;
                    setFollowUpsState((current) => {
                      const merged = [...current, followUp];
                      onLeadPatched?.(lead.id, {
                        status: patchedLead.status,
                        nextFollowUpAt: patchedLead.nextFollowUpAt,
                        followUps: merged,
                      });
                      return merged;
                    });
                    setStatus(patchedLead.status);
                    appendActivity({
                      type: "FOLLOW_UP",
                      body:
                        followUp.notes ||
                        `${followUpTypeLabel(followUp.type)} scheduled for ${new Date(followUp.scheduledAt).toLocaleString("en-IN")}`,
                    });
                    setFollowUpNotes("");
                    setFollowUpSendNow(false);
                    setFollowUpMsg(
                      followUpSendNow
                        ? `${followUpTypeLabel(followUp.type)} scheduled. WhatsApp send attempted.`
                        : followUpQueueWa
                          ? `${followUpTypeLabel(followUp.type)} scheduled. WhatsApp queued for due time.`
                          : `${followUpTypeLabel(followUp.type)} scheduled.`,
                    );
                  })
                }
              >
                {savingKey === "follow-up" ? "Scheduling…" : "Schedule follow-up"}
              </button>
            ) : null}
          </section>
        </section>
      ) : null}

      {tab === "payments" ? (
        <section className="leads-drawer-section">
          <h3>Payment</h3>
          <div className="leads-payment-summary" aria-label="Payment summary">
            <div>
              <span>Total Payment</span>
              <strong>{paymentSummary.totalLabel}</strong>
            </div>
            <div>
              <span>Received</span>
              <strong>{paymentSummary.receivedLabel}</strong>
            </div>
            <div>
              <span>Due</span>
              <strong>{paymentSummary.dueLabel}</strong>
            </div>
            <div>
              <span>Last Date of Payment</span>
              <strong>{paymentSummary.lastDateLabel}</strong>
            </div>
          </div>
          <div className="leads-payment-wa-row">
            {waPaymentHref ? (
              <a
                className="btn-secondary btn-sm"
                href={waPaymentHref}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp reminder
              </a>
            ) : (
              <span className="leads-machine-muted">Add phone to send WhatsApp.</span>
            )}
            {canManage && paymentSummary.due > 0 ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                disabled={savingKey === "nurture"}
                onClick={() =>
                  runAction("nurture", async () => {
                    const result = await sendLeadNurtureWhatsAppAction(
                      lead.id,
                      "alert_payment_pending",
                    );
                    if (!result.ok) return;
                    appendActivity({
                      type: "WHATSAPP",
                      body: "Payment pending reminder sent via WhatsApp",
                    });
                  })
                }
              >
                {savingKey === "nurture" ? "Sending…" : "Send WA from portal"}
              </button>
            ) : null}
          </div>
          {canManage ? (
            <div className="leads-drawer-form">
              <label>
                Payment type
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value as LeadPaymentType)}
                >
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Amount (₹)
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </label>
              <label>
                Payment received date
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </label>
              <label>
                Method
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as LeadPaymentMethod)
                  }
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={savingKey === "payment" || !paymentAmount.trim()}
                onClick={() =>
                  runAction("payment", async () => {
                    const result = await addInboundLeadPayment({
                      leadId: lead.id,
                      paymentType,
                      receivedAmount: paymentAmount,
                      receivedDate: paymentDate,
                      paymentMethod,
                    });
                    if (
                      !result.ok ||
                      !("payment" in result) ||
                      !result.payment ||
                      !result.lead
                    ) {
                      return;
                    }
                    const payment = result.payment;
                    const patchedLead = result.lead;
                    const row: PaymentRow = {
                      id: payment.id,
                      paymentType: payment.paymentType,
                      receivedAmount: payment.receivedAmount,
                      receivedDate: payment.receivedDate,
                      paymentMethod: payment.paymentMethod,
                      notes: payment.notes,
                    };
                    setPayments((current) => {
                      const merged = [row, ...current];
                      onLeadPatched?.(lead.id, {
                        payments: merged,
                        status: patchedLead.status,
                      });
                      return merged;
                    });
                    setStatus(patchedLead.status);
                    appendActivity({
                      type: "PAYMENT",
                      body: `₹${Number(payment.receivedAmount).toLocaleString("en-IN")} · ${payment.paymentType.replaceAll("_", " ")}`,
                    });
                    setPaymentAmount("");
                  })
                }
              >
                {savingKey === "payment" ? "Recording…" : "Record payment"}
              </button>
            </div>
          ) : null}
          <ul className="leads-payment-list">
            {payments.length === 0 ? (
              <li className="leads-machine-muted">No payments recorded.</li>
            ) : (
              payments.map((payment) => (
                <li key={payment.id}>
                  <strong>{PAYMENT_TYPE_LABELS[payment.paymentType]}</strong>
                  <span>
                    {formatInr(Number(payment.receivedAmount))} ·{" "}
                    {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                  </span>
                  <em>
                    Received {new Date(payment.receivedDate).toLocaleDateString("en-IN")}
                  </em>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {tab === "projects" ? (
        <section className="leads-drawer-section leads-projects-tab">
          <h3>Projects</h3>
          <p className="leads-machine-muted">
            One client can have multiple projects over time. Open a running or delivered
            sales order below.
          </p>
          <div className="leads-projects-split">
            <div>
              <h4>Running ({runningProjects.length})</h4>
              {runningProjects.length === 0 ? (
                <p className="leads-machine-muted">No running projects.</p>
              ) : (
                <ul className="leads-projects-list">
                  {runningProjects.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        className={
                          selectedSalesOrder?.id === order.id
                            ? "leads-project-chip is-active"
                            : "leads-project-chip"
                        }
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <strong>{order.orderNumber}</strong>
                        <span>{salesOrderStatusLabel(order.status)}</span>
                        <em>
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4>Delivered ({deliveredProjects.length})</h4>
              {deliveredProjects.length === 0 ? (
                <p className="leads-machine-muted">No delivered projects yet.</p>
              ) : (
                <ul className="leads-projects-list">
                  {deliveredProjects.map((order) => (
                    <li key={order.id}>
                      <button
                        type="button"
                        className={
                          selectedSalesOrder?.id === order.id
                            ? "leads-project-chip is-active"
                            : "leads-project-chip"
                        }
                        onClick={() => setSelectedOrderId(order.id)}
                      >
                        <strong>{order.orderNumber}</strong>
                        <span>{salesOrderStatusLabel(order.status)}</span>
                        <em>
                          {new Date(order.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </em>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <SalesOrderPanel
            leadDelivery={leadDelivery}
            salesOrder={selectedSalesOrder}
            canManage={canManage}
            pending={pending}
            startTransition={startTransition}
            onGoToLeadTab={(leadTab) => setTab(leadTab)}
          />
        </section>
      ) : null}

      {tab === "training" ? (
        <LeadTrainingSlotsPanel leadId={lead.id} canManage={canManage} />
      ) : null}

      {tab === "quote" ? (
        <QuotationBuilderPanel
          leadId={lead.id}
          leadName={lead.name}
          leadPhone={lead.phone}
          leadEmail={lead.email}
          leadCompany={lead.company}
          leadAddress={lead.address}
          leadZipCode={lead.zipCode}
          leadRequirement={lead.requirement}
          offeredServices={lead.offeredServices}
          serviceCatalog={serviceCatalog}
          quotations={lead.quotations}
          organizationName={organizationName}
          organizationLogoUrl={organizationLogoUrl}
          canManage={canManage}
          pending={pending}
          startTransition={startTransition}
        />
      ) : null}

      {tab === "activity" ? (
        <section className="leads-drawer-section" aria-label="Activity timeline">
          <h3>Activity</h3>
          <p className="leads-machine-muted">
            Notes, calls, WhatsApp, meetings, and stage changes — newest first.
          </p>
          {canManage ? (
            <div className="leads-activity-composer">
              <div
                className="leads-activity-composer-types"
                role="group"
                aria-label="Activity type"
              >
                {(
                  [
                    { key: "NOTE" as const, label: "Log note" },
                    { key: "CALL" as const, label: "Log call" },
                    { key: "WHATSAPP" as const, label: "Log WhatsApp" },
                  ]
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={
                      activityComposerType === item.key
                        ? "btn-secondary btn-sm is-active"
                        : "btn-secondary btn-sm"
                    }
                    aria-pressed={activityComposerType === item.key}
                    onClick={() => setActivityComposerType(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label className="leads-drawer-field">
                {activityComposerType === "NOTE"
                  ? "Note"
                  : activityComposerType === "CALL"
                    ? "Call notes (optional)"
                    : "WhatsApp notes (optional)"}
                <textarea
                  value={activityDraft}
                  onChange={(e) => setActivityDraft(e.target.value)}
                  placeholder={
                    activityComposerType === "NOTE"
                      ? "What happened with this lead?"
                      : "Optional details…"
                  }
                  rows={3}
                />
              </label>
              {activityError ? (
                <p className="leads-schedule-meeting__err" role="alert">
                  {activityError}
                </p>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                disabled={
                  savingKey === "activity" ||
                  (activityComposerType === "NOTE" && !activityDraft.trim())
                }
                onClick={() => {
                  setActivityError(null);
                  runAction("activity", async () => {
                    const body = activityDraft.trim();
                    if (activityComposerType === "NOTE") {
                      const result = await addInboundLeadNote(lead.id, body);
                      if (!result.ok) {
                        setActivityError(result.message ?? "Could not save note.");
                        return;
                      }
                      appendActivity({ type: "NOTE", body });
                      setActivityDraft("");
                      return;
                    }

                    const result = await logLeadTimelineActivity({
                      leadId: lead.id,
                      type: activityComposerType,
                      body: body || undefined,
                    });
                    if (!result.ok) {
                      setActivityError(result.message ?? "Could not log activity.");
                      return;
                    }
                    appendActivity({
                      type: result.activity.type,
                      body: result.activity.body,
                    });
                    setActivityDraft("");
                  });
                }}
              >
                {savingKey === "activity" ? "Logging…" : "Add to timeline"}
              </button>
            </div>
          ) : null}

          {followUps.length > 0 ? (
            <div className="leads-activity-followups">
              <h4>Follow-ups</h4>
              <ul className="leads-meeting-timeline">
                {followUps.slice(0, 6).map((item) => (
                  <li key={item.id}>
                    <strong>
                      {new Date(item.scheduledAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                    <span>{item.notes?.trim() || "Follow-up"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="leads-history-head">
            <h4>History &amp; logs</h4>
            {canManage && activities.length > 0 ? (
              <button
                type="button"
                className="btn-secondary btn-sm leads-history-clear-btn"
                disabled={savingKey === "history"}
                onClick={() => {
                  if (
                    !window.confirm(
                      "Delete all history entries for this lead? This cannot be undone.",
                    )
                  ) {
                    return;
                  }
                  runAction("history", async () => {
                    const result = await clearInboundLeadHistory(lead.id);
                    if (result.ok) {
                      setActivities([]);
                      onLeadPatched?.(lead.id, { activities: [] });
                    }
                  });
                }}
              >
                Clear all
              </button>
            ) : null}
          </div>
          <ul className="leads-history-list">
            {activities.length === 0 ? (
              <li className="leads-machine-muted">No activity yet.</li>
            ) : (
              activities.map((item) => (
                <li key={item.id} className="leads-history-item">
                  <div className="leads-history-item-body">
                    <strong>{item.type.replaceAll("_", " ")}</strong>
                    <span>{item.body}</span>
                    <em>
                      {new Date(item.createdAt).toLocaleString("en-IN")} ·{" "}
                      {item.createdBy?.name || item.createdBy?.email || "System"}
                    </em>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className="leads-history-delete-btn"
                      disabled={savingKey === "history"}
                      title="Delete entry"
                      aria-label="Delete history entry"
                      onClick={() => {
                        runAction("history", async () => {
                          const result = await deleteInboundLeadActivity({
                            leadId: lead.id,
                            activityId: item.id,
                          });
                          if (result.ok) {
                            setActivities((current) => {
                              const merged = current.filter(
                                (entry) => entry.id !== item.id,
                              );
                              onLeadPatched?.(lead.id, { activities: merged });
                              return merged;
                            });
                          }
                        });
                      }}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}
      </div>
    </aside>
  );
}
