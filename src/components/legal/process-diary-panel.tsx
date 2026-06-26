"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  applyProcessDiaryAction,
  initialFileCoverActionState,
} from "@/app/app/cases/file-cover-actions";
import type { LegalCase } from "@prisma/client";
import { fileCoverFromLegalCase } from "@/lib/legal-cases/file-cover";
import {
  clientCallStaleDays,
  lastClientCallDate,
  needsClientCallAlert,
} from "@/lib/legal-cases/case-alerts";
import { needsPublicationAlert } from "@/lib/legal-cases/intake-fields";

export type ProcessDiaryLegalCase = Pick<
  LegalCase,
  | "id"
  | "sectionData"
  | "nextDate"
  | "mccNumber"
  | "coAdvocate"
  | "amdCcStatus"
>;

export function ProcessDiaryPanel({ legalCase }: { legalCase: ProcessDiaryLegalCase }) {
  const router = useRouter();
  const cover = fileCoverFromLegalCase(legalCase);
  const pfRow = cover.pfTracking[0];
  const callStale = needsClientCallAlert(legalCase);
  const callDays = clientCallStaleDays(legalCase);

  const [state, action, pending] = useActionState(
    applyProcessDiaryAction,
    initialFileCoverActionState,
  );
  const [nextDate, setNextDate] = useState(legalCase.nextDate ?? "");
  const [mccNumber, setMccNumber] = useState(legalCase.mccNumber ?? "");
  const [coAdvocate, setCoAdvocate] = useState(legalCase.coAdvocate ?? "");
  const [ownerDriverLawyer, setOwnerDriverLawyer] = useState(
    cover.ownerDriverLawyer ?? "",
  );
  const [odPhone, setOdPhone] = useState(cover.odPhone ?? "");
  const [pfReadyDt, setPfReadyDt] = useState(pfRow?.pfLastDt ?? "");
  const [pfCourtDt, setPfCourtDt] = useState(pfRow?.vikkyDt ?? "");
  const [pfPostDt, setPfPostDt] = useState(pfRow?.postDt ?? "");
  const [clientCallDate, setClientCallDate] = useState("");
  const [clientCallBy, setClientCallBy] = useState("");

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [state.ok, router]);

  function submit(actionName: string) {
    const formData = new FormData();
    formData.set("caseId", legalCase.id);
    formData.set("action", actionName);
    formData.set("nextDate", nextDate);
    formData.set("mccNumber", mccNumber);
    formData.set("coAdvocate", coAdvocate);
    formData.set("ownerDriverLawyer", ownerDriverLawyer);
    formData.set("odPhone", odPhone);
    formData.set("pfReadyDt", pfReadyDt);
    formData.set("pfCourtDt", pfCourtDt);
    formData.set("pfPostDt", pfPostDt);
    formData.set("clientCallDate", clientCallDate);
    formData.set("clientCallBy", clientCallBy);
    action(formData);
  }

  return (
    <section className="legal-process-diary saas-form-panel">
      <h3>Court diary &amp; notice workflow</h3>
      <p>
        Matches the printed court diary (voice note 3 &amp; 6): stage updates, PF notice
        stamps within 10 days, advocate capture, and client call every 30 days.
      </p>

      {needsPublicationAlert(legalCase.amdCcStatus) ? (
        <p className="legal-process-alert legal-process-alert-danger">
          Repeated no-show marks detected ({legalCase.amdCcStatus}) — consider
          publication / ex-parte order (Zahir Suchna).
        </p>
      ) : null}

      {callStale ? (
        <p className="legal-process-alert legal-process-alert-warn">
          Last client call was over 30 days ago
          {lastClientCallDate(legalCase) ? ` (${lastClientCallDate(legalCase)})` : ""}
          {callDays !== null ? ` — ${callDays} days` : ""}. Log a new call below.
        </p>
      ) : null}

      <div className="form-grid-premium">
        <label>
          Next date
          <input value={nextDate} onChange={(event) => setNextDate(event.target.value)} />
        </label>
        <label>
          MCC No.
          <input value={mccNumber} onChange={(event) => setMccNumber(event.target.value)} />
        </label>
        <label>
          Co. advocate (company side)
          <input value={coAdvocate} onChange={(event) => setCoAdvocate(event.target.value)} />
        </label>
        <label>
          Owner/driver lawyer
          <input
            value={ownerDriverLawyer}
            onChange={(event) => setOwnerDriverLawyer(event.target.value)}
          />
        </label>
        <label>
          OD phone
          <input value={odPhone} onChange={(event) => setOdPhone(event.target.value)} />
        </label>
      </div>

      <fieldset className="legal-process-fieldset">
        <legend>PF notice stamps (typed → court → post office)</legend>
        <div className="form-grid-premium">
          <label>
            Notice typed (PF Ready)
            <input value={pfReadyDt} onChange={(event) => setPfReadyDt(event.target.value)} />
          </label>
          <label>
            Court stamp collected
            <input value={pfCourtDt} onChange={(event) => setPfCourtDt(event.target.value)} />
          </label>
          <label>
            Posted at post office
            <input value={pfPostDt} onChange={(event) => setPfPostDt(event.target.value)} />
          </label>
        </div>
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("record_notice_stamps")}
        >
          Save notice dates
        </button>
      </fieldset>

      <fieldset className="legal-process-fieldset">
        <legend>Client call log (every 30 days)</legend>
        <div className="form-grid-premium">
          <label>
            Call date
            <input
              value={clientCallDate}
              onChange={(event) => setClientCallDate(event.target.value)}
              placeholder="e.g. 25-Jun-26"
            />
          </label>
          <label>
            Called by
            <input
              value={clientCallBy}
              onChange={(event) => setClientCallBy(event.target.value)}
            />
          </label>
        </div>
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("record_client_call")}
        >
          Log client call
        </button>
      </fieldset>

      <div className="legal-process-diary-actions">
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("mark_running")}
        >
          Mark RUNNING
        </button>
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("mark_statement")}
        >
          STATEMENT
        </button>
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("mark_stat_done")}
        >
          STAT DONE
        </button>
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("mark_pf")}
        >
          PF notice
        </button>
        <button
          className="btn-cta btn-secondary"
          disabled={pending}
          type="button"
          onClick={() => submit("record_no_show")}
        >
          No-show (B/C/D/E)
        </button>
        <button
          className="btn-cta btn-primary"
          disabled={pending}
          type="button"
          onClick={() => submit("record_appearance")}
        >
          Record appearance
        </button>
      </div>

      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
