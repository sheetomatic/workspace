"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
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

export function FmsStepInfoModal({
  meta,
  open,
  onClose,
  editHref,
}: {
  meta: FmsStepManageMeta;
  open: boolean;
  onClose: () => void;
  editHref?: string;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const who = meta.whoName ?? meta.roleLabel ?? "Not assigned";

  return createPortal(
    <div className="ws-fms-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ws-fms-modal ws-fms-step-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-fms-modal-head">
          <div>
            <p className="ws-fms-modal-eyebrow">Step {meta.stepIndex + 1}</p>
            <h2 id={titleId}>{meta.stepName}</h2>
          </div>
          <button
            type="button"
            className="ws-fms-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} aria-hidden />
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
        {editHref ? (
          <Link href={editHref} className="ws-fms-step-manage-edit" onClick={onClose}>
            Edit in workflow settings
          </Link>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
