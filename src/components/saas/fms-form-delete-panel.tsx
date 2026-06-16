"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteFmsFormAction } from "@/app/app/fms/actions";
import { fmsInitialState } from "@/lib/fms-action-state";

export function FmsFormDeletePanel({
  formId,
  formName,
  submissionCount,
  hasWorkflow,
}: {
  formId: string;
  formName: string;
  submissionCount: number;
  hasWorkflow: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [state, formAction, pending] = useActionState(
    deleteFmsFormAction,
    fmsInitialState,
  );

  if (!open) {
    return (
      <button
        type="button"
        className="btn-secondary btn-sm ws-fms-delete-trigger"
        onClick={() => setOpen(true)}
      >
        <Trash2 size={14} aria-hidden />
        Delete form
      </button>
    );
  }

  return (
    <div className="ws-fms-delete-panel">
      <p className="ws-fms-delete-warning">
        <strong>Delete this form permanently?</strong> This removes the intake
        form
        {hasWorkflow ? ", linked workflow," : ""} all {submissionCount}{" "}
        submission{submissionCount === 1 ? "" : "s"}, and any active jobs tied to
        it. This cannot be undone.
      </p>
      <form action={formAction} className="ws-fms-delete-form">
        <input type="hidden" name="formId" value={formId} />
        <label className="ws-fms-delete-confirm">
          Type <strong>{formName}</strong> to confirm
          <input
            name="confirmName"
            value={confirmName}
            onChange={(event) => setConfirmName(event.target.value)}
            placeholder={formName}
            autoComplete="off"
          />
        </label>
        {state.message && !state.ok ? (
          <p className="saas-form-message error" role="alert">
            {state.message}
          </p>
        ) : null}
        <div className="ws-fms-delete-actions">
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => {
              setOpen(false);
              setConfirmName("");
            }}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-secondary btn-sm ws-fms-delete-submit"
            disabled={pending || confirmName !== formName}
          >
            {pending ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </form>
    </div>
  );
}
