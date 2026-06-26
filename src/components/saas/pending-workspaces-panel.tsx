"use client";

import { useActionState } from "react";
import { Loader2, Users } from "lucide-react";
import {
  activateOrganizationAction,
  type WorkspaceStatusActionState,
} from "@/app/ai/app/settings/actions";

const initialState: WorkspaceStatusActionState = { ok: false, message: "" };

export type PendingWorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string | null;
  createdAt: string;
};

export function PendingWorkspacesPanel({
  workspaces,
}: {
  workspaces: PendingWorkspaceRow[];
}) {
  const [state, formAction, pending] = useActionState(
    activateOrganizationAction,
    initialState,
  );

  if (workspaces.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-sky-600" aria-hidden />
          <h2 className="text-base font-semibold text-slate-900">
            Pending signups
          </h2>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          No workspaces are waiting for activation.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-center gap-2">
        <Users size={18} className="text-sky-600" aria-hidden />
        <h2 className="text-base font-semibold text-slate-900">
          Pending signups
        </h2>
        <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
          {workspaces.length}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-600">
        New workspaces stay on the activation hold screen until you activate
        them here.
      </p>

      <ul className="mt-4 divide-y divide-slate-100">
        {workspaces.map((workspace) => (
          <li
            key={workspace.id}
            className="flex flex-wrap items-center justify-between gap-3 py-3"
          >
            <div>
              <p className="font-medium text-slate-900">{workspace.name}</p>
              <p className="text-sm text-slate-500">
                {workspace.ownerEmail ?? "No owner email"} | {workspace.slug} |{" "}
                {workspace.createdAt}
              </p>
            </div>
            <form action={formAction}>
              <input name="workspaceSlug" type="hidden" value={workspace.slug} />
              <button
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                disabled={pending}
                type="submit"
              >
                {pending ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={14} aria-hidden />
                    Activating...
                  </span>
                ) : (
                  "Activate"
                )}
              </button>
            </form>
          </li>
        ))}
      </ul>

      {state.message ? (
        <p
          className={
            state.ok
              ? "mt-3 text-sm text-emerald-600"
              : "mt-3 text-sm text-rose-600"
          }
        >
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
