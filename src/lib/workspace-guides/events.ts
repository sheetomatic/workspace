import type { WorkspaceGuideModuleId } from "@/lib/workspace-guides";

export const WORKSPACE_GUIDE_OPEN_EVENT = "workspace-guide:open";
export const WORKSPACE_GUIDE_ASSISTANT_EVENT = "workspace-guide:assistant";

export type WorkspaceGuideOpenDetail = {
  guideId: WorkspaceGuideModuleId;
  stepId?: string | null;
};

export type WorkspaceGuideAssistantDetail = {
  open?: boolean;
  seedPrompt?: string;
};

export function openWorkspaceGuide(
  guideId: WorkspaceGuideModuleId,
  stepId?: string | null,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WorkspaceGuideOpenDetail>(WORKSPACE_GUIDE_OPEN_EVENT, {
      detail: { guideId, stepId: stepId ?? null },
    }),
  );
}

export function openWorkspaceGuideAssistant(seedPrompt?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WorkspaceGuideAssistantDetail>(
      WORKSPACE_GUIDE_ASSISTANT_EVENT,
      { detail: { open: true, seedPrompt } },
    ),
  );
}
