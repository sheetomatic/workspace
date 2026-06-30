"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, Phone, Trash2, X } from "lucide-react";
import type {
  InboundLeadStatus,
  LeadCallingStatus,
  LeadPaymentMethod,
  LeadPaymentType,
  LeadProjectStatus,
  QuotationRequestType,
} from "@prisma/client";
import {
  addInboundLeadNote,
  addInboundLeadPayment,
  addLeadOfferedService,
  applyAiSuggestedLeadStatus,
  assignInboundLead,
  createLeadQuotation,
  deleteInboundLead,
  logLeadContactAction,
  scheduleInboundLeadFollowUp,
  updateInboundLeadDetails,
  updateInboundLeadStatus,
  updateLeadMeetingNotes,
  updateLeadProjectStatus,
} from "@/app/app/leads/actions";
import { formatInr, leadCategoryLabel } from "@/lib/leads/categories";
import {
  CALLING_STATUS_LABELS,
  LEAD_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  leadStatusLabel,
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
  unitPrice: string | number | null;
};

type PaymentRow = {
  id: string;
  paymentType: LeadPaymentType;
  receivedAmount: string | number;
  receivedDate: string;
  paymentMethod: LeadPaymentMethod;
  notes: string | null;
};

type QuotationRow = {
  id: string;
  quotationNumber: string;
  requestType: QuotationRequestType;
  totalAmount: string | number;
  quotationDate: string;
  sentAt: string | null;
};

type OfferedServiceRow = {
  id: string;
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
};

function phoneDigits(phone: string | null) {
  return phone?.replace(/\D/g, "") ?? "";
}

function waHref(phone: string | null, name: string | null) {
  const digits = phoneDigits(phone);
  if (!digits) {
    return null;
  }
  const message = `Hi ${name || "there"}, thank you for reaching out to Sheetomatic.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

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
  pending,
  startTransition,
  onClose,
  onDeleted,
}: {
  lead: LeadDrawerData;
  canManage: boolean;
  serviceCatalog: CatalogItem[];
  teamMembers: Array<{ user: { id: string; name: string | null; email: string } }>;
  pending: boolean;
  startTransition: (callback: () => Promise<void>) => void;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const [tab, setTab] = useState<"details" | "meeting" | "services" | "payments" | "quote">(
    "details",
  );
  const [name, setName] = useState(lead.name ?? "");
  const [phone, setPhone] = useState(lead.phone ?? "");
  const [email, setEmail] = useState(lead.email ?? "");
  const [company, setCompany] = useState(lead.company ?? "");
  const [address, setAddress] = useState(lead.address ?? "");
  const [zipCode, setZipCode] = useState(lead.zipCode ?? "");
  const [requirement, setRequirement] = useState(lead.requirement ?? "");
  const [discussionNotes, setDiscussionNotes] = useState(lead.discussionNotes ?? "");
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
  const [quoteType, setQuoteType] = useState<QuotationRequestType>("PROPOSAL");
  const [quoteDuration, setQuoteDuration] = useState("30");

  const aiStatus = lead.aiSuggestedStatus ?? null;
  const showAiHint = aiStatus && aiStatus !== lead.status && canManage;
  const callDigits = phoneDigits(lead.phone);
  const whatsapp = waHref(lead.phone, lead.name);

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
          {canManage ? (
            <div className="leads-icon-actions">
              {callDigits ? (
                <a
                  className="leads-icon-btn"
                  href={`tel:${callDigits}`}
                  title="Call"
                  aria-label="Call"
                  onClick={() =>
                    startTransition(async () => {
                      await logLeadContactAction(lead.id, "CALL");
                    })
                  }
                >
                  <Phone size={16} />
                </a>
              ) : null}
              {whatsapp ? (
                <a
                  className="leads-icon-btn"
                  href={whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  title="WhatsApp"
                  aria-label="WhatsApp"
                  onClick={() =>
                    startTransition(async () => {
                      await logLeadContactAction(lead.id, "WHATSAPP");
                    })
                  }
                >
                  <MessageCircle size={16} />
                </a>
              ) : null}
              <button
                type="button"
                className="leads-icon-btn danger"
                title="Delete"
                aria-label="Delete lead"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("Delete this lead?")) {
                    startTransition(async () => {
                      await deleteInboundLead(lead.id);
                      onDeleted?.();
                    });
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : null}
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

      <div className="leads-drawer-tabs">
        {(["details", "meeting", "services", "payments", "quote"] as const).map((key) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "active" : ""}
            onClick={() => setTab(key)}
          >
            {key === "details"
              ? "Details"
              : key === "meeting"
                ? "Meeting"
                : key === "services"
                  ? "Services"
                  : key === "payments"
                    ? "Payments"
                    : "Quotation"}
          </button>
        ))}
      </div>

      {tab === "details" ? (
        <>
          {canManage ? (
            <div className="leads-drawer-form">
              <label>
                Status (next stage)
                <select
                  value={lead.status}
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
                  {Object.entries(LEAD_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
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
                Requirement
                <textarea value={requirement} onChange={(e) => setRequirement(e.target.value)} />
              </label>
              <label>
                Discussion notes
                <textarea
                  value={discussionNotes}
                  onChange={(e) => setDiscussionNotes(e.target.value)}
                />
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
                      requirement,
                      discussionNotes,
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
          <section className="leads-drawer-section">
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
                      {item.unitPrice ? ` (${formatInr(Number(item.unitPrice))})` : ""}
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
                  {item.unitPrice ? (
                    <em>{formatInr(Number(item.unitPrice))}</em>
                  ) : null}
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

      {tab === "quote" ? (
        <section className="leads-drawer-section">
          <h3>Quotation / Invoice</h3>
          {canManage ? (
            <div className="leads-drawer-form">
              <label>
                Type
                <select
                  value={quoteType}
                  onChange={(e) => setQuoteType(e.target.value as QuotationRequestType)}
                >
                  <option value="PROPOSAL">Proposal</option>
                  <option value="INVOICE">Invoice</option>
                </select>
              </label>
              <label>
                Duration (days)
                <input
                  type="number"
                  value={quoteDuration}
                  onChange={(e) => setQuoteDuration(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await createLeadQuotation({
                      leadId: lead.id,
                      requestType: quoteType,
                      durationDays: quoteDuration,
                      lineCatalogIds: [],
                    });
                  })
                }
              >
                Generate quotation
              </button>
            </div>
          ) : null}
          <ul className="leads-quote-list">
            {lead.quotations.length === 0 ? (
              <li className="leads-machine-muted">No quotations yet.</li>
            ) : (
              lead.quotations.map((quote) => (
                <li key={quote.id}>
                  <strong>{quote.quotationNumber}</strong>
                  <span>
                    {quote.requestType} · {formatInr(Number(quote.totalAmount))}
                  </span>
                  <Link
                    className="leads-action-btn"
                    href={`/app/leads/quotations/${quote.id}/print`}
                    target="_blank"
                  >
                    Open PDF
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      ) : null}

      <section className="leads-drawer-section">
        <h3>History & logs</h3>
        <ul className="leads-history-list">
          {lead.activities.length === 0 ? (
            <li className="leads-machine-muted">No activity yet.</li>
          ) : (
            lead.activities.map((item) => (
              <li key={item.id}>
                <strong>{item.type.replaceAll("_", " ")}</strong>
                <span>{item.body}</span>
                <em>
                  {new Date(item.createdAt).toLocaleString("en-IN")} ·{" "}
                  {item.createdBy?.name || item.createdBy?.email || "System"}
                </em>
              </li>
            ))
          )}
        </ul>
      </section>
    </aside>
  );
}
