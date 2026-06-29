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
    <section className="saas-panel ws-accounts-deploy">
      <h3>Deploy accounts checklist</h3>
      <p className="type-body-sm text-slate-500">
        Load 22 classic particulars (GST, TDS, bank recon, ITR, etc.) from the legacy
        accounts sheet format.
      </p>
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
        <button className="btn-primary" disabled={pending} type="submit">
          {pending ? "Deploying..." : "Deploy accounts pack"}
        </button>
        {state.message ? (
          <p className={state.ok ? "ws-form-msg ok" : "ws-form-msg err"}>{state.message}</p>
        ) : null}
      </form>
    </section>
  );
}
