"use client";

import type { Role, WorkspaceModule } from "@prisma/client";
import {
  WORKSPACE_MODULE_LABELS,
  WORKSPACE_MODULES,
  modulesFromRoleDefault,
} from "@/lib/workspace-modules";
import {
  HR_SUB_MODULES,
  type HrSubModuleId,
} from "@/lib/hr/hr-sub-modules";
import {
  CRM_SUB_MODULES,
  type CrmSubModuleId,
} from "@/lib/crm/crm-sub-modules";
import { useEffect, useState } from "react";

export function WorkspaceModuleFields({
  role,
  defaultModules,
  defaultHrSubModules,
  defaultCrmSubModules,
  lockSelection = false,
  orgAllowedModules,
  orgEnabledHrSubModules,
}: {
  role: Role;
  defaultModules?: WorkspaceModule[];
  /** Empty = inherit all org-enabled HR sub-modules. */
  defaultHrSubModules?: string[];
  /** Empty = inherit all CRM sub-modules. */
  defaultCrmSubModules?: string[];
  /** When true (edit form), role changes do not reset saved module picks. */
  lockSelection?: boolean;
  /** Org tier cap; omit or empty = all modules selectable (legacy). */
  orgAllowedModules?: WorkspaceModule[];
  /** Org-enabled HR sub-modules available to grant. */
  orgEnabledHrSubModules?: HrSubModuleId[];
}) {
  const isEditing = lockSelection || Boolean(defaultModules?.length);
  const allowedSet = new Set(
    orgAllowedModules?.length ? orgAllowedModules : WORKSPACE_MODULES,
  );
  const orgHrSet = new Set(
    orgEnabledHrSubModules?.length
      ? orgEnabledHrSubModules
      : HR_SUB_MODULES.map((m) => m.id),
  );

  const [selected, setSelected] = useState<WorkspaceModule[]>(() => {
    const initial = defaultModules?.length
      ? defaultModules
      : modulesFromRoleDefault(role);
    return initial.filter((module) => allowedSet.has(module));
  });

  const inheritAllHr =
    !defaultHrSubModules || defaultHrSubModules.length === 0;
  const [hrSelected, setHrSelected] = useState<HrSubModuleId[]>(() => {
    if (inheritAllHr) {
      return [...orgHrSet] as HrSubModuleId[];
    }
    return defaultHrSubModules.filter((id): id is HrSubModuleId =>
      orgHrSet.has(id as HrSubModuleId),
    );
  });

  const inheritAllCrm =
    !defaultCrmSubModules || defaultCrmSubModules.length === 0;
  const [crmSelected, setCrmSelected] = useState<CrmSubModuleId[]>(() => {
    if (inheritAllCrm) {
      return CRM_SUB_MODULES.map((m) => m.id);
    }
    return defaultCrmSubModules.filter((id): id is CrmSubModuleId =>
      CRM_SUB_MODULES.some((m) => m.id === id),
    );
  });

  useEffect(() => {
    if (!isEditing) {
      setSelected(
        modulesFromRoleDefault(role).filter((module) => allowedSet.has(module)),
      );
    }
  }, [role, isEditing, orgAllowedModules]);

  function toggle(module: WorkspaceModule) {
    if (!allowedSet.has(module)) {
      return;
    }
    setSelected((current) =>
      current.includes(module)
        ? current.filter((item) => item !== module)
        : [...current, module],
    );
  }

  function toggleHr(id: HrSubModuleId) {
    setHrSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleCrm(id: CrmSubModuleId) {
    setCrmSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  const showHrSubs = selected.includes("HR") && orgHrSet.size > 0;
  const showCrmSubs = selected.includes("CRM");

  return (
    <section className="ws-member-module-settings" aria-labelledby="ws-modules-heading">
      <h4 className="ws-member-module-title" id="ws-modules-heading">
        Modules
      </h4>
      <p className="ws-member-module-lead">
        Multi-select what this person can open in the workspace sidebar. Dashboard
        is always available. Team and Settings remain admin-only.
      </p>
      <div className="ws-member-module-grid" role="group" aria-label="Workspace modules">
        {WORKSPACE_MODULES.map((module) => {
          const checked = selected.includes(module);
          const tierLocked = !allowedSet.has(module);
          return (
            <label
              className={`ws-module-option${checked ? " is-selected" : ""}${tierLocked ? " is-tier-locked" : ""}`}
              key={module}
            >
              <input
                checked={checked}
                disabled={tierLocked}
                name="modules"
                type="checkbox"
                value={module}
                onChange={() => toggle(module)}
              />
              <span className="ws-module-option-label">
                {WORKSPACE_MODULE_LABELS[module]}
                {tierLocked ? " (plan upgrade)" : ""}
              </span>
            </label>
          );
        })}
      </div>
      {selected.length === 0 ? (
        <p className="ws-member-module-warning">Select at least one module.</p>
      ) : null}

      {showCrmSubs ? (
        <div className="ws-member-hr-submodules" style={{ marginTop: "1rem" }}>
          <h4 className="ws-member-module-title">CRM sub-modules</h4>
          <p className="ws-member-module-lead">
            Uncheck pipeline areas this person should not access (e.g. Payments or
            Training). Leave all checked for full CRM access.
          </p>
          <div
            className="ws-member-module-grid"
            role="group"
            aria-label="CRM sub-modules"
          >
            {CRM_SUB_MODULES.map((mod) => {
              const checked = crmSelected.includes(mod.id);
              return (
                <label
                  className={`ws-module-option${checked ? " is-selected" : ""}`}
                  key={mod.id}
                >
                  <input
                    checked={checked}
                    name="crmSubModules"
                    type="checkbox"
                    value={mod.id}
                    onChange={() => toggleCrm(mod.id)}
                  />
                  <span className="ws-module-option-label">{mod.label}</span>
                </label>
              );
            })}
          </div>
          {crmSelected.length === 0 ? (
            <p className="ws-member-module-warning">
              No CRM sub-modules selected — CRM will be hidden for them.
            </p>
          ) : null}
        </div>
      ) : null}

      {showHrSubs ? (
        <div className="ws-member-hr-submodules" style={{ marginTop: "1rem" }}>
          <h4 className="ws-member-module-title">HRMS sub-modules</h4>
          <p className="ws-member-module-lead">
            Uncheck areas this person should not access (e.g. Hiring). Leave all
            checked to match the workspace HR settings.
          </p>
          <div
            className="ws-member-module-grid"
            role="group"
            aria-label="HR sub-modules"
          >
            {HR_SUB_MODULES.filter((m) => orgHrSet.has(m.id)).map((mod) => {
              const checked = hrSelected.includes(mod.id);
              return (
                <label
                  className={`ws-module-option${checked ? " is-selected" : ""}`}
                  key={mod.id}
                >
                  <input
                    checked={checked}
                    name="hrSubModules"
                    type="checkbox"
                    value={mod.id}
                    onChange={() => toggleHr(mod.id)}
                  />
                  <span className="ws-module-option-label">{mod.label}</span>
                </label>
              );
            })}
          </div>
          {hrSelected.length === 0 ? (
            <p className="ws-member-module-warning">
              No HR sub-modules selected — they will see HR overview only.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function WorkspaceModulePills({ modules }: { modules: WorkspaceModule[] }) {
  if (modules.length === 0) {
    return null;
  }

  return (
    <ul className="ws-module-pills">
      {modules.map((module) => (
        <li key={module}>{WORKSPACE_MODULE_LABELS[module]}</li>
      ))}
    </ul>
  );
}
