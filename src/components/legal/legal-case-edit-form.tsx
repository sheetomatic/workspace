"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  initialLegalCasesSettingsState,
} from "@/app/app/cases/settings-types";
import {
  updateLegalCaseFromSettingsAction,
} from "@/app/app/cases/settings-actions";

const STATUS_OPTIONS = ["RUNNING", "CLOSED", "ORDER", "APPEAL FILED"];

type EditableLegalCase = {
  id: string;
  fileNumber: string;
  mccNumber: string | null;
  applicant: string | null;
  nonApplicant: string | null;
  category: string | null;
  caseStage: string | null;
  fileStatus: string | null;
  court: string | null;
  company: string | null;
  coAdvocate: string | null;
  prevDate: string | null;
  nextDate: string | null;
  remarks: string | null;
  amdCcStatus: string | null;
  fNo: string | null;
  s2Responsible: string | null;
  s3Responsible: string | null;
  s4Responsible: string | null;
  s5Responsible: string | null;
  s6Responsible: string | null;
  s7Responsible: string | null;
};

export function LegalCaseEditForm({
  legalCase,
  onCancel,
  onSaved,
}: {
  legalCase: EditableLegalCase;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [state, action, pending] = useActionState(
    updateLegalCaseFromSettingsAction,
    initialLegalCasesSettingsState,
  );
  const savedRef = useRef(false);

  useEffect(() => {
    if (state.ok && state.message && !savedRef.current) {
      savedRef.current = true;
      onSaved();
    }
  }, [state.ok, state.message, onSaved]);

  return (
    <form action={action} className="legal-case-edit-form saas-form-panel">
      <input name="caseId" type="hidden" value={legalCase.id} />
      <div className="legal-case-edit-form-head">
        <h3>Edit file {legalCase.fileNumber}</h3>
        <button className="btn-ghost" disabled={pending} type="button" onClick={onCancel}>
          Close
        </button>
      </div>

      <div className="form-grid-premium">
        <label>
          File No.
          <input defaultValue={legalCase.fileNumber} name="fileNumber" required type="text" />
        </label>
        <label>
          MCC No.
          <input defaultValue={legalCase.mccNumber ?? ""} name="mccNumber" type="text" />
        </label>
        <label>
          Applicant
          <input defaultValue={legalCase.applicant ?? ""} name="applicant" type="text" />
        </label>
        <label>
          Non-applicant
          <input defaultValue={legalCase.nonApplicant ?? ""} name="nonApplicant" type="text" />
        </label>
        <label>
          Category
          <input defaultValue={legalCase.category ?? ""} name="category" type="text" />
        </label>
        <label>
          Status
          <select defaultValue={legalCase.fileStatus ?? ""} name="fileStatus">
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
          <input defaultValue={legalCase.caseStage ?? ""} name="caseStage" type="text" />
        </label>
        <label>
          Court
          <input defaultValue={legalCase.court ?? ""} name="court" type="text" />
        </label>
        <label>
          Company
          <input defaultValue={legalCase.company ?? ""} name="company" type="text" />
        </label>
        <label>
          Co. advocate
          <input defaultValue={legalCase.coAdvocate ?? ""} name="coAdvocate" type="text" />
        </label>
        <label>
          Previous date
          <input defaultValue={legalCase.prevDate ?? ""} name="prevDate" type="text" />
        </label>
        <label>
          Next date
          <input defaultValue={legalCase.nextDate ?? ""} name="nextDate" type="text" />
        </label>
        <label>
          F-No
          <input defaultValue={legalCase.fNo ?? ""} name="fNo" type="text" />
        </label>
        <label>
          AMD &amp; CC status
          <input defaultValue={legalCase.amdCcStatus ?? ""} name="amdCcStatus" type="text" />
        </label>
        <label className="legal-case-edit-span2">
          Remarks
          <input defaultValue={legalCase.remarks ?? ""} name="remarks" type="text" />
        </label>
        <label>
          S2 assignee
          <input defaultValue={legalCase.s2Responsible ?? ""} name="s2Responsible" type="text" />
        </label>
        <label>
          S3 assignee
          <input defaultValue={legalCase.s3Responsible ?? ""} name="s3Responsible" type="text" />
        </label>
        <label>
          S4 assignee
          <input defaultValue={legalCase.s4Responsible ?? ""} name="s4Responsible" type="text" />
        </label>
        <label>
          S5 assignee
          <input defaultValue={legalCase.s5Responsible ?? ""} name="s5Responsible" type="text" />
        </label>
        <label>
          S6 assignee
          <input defaultValue={legalCase.s6Responsible ?? ""} name="s6Responsible" type="text" />
        </label>
        <label>
          S7 assignee
          <input defaultValue={legalCase.s7Responsible ?? ""} name="s7Responsible" type="text" />
        </label>
      </div>

      <div className="legal-cases-settings-actions">
        <button className="btn-cta btn-primary" disabled={pending} type="submit">
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button className="btn-cta btn-secondary" disabled={pending} type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {state.message && !state.ok ? (
        <p className="saas-form-message error">{state.message}</p>
      ) : null}
    </form>
  );
}
