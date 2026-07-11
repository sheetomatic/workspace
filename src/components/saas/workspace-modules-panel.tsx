"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Eye, EyeOff } from "lucide-react";
import type { NavPreferenceOption } from "@/lib/workspace-nav-prefs";
import {
  DEFAULT_FOCUSED_NAV_IDS,
  type WorkspaceNavPrefs,
} from "@/lib/workspace-nav-prefs";
import {
  resetWorkspaceNavPrefs,
  saveWorkspaceNavPrefs,
  setWorkspaceNavPrefsMode,
} from "@/app/app/settings/nav-prefs-actions";

const FOCUS_SET = new Set<string>(DEFAULT_FOCUSED_NAV_IDS);

export function WorkspaceModulesPanel({
  prefs,
  options,
}: {
  prefs: WorkspaceNavPrefs;
  options: NavPreferenceOption[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState(prefs.mode);
  const [visible, setVisible] = useState<Set<string>>(
    () =>
      new Set(
        prefs.mode === "all"
          ? options.map((o) => o.id)
          : prefs.mode === "focus"
            ? [...DEFAULT_FOCUSED_NAV_IDS]
            : prefs.visibleIds,
      ),
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: NavPreferenceOption[] }>();
    for (const option of options) {
      const existing = map.get(option.sectionId);
      if (existing) {
        existing.items.push(option);
      } else {
        map.set(option.sectionId, {
          label: option.sectionLabel,
          items: [option],
        });
      }
    }
    return [...map.entries()];
  }, [options]);

  function toggleId(id: string) {
    setMode("custom");
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function isShown(id: string) {
    if (mode === "all") {
      return true;
    }
    if (mode === "focus") {
      return FOCUS_SET.has(id);
    }
    return visible.has(id);
  }

  return (
    <article className="saas-panel ws-modules-panel">
      <h3>
        <LayoutGrid size={18} aria-hidden />
        Focus modules
      </h3>
      <p className="saas-panel-lead">
        Show only what you need in the sidebar and on Home. Hidden modules stay
        available — open Customize anytime to restore them.
      </p>

      <div className="ws-modules-quick">
        <button
          type="button"
          className="btn-cta btn-secondary btn-compact"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              setError("");
              const result = await setWorkspaceNavPrefsMode("focus");
              if (!result.ok) {
                setError(result.error ?? "Could not save.");
                return;
              }
              setMode("focus");
              setVisible(new Set(DEFAULT_FOCUSED_NAV_IDS));
              setMessage("Focus modules on.");
              router.refresh();
            });
          }}
        >
          Focus modules
        </button>
        <button
          type="button"
          className="btn-cta btn-secondary btn-compact"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              setError("");
              const result = await setWorkspaceNavPrefsMode("all");
              if (!result.ok) {
                setError(result.error ?? "Could not save.");
                return;
              }
              setMode("all");
              setVisible(new Set(options.map((o) => o.id)));
              setMessage("All modules shown.");
              router.refresh();
            });
          }}
        >
          Show all modules
        </button>
      </div>

      <form
        className="ws-modules-form"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          formData.set("mode", "custom");
          for (const id of visible) {
            formData.append("visibleId", id);
          }
          startTransition(async () => {
            setError("");
            setMessage("");
            const result = await saveWorkspaceNavPrefs(formData);
            if (!result.ok) {
              setError(result.error ?? "Could not save.");
              return;
            }
            setMode("custom");
            setMessage("Sidebar updated.");
            router.refresh();
          });
        }}
      >
        {grouped.map(([sectionId, group]) => (
          <div className="ws-modules-group" key={sectionId}>
            <p className="ws-modules-group-label">{group.label}</p>
            <ul className="ws-modules-list">
              {group.items.map((item) => {
                const shown = isShown(item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`ws-modules-toggle${shown ? " is-on" : ""}`}
                      aria-pressed={shown}
                      disabled={pending || mode === "all"}
                      onClick={() => toggleId(item.id)}
                    >
                      <span>{item.label}</span>
                      <span className="ws-modules-toggle-state">
                        {shown ? (
                          <>
                            <Eye size={14} aria-hidden /> Show in sidebar
                          </>
                        ) : (
                          <>
                            <EyeOff size={14} aria-hidden /> Hidden
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <div className="ws-modules-actions">
          <button
            type="submit"
            className="btn-cta btn-compact"
            disabled={pending || mode === "all"}
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn-cta btn-secondary btn-compact"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                setError("");
                const result = await resetWorkspaceNavPrefs();
                if (!result.ok) {
                  setError(result.error ?? "Could not reset.");
                  return;
                }
                setMode("focus");
                setVisible(new Set(DEFAULT_FOCUSED_NAV_IDS));
                setMessage("Back to focus modules.");
                router.refresh();
              });
            }}
          >
            Reset
          </button>
        </div>
      </form>

      {message ? <p className="ws-modules-msg">{message}</p> : null}
      {error ? <p className="ws-modules-err">{error}</p> : null}
    </article>
  );
}
