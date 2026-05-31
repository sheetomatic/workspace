"use client";

import { useActionState, useTransition } from "react";
import { Shield, ShieldOff } from "lucide-react";
import {
  grantSuperAdminAccess,
  revokeSuperAdminAccess,
  type SuperAdminRow,
} from "@/app/app/team/platform-actions";
import type { TeamActionState } from "@/app/app/team/actions";

const initialState: TeamActionState = { ok: false, message: "" };

export function SuperAdminPanel({
  currentUserId,
  superAdmins,
}: {
  currentUserId: string;
  superAdmins: SuperAdminRow[];
}) {
  const [state, formAction, pending] = useActionState(
    grantSuperAdminAccess,
    initialState,
  );
  const [revokingId, startRevoke] = useTransition();

  return (
    <article className="saas-panel saas-super-admin-panel">
      <div className="saas-panel-head">
        <div>
          <h3>
            <Shield size={18} aria-hidden />
            Platform super admins
          </h3>
          <p>
            Manage who can access every client workspace and create new super
            admin accounts. Only available in Sheetomatic Technologies.
          </p>
        </div>
      </div>

      <ul className="saas-super-admin-list">
        {superAdmins.map((admin) => (
          <li key={admin.id}>
            <div>
              <strong>{admin.name ?? admin.email.split("@")[0]}</strong>
              <span>{admin.email}</span>
            </div>
            {admin.id === currentUserId ? (
              <span className="saas-role-pill">You</span>
            ) : (
              <button
                className="saas-icon-btn saas-icon-btn-danger"
                disabled={Boolean(revokingId)}
                type="button"
                onClick={() => {
                  startRevoke(async () => {
                    await revokeSuperAdminAccess(admin.id);
                  });
                }}
              >
                <ShieldOff size={16} aria-hidden />
                <span>Revoke</span>
              </button>
            )}
          </li>
        ))}
      </ul>

      <form action={formAction} className="saas-super-admin-form">
        <label>
          Grant super admin to existing team member
          <input
            name="email"
            placeholder="colleague@sheetomatic.com"
            required
            type="email"
          />
        </label>
        <button className="btn-cta btn-primary" disabled={pending} type="submit">
          {pending ? "Granting..." : "Grant super admin"}
        </button>
      </form>

      {state.message ? (
        <p className={state.ok ? "saas-form-success" : "saas-form-error"}>
          {state.message}
        </p>
      ) : null}
    </article>
  );
}
