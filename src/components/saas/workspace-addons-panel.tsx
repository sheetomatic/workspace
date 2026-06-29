"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Layers, Save } from "lucide-react";
import type { OrgPlan, WorkspaceModule } from "@prisma/client";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";
import {
  BCI_CORE_MODULES,
  isAddonEnabled,
  listOptionalAddons,
  WORKSPACE_ADDON_CATALOG,
  listPurchasableAddons,
} from "@/lib/workspace-addons.shared";
import { saveWorkspaceAddons } from "@/app/app/settings/addon-actions";

export function WorkspaceAddonsPanel({
  allowedModules,
  plan,
  canEdit,
}: {
  allowedModules: WorkspaceModule[];
  plan: OrgPlan;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const enabledOptional = listOptionalAddons(allowedModules);
  const hasBciCore = BCI_CORE_MODULES.every((module) => allowedModules.includes(module));

  return (
    <article className="saas-panel workspace-addons-panel">
      <h3>
        <Layers size={18} aria-hidden />
        Workspace add-ons
      </h3>
      <p className="type-body-sm text-slate-500">
        BCI FMS is the core bundle. Every other module is an optional add-on - only
        enabled add-ons appear in the sidebar.
      </p>

      <p className="workspace-addons-plan">
        Plan: <strong>{ORG_PLAN_LABELS[plan]}</strong>
      </p>

      <form
        className="workspace-addons-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canEdit) return;
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            const result = await saveWorkspaceAddons(formData);
            if (result.ok) {
              router.refresh();
            }
          });
        }}
      >
        <fieldset className="workspace-addons-fieldset" disabled={!canEdit || pending}>
          <legend className="sr-only">Workspace modules</legend>

          <label className="workspace-addon-row core">
            <input
              defaultChecked={hasBciCore}
              disabled={!canEdit}
              name="bciCore"
              type="checkbox"
            />
            <span>
              <strong>BCI FMS core</strong>
              <small>FMS, Reports, Approvals - included in every BCI workspace</small>
            </span>
          </label>

          {listPurchasableAddons().map((addon) => {
            const active = isAddonEnabled(allowedModules, addon);
            return (
              <label
                key={addon.key}
                className={active ? "workspace-addon-row active" : "workspace-addon-row"}
              >
                <input
                  defaultChecked={active}
                  disabled={!canEdit}
                  name={`addon_${addon.key}`}
                  type="checkbox"
                />
                <span>
                  <strong>{addon.label}</strong>
                  <small>{addon.description}</small>
                </span>
              </label>
            );
          })}
        </fieldset>

        {canEdit ? (
          <button className="btn-primary workspace-addons-save" disabled={pending} type="submit">
            <Save size={16} aria-hidden />
            {pending ? "Saving..." : "Save add-ons"}
          </button>
        ) : (
          <p className="workspace-addons-readonly">
            Active add-ons:{" "}
            {enabledOptional.length > 0
              ? enabledOptional.map((addon) => addon.shortLabel).join(", ")
              : "BCI core only"}
          </p>
        )}
      </form>

      <ul className="workspace-addons-active-list">
        {WORKSPACE_ADDON_CATALOG.filter((addon) =>
          isAddonEnabled(allowedModules, addon),
        ).map((addon) => (
          <li key={addon.key}>
            <span className="workspace-addon-pill">
              {addon.shortLabel}
              {addon.isBciCore ? " (core)" : " (add-on)"}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
