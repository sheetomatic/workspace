"use client";

import { useId, useState } from "react";
import type { WorkspaceModule } from "@prisma/client";
import { ACTIVATION_BUNDLE_OPTIONS, DEFAULT_ACTIVATION_BUNDLE, type ActivationBundleKey } from "@/lib/workspace-activation-bundles.shared";
import { WORKSPACE_MODULE_LABELS } from "@/lib/workspace-modules";
import { BCI_SUB_MODULES } from "@/lib/bci/bci-sub-modules";

type Props = {
  name?: string;
  defaultValue?: ActivationBundleKey;
  disabled?: boolean;
  moduleSelection?: boolean;
  plansOnly?: boolean;
};

export function WorkspaceBundleSelect({ name = "activationBundle", defaultValue = DEFAULT_ACTIVATION_BUNDLE, disabled = false, moduleSelection = false, plansOnly = false }: Props) {
  const id = useId();
  const [selected, setSelected] = useState<ActivationBundleKey>(defaultValue);
  const option = ACTIVATION_BUNDLE_OPTIONS.find((item) => item.value === selected)!;
  const [modules, setModules] = useState<WorkspaceModule[]>(() => [...option.modules]);
  const [parts, setParts] = useState<string[]>(() => BCI_SUB_MODULES.map((part) => part.id));
  const options = plansOnly ? ACTIVATION_BUNDLE_OPTIONS.filter((item) => item.group === "plan") : ACTIVATION_BUNDLE_OPTIONS;

  function changePlan(value: ActivationBundleKey) {
    setSelected(value);
    setModules([...(ACTIVATION_BUNDLE_OPTIONS.find((item) => item.value === value)?.modules ?? [])]);
    setParts(BCI_SUB_MODULES.map((part) => part.id));
  }

  return (
    <fieldset disabled={disabled} className="mt-3 min-w-0 space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={id}>Workspace plan</label>
      <select id={id} name={name} value={selected} onChange={(event) => changePlan(event.target.value as ActivationBundleKey)} className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-sky-500">
        {(["plan", "product", "bundle"] as const).map((group) => (
          <optgroup key={group} label={group === "plan" ? "Monthly business plans" : group === "product" ? "Existing standalone products" : "Legacy bundles"}>
            {options.filter((item) => item.group === group).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </optgroup>
        ))}
      </select>
      <p className="max-w-xl text-sm text-slate-600">{option.description}</p>
      {moduleSelection ? <>
        <input type="hidden" name="moduleSelection" value="explicit" />
        <fieldset className="min-w-0 space-y-2">
          <legend className="font-semibold">Module access</legend>
          <p className="text-sm text-slate-600">Only checked modules will be available, including during the 3-day trial.</p>
          <div className="ws-member-module-grid">
            {option.modules.map((module) => <label className="ws-module-option" key={module}>
              <input name="selectedModules" type="checkbox" value={module} checked={modules.includes(module)} onChange={(event) => setModules((current) => event.target.checked ? [...current, module] : current.filter((item) => item !== module))} />
              <span>{WORKSPACE_MODULE_LABELS[module]}</span>
            </label>)}
          </div>
        </fieldset>
        {modules.includes("FMS") ? <fieldset className="min-w-0 space-y-2">
          <legend className="font-semibold">Business Systems Suite access</legend>
          <div className="ws-member-module-grid">
            {BCI_SUB_MODULES.map((part) => <label className="ws-module-option" key={part.id}>
              <input name="selectedSuiteParts" type="checkbox" value={part.id} checked={parts.includes(part.id)} onChange={(event) => setParts((current) => event.target.checked ? [...current, part.id] : current.filter((item) => item !== part.id))} />
              <span>{part.label}</span>
            </label>)}
          </div>
        </fieldset> : null}
        {option.group === "plan" ? <fieldset className="min-w-0 space-y-2">
          <legend className="font-semibold">Agreed workspace limits</legend>
          <p className="text-sm text-slate-600">Enter the limits agreed for this client.</p>
          <label className="block text-sm">Member limit <input className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" name="maxMembers" type="number" min="1" step="1" required /></label>
          <label className="block text-sm">FMS workflow limit <input className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" name="maxFmsTemplates" type="number" min="0" step="1" required /></label>
        </fieldset> : null}
        {modules.length === 0 ? <p>No modules selected. This workspace will have no module access.</p> : null}
      </> : <p className="text-sm text-slate-600">{option.modules.map((module) => WORKSPACE_MODULE_LABELS[module]).join(", ")}</p>}
    </fieldset>
  );
}
