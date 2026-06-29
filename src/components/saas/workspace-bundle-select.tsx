"use client";

import { useMemo, useState } from "react";
import {
  ACTIVATION_BUNDLE_OPTIONS,
  DEFAULT_ACTIVATION_BUNDLE,
  formatAllowedModules,
  type ActivationBundleKey,
} from "@/lib/workspace-activation-bundles.shared";

type WorkspaceBundleSelectProps = {
  name?: string;
  defaultValue?: ActivationBundleKey;
  disabled?: boolean;
};

/** Super-admin: pick module bundle before activating a workspace. */
export function WorkspaceBundleSelect({
  name = "activationBundle",
  defaultValue = DEFAULT_ACTIVATION_BUNDLE,
  disabled = false,
}: WorkspaceBundleSelectProps) {
  const [selected, setSelected] = useState<ActivationBundleKey>(defaultValue);

  const option = useMemo(
    () => ACTIVATION_BUNDLE_OPTIONS.find((o) => o.value === selected),
    [selected],
  );

  return (
    <div className="mt-3 space-y-2">
      <label className="block text-sm font-medium text-slate-700" htmlFor={name}>
        Module bundle
      </label>
      <select
        id={name}
        name={name}
        disabled={disabled}
        value={selected}
        onChange={(e) => setSelected(e.target.value as ActivationBundleKey)}
        className="w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
      >
        {ACTIVATION_BUNDLE_OPTIONS.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      {option ? (
        <p className="max-w-xl text-xs text-slate-500">
          {option.description}. Modules:{" "}
          <span className="font-medium text-slate-600">
            {formatAllowedModules(option.modules)}
          </span>
        </p>
      ) : null}
    </div>
  );
}
