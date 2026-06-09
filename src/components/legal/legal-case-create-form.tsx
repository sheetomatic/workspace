"use client";

import { useActionState } from "react";
import {
  createLegalCase,
  initialLegalCaseActionState,
} from "@/app/app/cases/actions";

const STATUS_OPTIONS = ["RUNNING", "CLOSED", "ORDER", "APPEAL FILED"];

export function LegalCaseCreateForm({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState(
    createLegalCase,
    initialLegalCaseActionState,
  );

  return (
    <form action={action} className="legal-create-form saas-form-panel">
      <h3>New case</h3>
      <p className="legal-create-lead">
        File No. and MCC No. together identify a case. Leave section codes blank if
        not assigned yet.
      </p>
      <div className="form-grid-premium">
        <label>
          File No.
          <input name="fileNumber" placeholder="16634" required type="text" />
        </label>
        <label>
          MCC No.
          <input name="mccNumber" placeholder="4465/25" type="text" />
        </label>
        <label>
          Applicant
          <input name="applicant" placeholder="Applicant name" type="text" />
        </label>
        <label>
          Non-applicant
          <input name="nonApplicant" placeholder="Optional" type="text" />
        </label>
        <label>
          Category
          <input name="category" placeholder="SI, F, GI..." type="text" />
        </label>
        <label>
          Status
          <select defaultValue="RUNNING" name="fileStatus">
            <option value="">Unset</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stage
          <input name="caseStage" placeholder="PF OD, P-1..." type="text" />
        </label>
        <label>
          Court
          <input name="court" placeholder="21nd" type="text" />
        </label>
        <label>
          Company
          <input name="company" placeholder="Insurer" type="text" />
        </label>
        <label>
          Next date
          <input name="nextDate" placeholder="30-Apr-24" type="text" />
        </label>
        <label>
          S2 assignee
          <input name="s2Responsible" placeholder="SHYAM" type="text" />
        </label>
        <label>
          S3 assignee
          <input name="s3Responsible" placeholder="MT" type="text" />
        </label>
        <label>
          S4 assignee
          <input name="s4Responsible" type="text" />
        </label>
        <label>
          S5 assignee
          <input name="s5Responsible" type="text" />
        </label>
        <label>
          S6 assignee
          <input name="s6Responsible" type="text" />
        </label>
        <label>
          S7 assignee
          <input name="s7Responsible" type="text" />
        </label>
        <label className="form-field-full">
          Remarks
          <textarea name="remarks" placeholder="Optional notes" rows={2} />
        </label>
      </div>
      <div className="form-actions">
        <button className="btn-cta btn-primary" disabled={pending} type="submit">
          {pending ? "Creating..." : "Create case"}
        </button>
        <button className="btn-cta btn-ghost" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
