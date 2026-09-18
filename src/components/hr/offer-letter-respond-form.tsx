"use client";

import { useState, useTransition } from "react";
import { respondToOfferLetterAction } from "@/lib/hr/hr-actions";

export function OfferLetterRespondForm({
  token,
  canRespond,
}: {
  token: string;
  canRespond: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [done, setDone] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  if (!canRespond || done) {
    return message ? (
      <p className={isError ? "hr-offer-msg is-error" : "hr-offer-msg is-ok"}>
        {message}
      </p>
    ) : null;
  }

  function respond(decision: "ACCEPT" | "DECLINE") {
    startTransition(async () => {
      setMessage(null);
      setIsError(false);
      const result = await respondToOfferLetterAction({
        token,
        decision,
        declineReason: decision === "DECLINE" ? declineReason : undefined,
      });
      if (!result.ok) {
        setMessage(result.message);
        setIsError(true);
        return;
      }
      setMessage(result.message ?? "Response recorded.");
      setIsError(false);
      setDone(true);
    });
  }

  return (
    <div className="hr-offer-respond">
      <button
        type="button"
        className="btn-cta btn-primary"
        disabled={pending}
        onClick={() => respond("ACCEPT")}
      >
        {pending ? "Saving…" : "Accept offer"}
      </button>
      <div className="hr-offer-decline">
        <label>
          Decline reason (optional)
          <textarea
            value={declineReason}
            onChange={(event) => setDeclineReason(event.target.value)}
            rows={2}
            placeholder="e.g. Accepted another offer"
          />
        </label>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => respond("DECLINE")}
        >
          Decline offer
        </button>
      </div>
      {message ? (
        <p className={isError ? "hr-offer-msg is-error" : "hr-offer-msg is-ok"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
