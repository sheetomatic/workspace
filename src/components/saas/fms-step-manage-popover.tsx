"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Settings2 } from "lucide-react";
import type { FmsSlaType } from "@prisma/client";
import type { FmsSlaConfig } from "@/lib/fms/constants";
import {
  formatStepWhenLabel,
  formatTatClock,
} from "@/lib/fms/step-display";

export type FmsStepManageMeta = {
  stepName: string;
  instructions: string | null;
  roleLabel: string | null;
  whoName: string | null;
  slaType: FmsSlaType;
  slaConfig: FmsSlaConfig;
  formId: string;
  stepIndex: number;
};

export function FmsStepManagePopover({
  meta,
  compact = false,
}: {
  meta: FmsStepManageMeta;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const who =
    meta.whoName ??
    meta.roleLabel ??
    "Not assigned";

  return (
    <div className="ws-fms-step-manage" ref={rootRef}>
      <button
        type="button"
        className={`ws-fms-step-manage-btn${open ? " is-open" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Manage step ${meta.stepIndex + 1}: ${meta.stepName}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Settings2 size={compact ? 14 : 16} aria-hidden />
        {!compact ? <span>Manage</span> : null}
      </button>

      {open ? (
        <div className="ws-fms-step-manage-panel" id={panelId} role="dialog">
          <header className="ws-fms-step-manage-head">
            <strong>Step {meta.stepIndex + 1}</strong>
            <button type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>
          <dl className="ws-fms-step-manage-meta">
            <div>
              <dt>WHAT</dt>
              <dd>{meta.stepName}</dd>
            </div>
            <div>
              <dt>HOW</dt>
              <dd>{meta.instructions?.trim() || "-"}</dd>
            </div>
            <div>
              <dt>WHO</dt>
              <dd>{who}</dd>
            </div>
            <div>
              <dt>WHEN</dt>
              <dd>{formatStepWhenLabel(meta.slaType)}</dd>
            </div>
            <div>
              <dt>TAT</dt>
              <dd>{formatTatClock(meta.slaType, meta.slaConfig)}</dd>
            </div>
          </dl>
          <Link
            href={`/app/fms/forms/${meta.formId}`}
            className="ws-fms-step-manage-edit"
            onClick={() => setOpen(false)}
          >
            Edit in workflow settings
          </Link>
        </div>
      ) : null}
    </div>
  );
}
