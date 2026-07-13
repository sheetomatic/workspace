"use client";

import { WorkspaceGuideOverlay } from "@/components/saas/workspace-guide-overlay";

/** Mount once in Workspace so How to use + Ask guide can open snapshots. */
export function WorkspaceGuideHost() {
  return <WorkspaceGuideOverlay />;
}
