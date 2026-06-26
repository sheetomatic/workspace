"use client";

import type { Role, WorkspaceModule } from "@prisma/client";
import {
  WORKSPACE_MODULE_LABELS,
  WORKSPACE_MODULES,
  modulesFromRoleDefault,
} from "@/lib/workspace-modules";
import { useEffect, useState } from "react";

export function WorkspaceModuleFields({
  role,
  defaultModules,
  lockSelection = false,
  orgAllowedModules,
}: {
  role: Role;
  defaultModules?: WorkspaceModule[];
  /** When true (edit form), role changes do not reset saved module picks. */
  lockSelection?: boolean;
  /** Org tier cap; omit or empty = all modules selectable (legacy). */
  orgAllowedModules?: WorkspaceModule[];
}) {
  const isEditing = lockSelection || Boolean(defaultModules?.length);
  const allowedSet = new Set(
    orgAllowedModules?.length ? orgAllowedModules : WORKSPACE_MODULES,
  );

  const [selected, setSelected] = useState<WorkspaceModule[]>(() => {
    const initial = defaultModules?.length
      ? defaultModules
      : modulesFromRoleDefault(role);
    return initial.filter((module) => allowedSet.has(module));
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
    </section>
  );
}

export function WorkspaceModulePills({ modules }: { modules: WorkspaceModule[] }) {
  if (modules.length === 0) {
    return null;
  }

  return (
    <div className="saas-team-module-pills" aria-label="Assigned modules">
      {modules.map((module) => (
        <span className="saas-team-module-pill" key={module}>
          {WORKSPACE_MODULE_LABELS[module].split(" (")[0]}
        </span>
      ))}
    </div>
  );
}
