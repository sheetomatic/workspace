"use client";

import { useEffect, useId, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, CircleHelp, X } from "lucide-react";
import {
  getWorkspaceGuide,
  type GuideHighlight,
  type WorkspaceGuide,
  type WorkspaceGuideModuleId,
} from "@/lib/workspace-guides";
import {
  WORKSPACE_GUIDE_OPEN_EVENT,
  type WorkspaceGuideOpenDetail,
} from "@/lib/workspace-guides/events";
import "./workspace-guide-overlay.css";

function activeHighlights(
  guide: WorkspaceGuide,
  stepIndex: number,
): { snapshotId: string; highlights: GuideHighlight[] } {
  const step = guide.steps[stepIndex];
  const snapshot =
    guide.snapshots.find((s) => s.id === step?.snapshotId) ??
    guide.snapshots[0];
  if (!snapshot) {
    return { snapshotId: "", highlights: [] };
  }
  const ids = new Set(step?.highlightIds ?? []);
  const highlights =
    ids.size > 0
      ? snapshot.highlights.filter((h) => ids.has(h.id))
      : snapshot.highlights;
  return { snapshotId: snapshot.id, highlights };
}

export function WorkspaceGuideOverlay({
  guideId: controlledId,
  stepId: controlledStepId,
  open: controlledOpen,
  onClose,
}: {
  guideId?: WorkspaceGuideModuleId | null;
  stepId?: string | null;
  open?: boolean;
  onClose?: () => void;
}) {
  const titleId = useId();
  const [internalOpen, setInternalOpen] = useState(false);
  const [activeId, setActiveId] = useState<WorkspaceGuideModuleId | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : internalOpen;

  useEffect(() => {
    function onOpen(event: Event) {
      const detail = (event as CustomEvent<WorkspaceGuideOpenDetail>).detail;
      if (!detail?.guideId) return;
      const guide = getWorkspaceGuide(detail.guideId);
      if (!guide) return;
      setActiveId(guide.id);
      const idx = detail.stepId
        ? Math.max(
            0,
            guide.steps.findIndex((s) => s.id === detail.stepId),
          )
        : 0;
      setStepIndex(idx === -1 ? 0 : idx);
      setInternalOpen(true);
    }
    window.addEventListener(WORKSPACE_GUIDE_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(WORKSPACE_GUIDE_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (controlledId) {
      setActiveId(controlledId);
      const guide = getWorkspaceGuide(controlledId);
      if (guide && controlledStepId) {
        const idx = guide.steps.findIndex((s) => s.id === controlledStepId);
        setStepIndex(idx >= 0 ? idx : 0);
      } else {
        setStepIndex(0);
      }
    }
  }, [controlledId, controlledStepId]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- close is stable enough
  }, [open]);

  const guide = useMemo(
    () => (activeId ? getWorkspaceGuide(activeId) : null),
    [activeId],
  );

  function close() {
    setInternalOpen(false);
    onClose?.();
  }

  if (!open || !guide) {
    return null;
  }

  const step = guide.steps[stepIndex] ?? guide.steps[0];
  const { highlights } = activeHighlights(guide, stepIndex);
  const snapshot =
    guide.snapshots.find((s) => s.id === step?.snapshotId) ??
    guide.snapshots[0];
  const hasSteps = guide.steps.length > 0;

  return (
    <div className="ws-guide-overlay" role="presentation">
      <button
        type="button"
        className="ws-guide-overlay-backdrop"
        aria-label="Close guide"
        onClick={close}
      />
      <div
        className="ws-guide-overlay-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="ws-guide-overlay-header">
          <div>
            <p className="ws-guide-overlay-kicker">How to use</p>
            <h2 id={titleId}>{guide.title}</h2>
            <p className="ws-guide-overlay-summary">{guide.summary}</p>
          </div>
          <button
            type="button"
            className="ws-guide-overlay-close"
            aria-label="Close"
            onClick={close}
          >
            <X size={18} />
          </button>
        </header>

        <div className="ws-guide-overlay-body">
          {snapshot ? (
            <div className="ws-guide-snapshot">
              <Image
                src={snapshot.src}
                alt={snapshot.alt}
                width={1280}
                height={720}
                className="ws-guide-snapshot-img"
                priority
              />
              {highlights.map((h) => (
                <span
                  key={h.id}
                  className={`ws-guide-callout ws-guide-callout-${h.shape ?? "circle"}`}
                  style={{
                    left: `${h.x}%`,
                    top: `${h.y}%`,
                    width: `${h.w}%`,
                    height: `${h.h}%`,
                  }}
                  aria-hidden
                >
                  {h.label ? (
                    <span className="ws-guide-callout-label">{h.label}</span>
                  ) : null}
                </span>
              ))}
            </div>
          ) : (
            <div className="ws-guide-snapshot ws-guide-snapshot-empty">
              <CircleHelp size={28} aria-hidden />
              <p>Visual walkthrough for this module is coming soon.</p>
            </div>
          )}

          <div className="ws-guide-step-panel">
            {hasSteps && step ? (
              <>
                <p className="ws-guide-step-count">
                  Step {stepIndex + 1} of {guide.steps.length}
                </p>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </>
            ) : (
              <p>{guide.summary}</p>
            )}
            {guide.tips && guide.tips.length > 0 ? (
              <ul className="ws-guide-tips">
                {guide.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>

        {hasSteps ? (
          <footer className="ws-guide-overlay-footer">
            <button
              type="button"
              className="btn-secondary btn-sm"
              disabled={stepIndex <= 0}
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            >
              <ChevronLeft size={16} aria-hidden />
              Back
            </button>
            {stepIndex < guide.steps.length - 1 ? (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() =>
                  setStepIndex((i) => Math.min(guide.steps.length - 1, i + 1))
                }
              >
                Next
                <ChevronRight size={16} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={close}
              >
                Done
              </button>
            )}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
