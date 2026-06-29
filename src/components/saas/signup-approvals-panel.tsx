"use client";

import { useActionState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import {
  activateSignupWorkspaceAction,
  type SignupApprovalActionState,
} from "@/app/app/approvals/signup-actions";
import { formatPendingAge } from "@/lib/workspace-format";
import type { PendingWorkspaceSignup } from "@/lib/pending-workspace-signups";

const initialState: SignupApprovalActionState = { ok: false, message: "" };

export function SignupApprovalsPanel({
  workspaces,
}: {
  workspaces: PendingWorkspaceSignup[];
}) {
  const [state, formAction, pending] = useActionState(
    activateSignupWorkspaceAction,
    initialState,
  );

  return (
    <section className="ws-sf-list-view ws-signup-approvals-section" aria-label="Pending signups">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <UserPlus size={18} aria-hidden />
          <h2>Workspace signups</h2>
          <span className="ws-sf-list-view-count">{workspaces.length}</span>
        </div>
        <p className="ws-em-section-lead">
          New clients stay on the activation hold screen until you approve their
          workspace here.
        </p>
      </header>

      {state.message ? (
        <p className={state.ok ? "saas-form-message ok" : "saas-form-message error"}>
          {state.message}
        </p>
      ) : null}

      {workspaces.length === 0 ? (
        <div className="ws-empty-state">
          <p>No pending workspace signups.</p>
        </div>
      ) : (
        <div className={`saas-list-card ${pending ? "is-updating" : ""}`}>
          {workspaces.map((workspace) => (
            <article className="saas-list-row" key={workspace.id}>
              <div className="saas-list-icon" aria-hidden />
              <div className="saas-list-body">
                <h3>{workspace.name}</h3>
                <p>
                  {workspace.ownerEmail ?? "No owner email"} | {workspace.slug} |
                  signed up {formatPendingAge(workspace.createdAt)}
                </p>
              </div>
              <form action={formAction} className="saas-list-actions">
                <input name="workspaceSlug" type="hidden" value={workspace.slug} />
                <button
                  className="btn-cta btn-primary ws-sf-btn-primary"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={14} aria-hidden />
                      Activating...
                    </span>
                  ) : (
                    "Activate workspace"
                  )}
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
