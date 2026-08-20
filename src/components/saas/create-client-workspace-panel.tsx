"use client";

import { useActionState } from "react";
import { Building2 } from "lucide-react";
import {
  createClientWorkspaceAction,
  type CreateClientWorkspaceState,
} from "@/app/app/team/platform-actions";
import { WorkspaceBundleSelect } from "@/components/saas/workspace-bundle-select";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";

const initialState: CreateClientWorkspaceState = { ok: false, message: "" };

export type ClientWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: keyof typeof ORG_PLAN_LABELS | string;
  allowedModules: string[];
  createdAt: string;
  ownerName: string | null;
  ownerEmail: string | null;
};

export function CreateClientWorkspacePanel({
  workspaces,
}: {
  workspaces: ClientWorkspaceRow[];
}) {
  const [state, formAction, pending] = useActionState(
    createClientWorkspaceAction,
    initialState,
  );

  return (
    <article className="saas-panel saas-super-admin-panel">
      <div className="saas-panel-head">
        <div>
          <h3>
            <Building2 size={18} aria-hidden />
            Create client workspace
          </h3>
          <p>
            Makes a separate account from Sheetomatic Technologies. The client
            gets their own login, tasks, and team. Pick Tasks Management only
            — that is not EA and not PC.
          </p>
        </div>
      </div>

      <form action={formAction} className="saas-create-workspace-form">
        <label>
          Client company name
          <input
            name="businessName"
            required
            minLength={2}
            placeholder="e.g. Ketan Furniture"
            autoComplete="organization"
          />
        </label>
        <label>
          Owner name
          <input
            name="ownerName"
            required
            minLength={2}
            placeholder="Owner full name"
            autoComplete="name"
          />
        </label>
        <label>
          Owner email
          <input
            name="ownerEmail"
            required
            type="email"
            placeholder="owner@company.com"
            autoComplete="email"
          />
        </label>
        <label>
          Owner WhatsApp (optional)
          <input
            name="ownerPhone"
            type="tel"
            placeholder="98xxxxxxxx"
            autoComplete="tel"
          />
        </label>
        <WorkspaceBundleSelect defaultValue="tasks_addon" disabled={pending} />
        <div className="saas-create-workspace-actions">
          <button className="btn-cta btn-primary" disabled={pending} type="submit">
            {pending ? "Creating…" : "Create separate account"}
          </button>
        </div>
      </form>

      {state.message ? (
        <div className={state.ok ? "saas-form-success" : "saas-form-error"}>
          <p>{state.message}</p>
          {state.ok ? (
            <dl className="saas-create-workspace-creds">
              <div>
                <dt>Workspace</dt>
                <dd>
                  {state.workspaceName}{" "}
                  <code>{state.slug}</code>
                </dd>
              </div>
              <div>
                <dt>Login</dt>
                <dd>
                  <a href={state.loginUrl} target="_blank" rel="noreferrer">
                    {state.loginUrl}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{state.loginEmail}</dd>
              </div>
              {state.tempPassword ? (
                <div>
                  <dt>Temporary password</dt>
                  <dd>
                    <code>{state.tempPassword}</code>
                    <span> — share once if email did not go out</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}

      {workspaces.length > 0 ? (
        <div className="saas-create-workspace-list">
          <h4>Recent client workspaces</h4>
          <ul>
            {workspaces.map((row) => (
              <li key={row.id}>
                <div>
                  <strong>{row.name}</strong>
                  <span>
                    {row.ownerEmail ?? "No owner"} · {row.slug} ·{" "}
                    {ORG_PLAN_LABELS[row.plan as keyof typeof ORG_PLAN_LABELS] ??
                      row.plan}
                  </span>
                </div>
                <span className="saas-role-pill">
                  {row.status === "ACTIVE" ? "Active" : "Pending"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
