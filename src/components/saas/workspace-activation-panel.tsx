"use client";

import { useActionState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  setWorkspaceStatusAction,
  type WorkspaceStatusActionState,
} from "@/app/ai/app/settings/actions";

const initialState: WorkspaceStatusActionState = { ok: false, message: "" };

/** Super-admin only: activate or hold the current workspace. */
export function WorkspaceActivationPanel({
  organizationName,
  status,
}: {
  organizationName: string;
  status: "ONBOARDING" | "ACTIVE";
}) {
  const [state, formAction, pending] = useActionState(
    setWorkspaceStatusAction,
    initialState,
  );

  const isActive = status === "ACTIVE";
  const nextStatus = isActive ? "ONBOARDING" : "ACTIVE";

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} className="text-sky-600" aria-hidden />
        <h2 className="text-base font-semibold text-slate-900">
          Workspace status
        </h2>
        <span className="ml-auto text-xs font-medium uppercase tracking-wide text-slate-400">
          Super admin
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        <strong>{organizationName}</strong> is currently{" "}
        <span
          className={
            isActive
              ? "font-semibold text-emerald-600"
              : "font-semibold text-amber-600"
          }
        >
          {isActive ? "Active" : "Pending activation"}
        </span>
        . Members of a pending workspace see the activation hold screen until
        you switch it on.
      </p>

      <form action={formAction} className="mt-4 flex items-center gap-3">
        <input name="status" type="hidden" value={nextStatus} />
        <button
          className={
            isActive
              ? "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              : "rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          }
          disabled={pending}
          type="submit"
        >
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} aria-hidden />
              Saving...
            </span>
          ) : isActive ? (
            "Move back to pending"
          ) : (
            "Activate workspace"
          )}
        </button>
        {state.message ? (
          <span
            className={
              state.ok ? "text-sm text-emerald-600" : "text-sm text-rose-600"
            }
          >
            {state.message}
          </span>
        ) : null}
      </form>
    </section>
  );
}
