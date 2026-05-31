"use client";

import { useActionState } from "react";
import {
  saveWorkspaceName,
  type WorkspaceSettingsState,
} from "@/app/app/settings/actions";

const initialState: WorkspaceSettingsState = { ok: false, message: "" };

export function WorkspaceSettingsForm({
  initialName,
  canEdit,
}: {
  initialName: string;
  canEdit: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveWorkspaceName,
    initialState,
  );

  if (!canEdit) {
    return (
      <dl className="saas-settings-list">
        <div>
          <dt>Name</dt>
          <dd>{initialName}</dd>
        </div>
      </dl>
    );
  }

  return (
    <form action={action} className="saas-settings-form">
      <label>
        Organization name
        <input
          defaultValue={initialName}
          maxLength={120}
          minLength={2}
          name="name"
          required
          type="text"
        />
      </label>
      <button
        className="btn-cta btn-secondary saas-settings-save"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving..." : "Save name"}
      </button>
      {state.message ? (
        <p
          className={
            state.ok ? "saas-form-message ok" : "saas-form-message error"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
