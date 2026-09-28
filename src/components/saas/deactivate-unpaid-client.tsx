"use client";

import { useActionState } from "react";
import { manageClientWorkspaceAction } from "@/app/app/team/platform-actions";

const initial = { ok: false, message: "" };

export function DeactivateUnpaidClient({
  workspaceId,
  clientName,
  status,
  unpaid,
}: {
  workspaceId: string;
  clientName: string;
  status: string;
  unpaid: boolean;
}) {
  const [state, action, pending] = useActionState(
    manageClientWorkspaceAction,
    initial,
  );
  const inactive = status === "INACTIVE";
  if (!inactive && !unpaid) return null;

  return (
    <form
      action={action}
      className="ws-unpaid-client"
      onSubmit={(event) => {
        if (inactive) return;
        if (
          !window.confirm(
            `Deactivate ${clientName}? Their team will see a deactivated screen and cannot use the workspace until you activate them.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input name="workspaceId" type="hidden" value={workspaceId} />
      <input name="intent" type="hidden" value={inactive ? "activate" : "deactivate"} />
      <button
        className={
          inactive
            ? "ws-client-action ws-client-action--primary"
            : "ws-client-action ws-client-action--danger"
        }
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Saving…"
          : inactive
            ? "Activate client"
            : "Deactivate — not paying"}
      </button>
      {state.message ? (
        <p className={state.ok ? "saas-form-success" : "saas-form-error"}>{state.message}</p>
      ) : inactive ? (
        <p className="saas-panel-lead">This client is deactivated. Activate them after payment.</p>
      ) : (
        <p className="saas-panel-lead">
          Open invoices are unpaid. Deactivate to stop their team using the workspace.
        </p>
      )}
    </form>
  );
}
