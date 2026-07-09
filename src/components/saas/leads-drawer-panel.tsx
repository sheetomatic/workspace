"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import type {
  InboundLeadStatus,
  LeadCallingStatus,
  LeadPaymentMethod,
  LeadPaymentType,
  LeadProjectStatus,
  QuotationRequestType,
  QuotationStatus,
} from "@prisma/client";
import {
  addInboundLeadNote,
  addInboundLeadPayment,
  addLeadOfferedService,
  applyAiSuggestedLeadStatus,
  assignInboundLead,
  clearInboundLeadHistory,
  deleteInboundLeadActivity,
  scheduleInboundLeadFollowUp,
  updateInboundLeadDetails,
  updateInboundLeadStatus,
  updateLeadMeetingNotes,
  updateLeadProjectStatus,
} from "@/app/app/leads/actions";
import { QuotationBuilderPanel } from "@/components/saas/quotation-builder-panel";
import type { LeadDeliveryInput } from "@/lib/leads/delivery-journey";
import { deliveryJourneySummary, buildDeliveryJourney } from "@/lib/leads/delivery-journey";
import { SalesOrderPanel } from "@/components/saas/sales-order-panel";
import type { LeadSalesOrderData } from "@/lib/leads/sales-order-types";
import { formatInr, leadCategoryLabel, listLeadCategoryOptions, resolveLeadCategoryId, type LeadCategoryId } from "@/lib/leads/categories";
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
  discussionNotes: string | null;
  meetingNotes: string | null;
  quotationValue: string | number | null;
  pipeValue: string | number | null;
  nextFollowUpAt: string | null;
  assignedTo: { id: string; name: string | null; email: string } | null;
  payments: PaymentRow[];
  quotations: QuotationRow[];
  offeredServices: OfferedServiceRow[];
  activities: ActivityRow[];
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
  onDeleted,
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
}) {
  const router = useRouter();
  const [tab, setTab] = useState<
    "details" | "meeting" | "services" | "payments" | "quote" | "order"
  >("details");
  const [name, setName] = useState(lead.name ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [company, setCompany] = useState(lead.company ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [zipCode, setZipCode] = useState(lead.zipCode ?? "");
  const [requirement, setRequirement] = useState(lead.requirement ?? "");
  const [category, setCategory] = useState<LeadCategoryId>(resolveLeadCategoryId(lead.category));
  const [meetingNotes, setMeetingNotes] = useState(lead.meetingNotes ?? "");
  const [quotationValue, setQuotationValue] = useState(String(lead.quotationValue ?? ""));
  const [followUpAt, setFollowUpAt] = useState(defaultFollowUpLocal());
  const [noteDraft, setNoteDraft] = useState("");
  const [selectedCatalogId, setSelectedCatalogId] = useState(serviceCatalog[0]?.id ?? "");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [paymentType, setPaymentType] = useState<LeadPaymentType>("ADVANCE");
  const [paymentMethod, setPaymentMethod] = useState<LeadPaymentMethod>("UPI");
  const [activities, setActivities] = useState(lead.activities);

  useEffect(() => {
    setActivities(lead.activities);
  }, [lead.id, lead.activities]);

  const aiStatus = lead.aiSuggestedStatus ?? null;
  const showAiHint = aiStatus && aiStatus !== lead.status && canManage;

  const leadDelivery: LeadDeliveryInput = {
    quotations: lead.quotations,
    payments: lead.payments,
    salesOrder: lead.salesOrder ?? null,
  };
  const deliverySummary = deliveryJourneySummary(buildDeliveryJourney(leadDelivery));

  return (
    <aside
      className="leads-drawer leads-drawer-wide"
      role="dialog"
      aria-label="Lead details"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="leads-drawer-head">
        <div className="leads-drawer-head-copy">
          <h2>{lead.name || "Lead details"}</h2>
          <p className="leads-machine-muted">
            {leadCategoryLabel(lead.category)} · {leadStatusLabel(lead.status)}
          </p>
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
          {lead.salesOrder ? (
            <Link
              href={`/app/sales-orders/${lead.salesOrder.id}`}
              className="btn-secondary btn-sm leads-drawer-so-link"
            >
              {lead.salesOrder.orderNumber}
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
            { key: "details", label: "Details" },
            { key: "meeting", label: "Meeting" },
            { key: "services", label: "Services" },
            { key: "payments", label: "Payments" },
            { key: "quote", label: "Quotation" },
            { key: "order", label: "Delivery" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            className={tab === item.key ? "active" : ""}
            onClick={() => setTab(item.key)}
          >
            {item.label}
            {item.key === "order" ? (
              <span className="leads-drawer-tab-meta">{deliverySummary}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {tab === "details" ? (
        <>
          {canManage ? (
            <div className="leads-drawer-form">
              <label>
                Status (next stage)
                <select
                  value={resolveLeadStatus(lead.status)}
                  disabled={pending}
                  onChange={(event) =>
                    startTransition(async () => {
                      await updateInboundLeadStatus(
                        lead.id,
                        event.target.value as InboundLeadStatus,
                      );
                    })
                  }
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
                  value={lead.projectStatus}
                  disabled={pending}
                  onChange={(event) =>
                    startTransition(async () => {
                      await updateLeadProjectStatus(
                        lead.id,
                        event.target.value as LeadProjectStatus,
                      );
                    })
                  }
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
                  value={lead.assignedTo?.id ?? ""}
                  disabled={pending}
                  onChange={(event) =>
                    startTransition(async () => {
                      await assignInboundLead(lead.id, event.target.value || null);
                    })
                  }
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
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label>
                Company
                <input value={company} onChange={(e) => setCompany(e.target.value)} />
              </label>
              <label>
                Address
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </label>
              <label>
                ZIP
                <input value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
              </label>
              <label>
                Category
                <select
                  value={category}
                  disabled={!canManage}
                  onChange={(event) =>
                    setCategory(event.target.value as LeadCategoryId)
                  }
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
                <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} />
              </label>
              <label>
                Quotation amount (₹)
                <input
                  type="number"
                  value={quotationValue}
                  onChange={(e) => setQuotationValue(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await updateInboundLeadDetails({
                      leadId: lead.id,
                      name,
                      phone,
                      email,
                      company,
                      address,
                      zipCode,
                      requirement,
                      category,
                      discussionNotes: lead.discussionNotes ?? "",
                      quotationValue,
                      pipeValue: quotationValue,
                    });
                  })
                }
              >
                Save lead
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === "meeting" ? (
        <section className="leads-drawer-section">
          <h3>Meeting notes</h3>
          <p className="leads-machine-muted">
            Calling: {CALLING_STATUS_LABELS[lead.callingStatus]}
          </p>
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
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await updateLeadMeetingNotes(lead.id, meetingNotes);
                })
              }
            >
              Save meeting notes
            </button>
          ) : null}
          <section className="leads-drawer-section leads-drawer-section-nested">
            <h3>Follow-up</h3>
            <div className="leads-drawer-grid">
              <label>
                Next follow-up
                <input
                  type="datetime-local"
                  value={followUpAt}
                  onChange={(e) => setFollowUpAt(e.target.value)}
                />
              </label>
            </div>
            {canManage ? (
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await scheduleInboundLeadFollowUp({
                      leadId: lead.id,
                      scheduledAt: followUpAt,
                      notes: noteDraft,
                    });
                  })
                }
              >
                Schedule follow-up
              </button>
            ) : null}
          </section>
          <h3>Quick note to history</h3>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Call remark or follow-up note"
          />
          {canManage ? (
            <button
              type="button"
              className="btn-secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await addInboundLeadNote(lead.id, noteDraft);
                  setNoteDraft("");
                })
              }
            >
              Add to history
            </button>
          ) : null}
        </section>
      ) : null}

      {tab === "services" ? (
        <section className="leads-drawer-section">
          <h3>Offered services</h3>
          {canManage ? (
            <div className="leads-drawer-grid">
              <label>
                Add from catalog
                <select
                  value={selectedCatalogId}
                  onChange={(e) => setSelectedCatalogId(e.target.value)}
                >
                  {serviceCatalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.serviceCategory} — {item.subCategory}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn-secondary"
                disabled={pending || !selectedCatalogId}
                onClick={() =>
                  startTransition(async () => {
                    await addLeadOfferedService({
                      leadId: lead.id,
                      catalogId: selectedCatalogId,
                    });
                  })
                }
              >
                Add service
              </button>
            </div>
          ) : null}
          <ul className="leads-service-list">
            {lead.offeredServices.length === 0 ? (
              <li className="leads-machine-muted">No services added yet.</li>
            ) : (
              lead.offeredServices.map((item) => (
                <li key={item.id}>
                  <strong>{item.serviceCategory}</strong>
                  <span>{item.subCategory}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {tab === "payments" ? (
        <section className="leads-drawer-section">
          <h3>Payment sheet</h3>
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
                Received date
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
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await addInboundLeadPayment({
                      leadId: lead.id,
                      paymentType,
                      receivedAmount: paymentAmount,
                      receivedDate: paymentDate,
                      paymentMethod,
                    });
                    setPaymentAmount("");
                  })
                }
              >
                Record payment
              </button>
            </div>
          ) : null}
          <ul className="leads-payment-list">
            {lead.payments.length === 0 ? (
              <li className="leads-machine-muted">No payments recorded.</li>
            ) : (
              lead.payments.map((payment) => (
                <li key={payment.id}>
                  <strong>{PAYMENT_TYPE_LABELS[payment.paymentType]}</strong>
                  <span>
                    {formatInr(Number(payment.receivedAmount))} ·{" "}
                    {PAYMENT_METHOD_LABELS[payment.paymentMethod]}
                  </span>
                  <em>{new Date(payment.receivedDate).toLocaleDateString("en-IN")}</em>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      {tab === "order" ? (
        <SalesOrderPanel
          leadDelivery={leadDelivery}
          salesOrder={lead.salesOrder ?? null}
          canManage={canManage}
          pending={pending}
          startTransition={startTransition}
          onGoToLeadTab={(leadTab) => setTab(leadTab)}
        />
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

      {tab !== "order" ? (
      <section className="leads-drawer-section">
        <div className="leads-history-head">
          <h3>History & logs</h3>
          {canManage && activities.length > 0 ? (
            <button
              type="button"
              className="btn-secondary btn-sm leads-history-clear-btn"
              disabled={pending}
              onClick={() => {
                if (
                  !window.confirm(
                    "Delete all history entries for this lead? This cannot be undone.",
                  )
                ) {
                  return;
                }
                startTransition(async () => {
                  const result = await clearInboundLeadHistory(lead.id);
                  if (result.ok) {
                    setActivities([]);
                    router.refresh();
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
                    disabled={pending}
                    title="Delete entry"
                    aria-label="Delete history entry"
                    onClick={() => {
                      startTransition(async () => {
                        const result = await deleteInboundLeadActivity({
                          leadId: lead.id,
                          activityId: item.id,
                        });
                        if (result.ok) {
                          setActivities((current) =>
                            current.filter((entry) => entry.id !== item.id),
                          );
                          router.refresh();
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
    </aside>
  );
}
