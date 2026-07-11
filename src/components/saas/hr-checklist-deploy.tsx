"use client";

import { useActionState } from "react";
import {
  checklistInitialState,
  deployHrChecklistAction,
} from "@/app/app/checklists/actions";
import type { HrFocusId } from "@/lib/checklists/hr-checklist-catalog";

type MemberOption = { id: string; label: string };

export function HrChecklistDeployPanel({
  members,
  focusId,
  focusLabel,
}: {
  members: MemberOption[];
  focusId?: HrFocusId | null;
  focusLabel?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    deployHrChecklistAction,
    checklistInitialState,
  );

  const scoped = Boolean(focusId && focusLabel);
  const title = scoped
    ? `Install ${focusLabel} templates`
    : "Install HR checklist pack";
  const lead = scoped
    ? `Add suggested ${focusLabel} Process Checklists with owner, schedule, and proof.`
    : "Load onboarding, attendance, leave, and policy Process Checklists in one step.";
  const buttonLabel = scoped
    ? pending
      ? "Installing..."
      : `Install ${focusLabel}`
    : pending
      ? "Installing..."
      : "Install HR pack";

  return (
    <div className="ws-hr-checklist-deploy-card" aria-label={title}>
      <div className="ws-hr-checklist-deploy-copy">
        <strong>{title}</strong>
        <p>{lead}</p>
      </div>
      <form action={formAction} className="ws-hr-checklist-deploy-form">
        {focusId ? <input type="hidden" name="focusId" value={focusId} /> : null}
        <label>
          Primary doer (HR owner)
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
        <button
          className="btn-primary ws-sf-btn-primary"
          disabled={pending}
          type="submit"
        >
          {buttonLabel}
        </button>
        {state.message ? (
          <p className={state.ok ? "ws-form-msg ok" : "ws-form-msg err"}>
            {state.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
