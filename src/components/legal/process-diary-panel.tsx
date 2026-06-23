"use client";

import { useActionState, useState } from "react";
import {
  applyProcessDiaryAction,
  initialFileCoverActionState,
} from "@/app/app/cases/file-cover-actions";
import type { LegalCase } from "@prisma/client";

export function ProcessDiaryPanel({ legalCase }: { legalCase: LegalCase }) {
  const [state, action, pending] = useActionState(
    applyProcessDiaryAction,
    initialFileCoverActionState,
  );
  const [nextDate, setNextDate] = useState(legalCase.nextDate ?? "");
  const [mccNumber, setMccNumber] = useState(legalCase.mccNumber ?? "");
  const [coAdvocate, setCoAdvocate] = useState(legalCase.coAdvocate ?? "");
  const [ownerDriverLawyer, setOwnerDriverLawyer] = useState("");
  const [odPhone, setOdPhone] = useState("");

  function submit(actionName: string) {
    const formData = new FormData();
    formData.set("caseId", legalCase.id);
    formData.set("action", actionName);
    formData.set("nextDate", nextDate);
    formData.set("mccNumber", mccNumber);
    formData.set("coAdvocate", coAdvocate);
    formData.set("ownerDriverLawyer", ownerDriverLawyer);
    formData.set("odPhone", odPhone);
    action(formData);
  }

  return (
    <section className="legal-process-diary saas-form-panel">
      <h3>Filing workflow</h3>
      <p>
        Quick actions for RUNNING, STATEMENT, STAT DONE, PF, no-show date roll, and
        advocate capture.
      </p>

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
          Co. advocate
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

      <div className="legal-process-diary-actions">
        <button className="btn-cta btn-secondary" disabled={pending} type="button" onClick={() => submit("mark_running")}>
          Mark RUNNING
        </button>
        <button className="btn-cta btn-secondary" disabled={pending} type="button" onClick={() => submit("mark_statement")}>
          STATEMENT
        </button>
        <button className="btn-cta btn-secondary" disabled={pending} type="button" onClick={() => submit("mark_stat_done")}>
          STAT DONE
        </button>
        <button className="btn-cta btn-secondary" disabled={pending} type="button" onClick={() => submit("mark_pf")}>
          PF notice
        </button>
        <button className="btn-cta btn-secondary" disabled={pending} type="button" onClick={() => submit("record_no_show")}>
          No-show (B/C/D/E)
        </button>
        <button className="btn-cta btn-primary" disabled={pending} type="button" onClick={() => submit("record_appearance")}>
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
