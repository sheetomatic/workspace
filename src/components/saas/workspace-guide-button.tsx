"use client";

import { CircleHelp } from "lucide-react";
import {
  openWorkspaceGuide,
  openWorkspaceGuideAssistant,
} from "@/lib/workspace-guides/events";
import type { WorkspaceGuideModuleId } from "@/lib/workspace-guides";
import { SheetomaticAiMark } from "@/components/saas/sheetomatic-ai-mark";

export function WorkspaceGuideButton({
  guideId,
  label = "How to use",
  variant = "secondary",
  openAssistant = false,
}: {
  guideId: WorkspaceGuideModuleId;
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
  /** When true, opens Pulse chat seeded for this module instead of overlay. */
  openAssistant?: boolean;
}) {
  const className =
    variant === "primary"
      ? "btn-primary btn-sm ws-guide-howto-btn"
      : variant === "ghost"
        ? "ws-guide-howto-btn ws-guide-howto-ghost"
        : "btn-secondary btn-sm ws-guide-howto-btn";

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (openAssistant) {
          openWorkspaceGuideAssistant(`How do I use ${guideId}?`);
          return;
        }
        openWorkspaceGuide(guideId);
      }}
    >
      {openAssistant ? (
        <SheetomaticAiMark
          variant="icon"
          sizes="sm"
          onDark={variant === "primary"}
          className={variant === "primary" ? "ws-fms-ai-btn-mark" : undefined}
        />
      ) : (
        <CircleHelp size={15} aria-hidden />
      )}
      {label}
    </button>
  );
}
