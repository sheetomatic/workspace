"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type FieldConveyanceClaimView = {
  id: string;
  claimantUserId: string;
  claimantName: string;
  visitId: string | null;
  visitName: string | null;
  claimDate: string;
  claimedDistanceKm: number;
  amount: number;
  journeyDetails: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  revision: number;
  reviewedByUserId: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  paidByName: string | null;
  paidAt: string | null;
  paymentReference: string | null;
  attachments: Array<{
    id: string;
    kind: "JOURNEY_PROOF" | "BILL";
    submissionRound: number;
    fileName: string;
    downloadUrl: string;
  }>;
  auditEvents: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actorName: string;
  }>;
};

type VisitOption = { id: string; clientName: string; plannedAt: string | null };
type Estimate = { distanceKm: number | null; acceptedPoints: number; omittedGaps: number };

function statusLabel(status: FieldConveyanceClaimView["status"]) {
  switch (status) {
    case "PENDING": return "Pending manager review";
    case "APPROVED": return "Approved · waiting for Accounts";
    case "REJECTED": return "Rejected · resubmission needed";
    case "PAID": return "Paid · reference recorded";
  }
}

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
  });
}

function StatusBadge({ status }: { status: FieldConveyanceClaimView["status"] }) {
  return <span className={`ws-hr-live-badge conveyance-status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}

function ClaimForm({
  claim,
  visits,
  submitting,
  onSubmit,
}: {
  claim?: FieldConveyanceClaimView;
  visits: VisitOption[];
  submitting: boolean;
  onSubmit: (form: FormData) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(new FormData(event.currentTarget));
  }

  return (
    <form className="ws-hr-form conveyance-claim-form" onSubmit={submit}>
      {claim ? <input type="hidden" name="claimId" value={claim.id} /> : null}
      <label>
        Travel date (India time)
        <input name="claimDate" type="date" defaultValue={claim?.claimDate} required />
      </label>
      <label>
        Related visit (optional)
        <select name="visitId" defaultValue={claim?.visitId ?? ""}>
          <option value="">Other / travel between visits</option>
          {visits.map((visit) => (
            <option key={visit.id} value={visit.id}>{visit.clientName}</option>
          ))}
        </select>
      </label>
      <label>
        Claimed distance in km (self-reported)
        <input
          name="claimedDistanceKm"
          type="number"
          min="0.01"
          max="5000"
          step="0.01"
          defaultValue={claim?.claimedDistanceKm}
          required
        />
      </label>
      <label>
        Conveyance amount (₹)
        <input
          name="amount"
          type="number"
          min="0.01"
          max="1000000"
          step="0.01"
          defaultValue={claim?.amount}
          required
        />
      </label>
      <label className="conveyance-full-width">
        Journey details
        <textarea
          name="journeyDetails"
          rows={3}
          minLength={5}
          maxLength={2000}
          defaultValue={claim?.journeyDetails}
          placeholder="From / to, purpose, travel mode, and any details for review"
          required
        />
      </label>
      <label>
        Journey proof (required)
        <input
          name="journeyProof"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
        />
        <small>Route, ticket, or other journey evidence · PDF/JPG/PNG/WEBP · max 8 MB.</small>
      </label>
      <label>
        Bill / receipt (required)
        <input
          name="bill"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          required
        />
        <small>Attach the bill for the amount claimed · max 8 MB.</small>
      </label>
      <button className="btn-cta btn-primary conveyance-full-width" type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : claim ? "Resubmit updated claim" : "Submit conveyance claim"}
      </button>
    </form>
  );
}

export function FieldConveyanceWorkspace({
  actorUserId,
  canApprove,
  canPay,
  claims,
  visits,
  todayEstimate,
}: {
  actorUserId: string;
  canApprove: boolean;
  canPay: boolean;
  claims: FieldConveyanceClaimView[];
  visits: VisitOption[];
  todayEstimate: Estimate;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function submitClaim(form: FormData) {
    setSubmitting(true);
    setMessage(null);
    setIsError(false);
    try {
      const response = await fetch("/api/hr/field/conveyance", { method: "POST", body: form });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not submit claim.");
      setMessage("Claim submitted for Manager review.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not submit claim.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function reviewClaim(
    claimId: string,
    decision: "APPROVED" | "REJECTED",
    reason: string,
  ) {
    setSubmitting(true);
    setMessage(null);
    setIsError(false);
    try {
      const response = await fetch(`/api/hr/field/conveyance/${claimId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not review claim.");
      setMessage(decision === "APPROVED" ? "Claim approved and moved to Accounts." : "Claim rejected with your reason recorded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not review claim.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function recordPayment(claimId: string, paymentReference: string) {
    setSubmitting(true);
    setMessage(null);
    setIsError(false);
    try {
      const response = await fetch(`/api/hr/field/conveyance/${claimId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentReference }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not record payment.");
      setMessage(result.message ?? "Payment status recorded.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record payment.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function newestAttachment(claim: FieldConveyanceClaimView, kind: "JOURNEY_PROOF" | "BILL") {
    return claim.attachments.find((attachment) => attachment.kind === kind) ?? null;
  }

  return (
    <div className="ws-hr-page field-conveyance-page">
      {message ? <p className={isError ? "ws-hr-feedback-error" : "ws-hr-feedback-success"} role={isError ? "alert" : "status"}>{message}</p> : null}

      <section className="ws-hr-panel">
        <div className="ws-ims-panel-head">
          <h2>Distance recorded today</h2>
          <span className="ws-apple-cell-secondary">Asia/Kolkata</span>
        </div>
        <p className="ws-hr-help">
          {todayEstimate.distanceKm == null
            ? "Not enough continuous GPS samples for a route estimate."
            : `${todayEstimate.distanceKm.toFixed(2)} km partial recorded path estimate.`}
          {" "}Based on live GPS pings captured about every 45 seconds while the Field page is open. Straight-line segments over 3-minute gaps, inaccurate points, and mock points are omitted. This is not full-day mileage or an odometer reading.
        </p>
        <p className="ws-hr-help">
          Conveyance distance below is a separate self-reported claim for Manager review; Accounts only records payment after approval.
        </p>
      </section>

      <section className="ws-hr-panel">
        <h2>Submit a conveyance claim</h2>
        <p className="ws-hr-help">Claimed kilometres and amount are manually entered. Attach both journey evidence and the bill; an approver will verify them.</p>
        <ClaimForm visits={visits} submitting={submitting} onSubmit={submitClaim} />
      </section>

      {canApprove ? (
        <section className="ws-hr-panel">
          <h2>Manager / Director review</h2>
          <p className="ws-hr-help">Director access uses existing Admin or Owner roles. Review distance and proof before approving or rejecting; you cannot approve your own claim.</p>
          <ClaimCards
            claims={claims.filter((claim) => claim.status === "PENDING")}
            actorUserId={actorUserId}
            canApprove
            canPay={false}
            submitting={submitting}
            onReview={reviewClaim}
            onPayment={recordPayment}
            onSubmit={submitClaim}
            visits={visits}
            newestAttachment={newestAttachment}
          />
        </section>
      ) : null}

      {canPay ? (
        <section className="ws-hr-panel">
          <h2>Accounts payment processing</h2>
          <p className="ws-hr-help">Only approved claims appear here. Recording a payment reference updates the ledger status; it does not initiate a bank transfer or payout.</p>
          <ClaimCards
            claims={claims.filter((claim) => claim.status === "APPROVED" || claim.status === "PAID")}
            actorUserId={actorUserId}
            canApprove={false}
            canPay
            submitting={submitting}
            onReview={reviewClaim}
            onPayment={recordPayment}
            onSubmit={submitClaim}
            visits={visits}
            newestAttachment={newestAttachment}
          />
        </section>
      ) : null}

      <section className="ws-hr-panel">
        <h2>Claim history</h2>
        <ClaimCards
          claims={claims.filter((claim) => claim.claimantUserId === actorUserId)}
          actorUserId={actorUserId}
          canApprove={false}
          canPay={false}
          submitting={submitting}
          onReview={reviewClaim}
          onPayment={recordPayment}
          onSubmit={submitClaim}
          visits={visits}
          newestAttachment={newestAttachment}
        />
      </section>
    </div>
  );
}

function ClaimCards({
  claims,
  actorUserId,
  canApprove,
  canPay,
  submitting,
  onReview,
  onPayment,
  onSubmit,
  visits,
  newestAttachment,
}: {
  claims: FieldConveyanceClaimView[];
  actorUserId: string;
  canApprove: boolean;
  canPay: boolean;
  submitting: boolean;
  onReview: (claimId: string, decision: "APPROVED" | "REJECTED", reason: string) => void;
  onPayment: (claimId: string, reference: string) => void;
  onSubmit: (form: FormData) => void;
  visits: VisitOption[];
  newestAttachment: (claim: FieldConveyanceClaimView, kind: "JOURNEY_PROOF" | "BILL") => FieldConveyanceClaimView["attachments"][number] | null;
}) {
  if (claims.length === 0) return <p className="ws-hr-help">No claims in this section yet.</p>;

  return (
    <div className="field-conveyance-claims">
      {claims.map((claim) => {
        const journey = newestAttachment(claim, "JOURNEY_PROOF");
        const bill = newestAttachment(claim, "BILL");
        const selfReview = claim.claimantUserId === actorUserId;
        const canRecord = canPay && claim.status === "APPROVED" && !selfReview && claim.reviewedByUserId !== actorUserId;
        return (
          <article className="field-conveyance-claim" key={claim.id}>
            <div className="ws-ims-panel-head">
              <div>
                <strong>{claim.claimantName}</strong>
                <p className="ws-hr-help">{dateLabel(claim.claimDate)} · {claim.visitName ?? "Unlinked journey"}</p>
              </div>
              <StatusBadge status={claim.status} />
            </div>
            <dl className="field-conveyance-facts">
              <div><dt>Claimed distance</dt><dd>{claim.claimedDistanceKm.toFixed(2)} km · self-reported</dd></div>
              <div><dt>Amount</dt><dd>₹{claim.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</dd></div>
              <div><dt>Journey</dt><dd>{claim.journeyDetails}</dd></div>
              {claim.reviewerName ? <div><dt>Reviewed by</dt><dd>{claim.reviewerName}</dd></div> : null}
              {claim.rejectionReason ? <div><dt>Rejection reason</dt><dd>{claim.rejectionReason}</dd></div> : null}
              {claim.status === "PAID" ? (
                <div><dt>Payment recorded</dt><dd>{claim.paymentReference} · {dateLabel(claim.paidAt)}</dd></div>
              ) : null}
            </dl>
            <div className="field-conveyance-documents">
              {journey ? <a href={journey.downloadUrl}>Journey proof · rev {journey.submissionRound}</a> : <span>Journey proof missing</span>}
              {bill ? <a href={bill.downloadUrl}>Bill · rev {bill.submissionRound}</a> : <span>Bill missing</span>}
            </div>

            {canApprove && claim.status === "PENDING" && !selfReview ? (
              <ReviewControls claimId={claim.id} submitting={submitting} onReview={onReview} />
            ) : null}
            {canApprove && claim.status === "PENDING" && selfReview ? (
              <p className="ws-hr-help">You submitted this claim and cannot review it.</p>
            ) : null}
            {canRecord ? (
              <PaymentControls claimId={claim.id} submitting={submitting} onPayment={onPayment} />
            ) : null}
            {canPay && claim.status === "APPROVED" && !canRecord ? (
              <p className="ws-hr-help">Payment recording must be completed by an Accounts user different from the claimant and reviewer.</p>
            ) : null}
            {claim.status === "REJECTED" && selfReview ? (
              <details className="field-conveyance-resubmit">
                <summary>Update details and resubmit</summary>
                <ClaimForm claim={claim} visits={visits} submitting={submitting} onSubmit={onSubmit} />
              </details>
            ) : null}

            {claim.auditEvents.length ? (
              <details className="field-conveyance-audit">
                <summary>Audit history ({claim.auditEvents.length})</summary>
                <ol>
                  {claim.auditEvents.map((event) => (
                    <li key={event.id}>
                      <strong>{event.action}</strong> · {event.actorName} · {dateLabel(event.createdAt)}
                      {event.note ? <p>{event.note}</p> : null}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function ReviewControls({
  claimId,
  submitting,
  onReview,
}: {
  claimId: string;
  submitting: boolean;
  onReview: (claimId: string, decision: "APPROVED" | "REJECTED", reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <div className="field-conveyance-controls">
      <label>
        Review note / rejection reason
        <textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={2} placeholder="Required when rejecting" />
      </label>
      <button className="btn-cta btn-primary" disabled={submitting} onClick={() => onReview(claimId, "APPROVED", reason.trim())} type="button">Approve</button>
      <button className="btn-cta btn-secondary" disabled={submitting || reason.trim().length < 5} onClick={() => onReview(claimId, "REJECTED", reason.trim())} type="button">Reject with reason</button>
    </div>
  );
}

function PaymentControls({
  claimId,
  submitting,
  onPayment,
}: {
  claimId: string;
  submitting: boolean;
  onPayment: (claimId: string, reference: string) => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onPayment(claimId, String(form.get("paymentReference") ?? "").trim());
  }
  return (
    <form className="field-conveyance-controls" onSubmit={submit}>
      <label>
        Payment reference
        <input name="paymentReference" type="text" maxLength={100} required placeholder="UTR / accounting reference" />
      </label>
      <button className="btn-cta btn-primary" type="submit" disabled={submitting}>Record payment</button>
    </form>
  );
}
