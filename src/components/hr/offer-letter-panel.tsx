"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createOfferLetterAction,
  sendOfferLetterAction,
  withdrawOfferLetterAction,
} from "@/lib/hr/hr-actions";
import { HrFeedbackBanner } from "@/components/hr/hr-feedback";
import { offerStatusLabel } from "@/lib/hr/offer-letter-labels";

export type OfferCandidateOption = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  stage: string;
  roleTitle: string;
};

export type OfferLetterListItem = {
  id: string;
  roleTitle: string;
  status: string;
  ctcAnnual: number | null;
  ctcMonthly: number | null;
  joiningDate: string | null;
  offerValidUntil: string | null;
  probationMonths: number;
  publicUrl: string | null;
  waHref: string | null;
  sentAt: string | null;
  candidate: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string | null;
    stage: string;
  };
};

function isoInput(date: Date, daysAhead = 0) {
  const d = new Date(date);
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
}

export function OfferLetterPanel({
  candidates,
  offers,
  canManage,
}: {
  candidates: OfferCandidateOption[];
  offers: OfferLetterListItem[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    candidates[0]?.id ?? "",
  );
  const [lastLink, setLastLink] = useState<string | null>(null);

  const selected = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );

  if (!canManage) {
    return (
      <section className="ws-hr-panel">
        <h2>Offer letters</h2>
        <p className="ws-hr-note">Only admins can draft and send offer letters.</p>
        <OfferLetterTable offers={offers} canManage={false} />
      </section>
    );
  }

  function onCreate(formData: FormData) {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      setLastLink(null);
      const result = await createOfferLetterAction(formData);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(result.message ?? "Offer drafted.");
      setIsError(false);
      setFormKey((key) => key + 1);
      router.refresh();
    });
  }

  function onSend(offerId: string, channel: "EMAIL" | "LINK") {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await sendOfferLetterAction(offerId, channel);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(String(result.message ?? "Offer sent."));
      setIsError(false);
      if (typeof result.publicUrl === "string") {
        setLastLink(result.publicUrl);
      }
      if (channel === "LINK" && typeof result.waHref === "string" && result.waHref) {
        window.open(result.waHref, "_blank", "noopener,noreferrer");
      }
      router.refresh();
    });
  }

  function onWithdraw(offerId: string) {
    if (!window.confirm("Withdraw this offer?")) return;
    startTransition(async () => {
      const result = await withdrawOfferLetterAction(offerId);
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(result.message ?? "Offer withdrawn.");
      setIsError(false);
      router.refresh();
    });
  }

  return (
    <section className="ws-hr-panel" id="offer-letters">
      <h2>Offer letters</h2>
      <p className="ws-hr-note">
        Standard flow: draft offer (role, CTC, joining date, probation) → send
        email or WhatsApp link → candidate accepts or declines on a secure page.
        Appointment and confirmation letters come after joining (phase 2).
      </p>
      <HrFeedbackBanner message={message} isError={isError} />
      {lastLink ? (
        <p className="ws-hr-note">
          Candidate link:{" "}
          <a href={lastLink} target="_blank" rel="noreferrer">
            {lastLink}
          </a>
        </p>
      ) : null}

      <form
        key={`offer-${formKey}`}
        action={onCreate}
        className="ws-hr-form ws-offer-form"
      >
        <label>
          Candidate
          <select
            name="candidateId"
            required
            value={selectedCandidateId}
            onChange={(event) => setSelectedCandidateId(event.target.value)}
          >
            {candidates.length === 0 ? (
              <option value="">Add a candidate first</option>
            ) : (
              candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.fullName}
                  {candidate.roleTitle ? ` · ${candidate.roleTitle}` : ""}
                  {` · ${candidate.stage}`}
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Role / designation
          <input
            name="roleTitle"
            type="text"
            required
            defaultValue={selected?.roleTitle || ""}
            placeholder="e.g. MIS Executive"
          />
        </label>
        <label>
          Department
          <input name="department" type="text" placeholder="e.g. Operations" />
        </label>
        <label>
          Employment type
          <select name="employmentType" defaultValue="FULL_TIME">
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
          </select>
        </label>
        <label>
          Annual CTC (₹)
          <input name="ctcAnnual" type="number" min="0" step="1" placeholder="480000" />
        </label>
        <label>
          Monthly CTC (₹)
          <input name="ctcMonthly" type="number" min="0" step="1" placeholder="40000" />
        </label>
        <label>
          Joining date
          <input
            name="joiningDate"
            type="date"
            defaultValue={isoInput(new Date(), 14)}
          />
        </label>
        <label>
          Offer valid until
          <input
            name="offerValidUntil"
            type="date"
            defaultValue={isoInput(new Date(), 7)}
          />
        </label>
        <label>
          Probation (months)
          <input
            name="probationMonths"
            type="number"
            min="1"
            max="24"
            defaultValue={6}
          />
        </label>
        <label>
          Work location
          <input name="workLocation" type="text" placeholder="Office / Hybrid / City" />
        </label>
        <label>
          Reporting to
          <input name="reportingTo" type="text" placeholder="Manager name / title" />
        </label>
        <label className="form-field-full">
          Benefits / other notes
          <textarea
            name="benefitsNotes"
            rows={3}
            placeholder="PF, medical insurance, leave policy summary, notice period, etc."
          />
        </label>
        <button
          type="submit"
          className="btn-cta btn-primary"
          disabled={pending || candidates.length === 0}
        >
          {pending ? "Saving…" : "Draft offer letter"}
        </button>
      </form>

      <OfferLetterTable
        offers={offers}
        canManage
        pending={pending}
        onSend={onSend}
        onWithdraw={onWithdraw}
      />
    </section>
  );
}

