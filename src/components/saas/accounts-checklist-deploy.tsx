"use client";

import { useActionState } from "react";
import {
  checklistInitialState,
  deployAccountsChecklistAction,
} from "@/app/app/checklists/actions";

type MemberOption = { id: string; label: string };

export function AccountsChecklistDeployPanel({
  members,
  templateCount,
}: {
  members: MemberOption[];
  templateCount: number;
}) {
  const [state, formAction, pending] = useActionState(
    deployAccountsChecklistAction,
    checklistInitialState,
  );

  if (templateCount > 0) {
    return null;
  }

  return (
    <section className="ws-sf-list-view ws-accounts-deploy-section" aria-label="Deploy accounts pack">
      <header className="ws-sf-list-view-header">
        <div className="ws-sf-list-view-title">
          <h2>Deploy accounts checklist</h2>
        </div>
        <p className="ws-em-section-lead">
          Load 22 classic particulars (GST, TDS, bank recon, ITR, etc.) from the legacy
          accounts sheet format.
        </p>
      </header>
      <div className="ws-sf-card ws-accounts-deploy-card">
        <form action={formAction} className="ws-accounts-deploy-form">
          <label>
            Primary accountability (executive)
            <select name="assigneeUserId" required defaultValue="">
              <option disabled value="">
                Select doer
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Compliance accountability (head / CA) - optional
            <select name="complianceAssigneeUserId" defaultValue="">
              <option value="">Same as primary</option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.label}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary ws-sf-btn-primary" disabled={pending} type="submit">
            {pending ? "Deploying..." : "Deploy accounts pack"}
          </button>
          {state.message ? (
            <p className={state.ok ? "ws-form-msg ok" : "ws-form-msg err"}>{state.message}</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
