"use client";

import { useActionState } from "react";
import { enableImsModuleForTeamAction, type ImsActionState } from "@/app/app/ims/actions";

const initial: ImsActionState = { ok: false, message: "" };

export function ImsTeamAccessPanel({ membersMissingIms }: { membersMissingIms: number }) {
  const [state, action] = useActionState(enableImsModuleForTeamAction, initial);

  if (membersMissingIms === 0 && !state.message) {
    return null;
  }

  return (
    <section className="ws-ims-panel ws-ims-access-panel">
      <h2>Team IMS access</h2>
      {membersMissingIms > 0 ? (
        <p className="ws-ims-help">
          {membersMissingIms} team member{membersMissingIms === 1 ? "" : "s"} (staff,
          managers, or admins) do not have the Inventory module enabled yet. They will not
          see IMS in the sidebar until access is granted. Staff can record movements;
          editing items stays manager-only.
        </p>
      ) : (
        <p className="ws-ims-help">IMS access is enabled for your whole team.</p>
      )}

      {state.message ? (
        <p
          className={
            state.ok ? "ws-ims-feedback" : "ws-ims-feedback ws-ims-feedback-error"
          }
        >
          {state.message}
        </p>
      ) : null}

      {membersMissingIms > 0 ? (
        <form action={action}>
          <button type="submit" className="ws-btn-primary">
            Enable IMS for the team
          </button>
        </form>
      ) : null}
    </section>
  );
}