function OfferLetterTable({
  offers,
  canManage,
  pending = false,
  onSend,
  onWithdraw,
}: {
  offers: OfferLetterListItem[];
  canManage: boolean;
  pending?: boolean;
  onSend?: (offerId: string, channel: "EMAIL" | "LINK") => void;
  onWithdraw?: (offerId: string) => void;
}) {
  return (
    <div className="ws-hr-table-wrap" style={{ marginTop: "1.25rem" }}>
      <table className="ws-hr-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joining</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {offers.length === 0 ? (
            <tr>
              <td colSpan={5}>No offer letters yet.</td>
            </tr>
          ) : (
            offers.map((offer) => (
              <tr key={offer.id}>
                <td>
                  <strong>{offer.candidate.fullName}</strong>
                  <div className="ws-hr-note">
                    {[offer.candidate.email, offer.candidate.phone]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </div>
                </td>
                <td>{offer.roleTitle}</td>
                <td>{offerStatusLabel(offer.status as never)}</td>
                <td>
                  {offer.joiningDate
                    ? new Date(offer.joiningDate).toLocaleDateString("en-IN")
                    : "—"}
                </td>
                <td>
                  {canManage ? (
                    <div className="ws-offer-actions">
                      {offer.status === "DRAFT" || offer.status === "SENT" || offer.status === "DECLINED" ? (
                        <>
                          <button
                            type="button"
                            className="btn-primary btn-sm"
                            disabled={pending}
                            onClick={() => onSend?.(offer.id, "EMAIL")}
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            disabled={pending}
                            onClick={() => onSend?.(offer.id, "LINK")}
                          >
                            Link / WA
                          </button>
                        </>
                      ) : null}
                      {offer.publicUrl ? (
                        <a
                          className="btn-secondary btn-sm"
                          href={offer.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      ) : null}
                      {offer.status !== "ACCEPTED" && offer.status !== "WITHDRAWN" ? (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          disabled={pending}
                          onClick={() => onWithdraw?.(offer.id)}
                        >
                          Withdraw
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    offerStatusLabel(offer.status as never)
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
