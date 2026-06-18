"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2, X } from "lucide-react";
import {
  FmsStepCompletePanel,
  type FmsStepCompleteState,
} from "@/components/saas/fms-step-complete-panel";
import {
  FmsStepInfoModal,
  type FmsStepManageMeta,
} from "@/components/saas/fms-step-info-modal";
import { formatTatClock } from "@/lib/fms/step-display";

export function FmsStepTaskModal({
  meta,
  stepState,
  canComplete,
  open,
  onClose,
}: {
  meta: FmsStepManageMeta;
  stepState: FmsStepCompleteState;
  canComplete: boolean;
  open: boolean;
  onClose: () => void;
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
        className="ws-fms-modal ws-fms-step-task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ws-fms-modal-head">
          <div>
            <p className="ws-fms-modal-eyebrow">Your stop</p>
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

        <dl className="ws-fms-step-manage-meta ws-fms-step-task-meta">
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
            <dt>TAT</dt>
            <dd>{formatTatClock(meta.slaType, meta.slaConfig)}</dd>
          </div>
        </dl>

        {canComplete ? (
          <FmsStepCompletePanel
            canComplete
            compact
            mode="form"
            stepState={stepState}
            onCancel={onClose}
          />
        ) : (
          <p className="ws-fms-muted ws-fms-step-task-wait">
            This stop is not assigned to you or is already completed.
          </p>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function FmsStepInfoButton({
  meta,
  showEditLink = true,
}: {
  meta: FmsStepManageMeta;
  showEditLink?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="ws-fms-step-manage-btn"
        aria-label={`Step details: ${meta.stepName}`}
        onClick={() => setOpen(true)}
      >
        <Settings2 size={14} aria-hidden />
      </button>
      <FmsStepInfoModal
        meta={meta}
        open={open}
        onClose={() => setOpen(false)}
        editHref={showEditLink ? `/app/fms/forms/${meta.formId}` : undefined}
      />
    </>
  );
}
