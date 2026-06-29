"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Palette, RotateCcw, Save } from "lucide-react";
import {
  DEFAULT_WORKSPACE_APPEARANCE,
  THEME_PRESETS,
  getPresetLabel,
  listThemePresets,
  type ThemePreset,
  type WorkspaceAppearance,
} from "@/lib/workspace-appearance";
import {
  removeWorkspaceLogo,
  resetWorkspaceAppearance,
  saveWorkspaceAppearance,
  uploadWorkspaceLogo,
} from "@/app/app/settings/appearance-actions";

const COLOR_FIELDS: { key: keyof WorkspaceAppearance; label: string }[] = [
  { key: "primary", label: "Primary / Accent" },
  { key: "sidebar", label: "Sidebar" },
  { key: "sidebarHover", label: "Sidebar Hover" },
  { key: "background", label: "Page Background" },
];

type AppearanceState = WorkspaceAppearance & { logoSrc: string };

export function WorkspaceAppearancePanel({
  appearance,
}: {
  appearance: AppearanceState;
}) {
  const router = useRouter();
  const [state, setState] = useState(appearance);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setState(appearance);
  }, [appearance]);

  function applyPreset(preset: ThemePreset) {
    const colors = preset !== "custom" ? THEME_PRESETS[preset] : THEME_PRESETS.default;
    setState((prev) => ({ ...prev, preset, ...colors }));
  }

  function updateField<K extends keyof WorkspaceAppearance>(
    key: K,
    value: WorkspaceAppearance[K],
  ) {
    setState((prev) => ({
      ...prev,
      [key]: value,
      preset: key === "preset" ? (value as ThemePreset) : "custom",
    }));
  }

  return (
    <article className="saas-panel workspace-appearance-panel">
      <h3>
        <Palette size={18} aria-hidden />
        Appearance
      </h3>
      <p className="type-body-sm text-slate-500">
        Customize theme colors and upload your workspace logo - same as TOPS CRM.
      </p>

      <div className="workspace-appearance-presets">
        {listThemePresets()
          .filter((preset) => preset !== "custom")
          .map((preset) => (
            <button
              key={preset}
              type="button"
              className={
                state.preset === preset
                  ? "workspace-appearance-preset active"
                  : "workspace-appearance-preset"
              }
              disabled={pending}
              onClick={() => applyPreset(preset)}
            >
              {getPresetLabel(preset)}
            </button>
          ))}
      </div>

      <div className="workspace-appearance-colors">
        {COLOR_FIELDS.map(({ key, label }) => (
          <label key={key} className="workspace-appearance-color">
            <span>{label}</span>
            <input
              type="color"
              value={String(state[key])}
              disabled={pending}
              onChange={(event) => updateField(key, event.target.value)}
            />
          </label>
        ))}
      </div>

      <div className="workspace-appearance-brand-fields">
        <label>
          Product name
          <input
            type="text"
            value={state.productName}
            disabled={pending}
            onChange={(event) => updateField("productName", event.target.value)}
          />
        </label>
        <label>
          Brand name
          <input
            type="text"
            value={state.brandName}
            disabled={pending}
            onChange={(event) => updateField("brandName", event.target.value)}
          />
        </label>
      </div>

      <div className="workspace-appearance-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.logoSrc} alt={`${state.brandName} logo`} height={40} />
        <input
          ref={logoInputRef}
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="sr-only"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null;
            if (!file) return;
            startTransition(async () => {
              const formData = new FormData();
              formData.set("logo", file);
              const result = await uploadWorkspaceLogo(formData);
              if (result.ok) {
                setMessage("Logo uploaded.");
                router.refresh();
              } else {
                setError(result.error ?? "Upload failed.");
              }
            });
          }}
        />
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() => logoInputRef.current?.click()}
        >
          <ImagePlus size={16} aria-hidden />
          Upload logo
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await removeWorkspaceLogo();
              if (result.ok) {
                setMessage("Logo removed.");
                router.refresh();
              } else {
                setError(result.error ?? "Remove failed.");
              }
            })
          }
        >
          Remove logo
        </button>
      </div>

      <div className="workspace-appearance-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const formData = new FormData();
              formData.set("preset", state.preset);
              COLOR_FIELDS.forEach(({ key }) => formData.set(key, String(state[key])));
              formData.set("productName", state.productName);
              formData.set("brandName", state.brandName);
              const result = await saveWorkspaceAppearance(formData);
              if (result.ok) {
                setMessage("Theme saved.");
                router.refresh();
              } else {
                setError(result.error ?? "Save failed.");
              }
            })
          }
        >
          <Save size={16} aria-hidden />
          Save appearance
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resetWorkspaceAppearance();
              if (result.ok) {
                setState({ ...DEFAULT_WORKSPACE_APPEARANCE, logoSrc: appearance.logoSrc });
                setMessage("Reset to Sheetomatic defaults.");
                router.refresh();
              } else {
                setError(result.error ?? "Reset failed.");
              }
            })
          }
        >
          <RotateCcw size={16} aria-hidden />
          Reset
        </button>
      </div>

      {message ? <p className="workspace-appearance-msg ok">{message}</p> : null}
      {error ? <p className="workspace-appearance-msg err">{error}</p> : null}
    </article>
  );
}
