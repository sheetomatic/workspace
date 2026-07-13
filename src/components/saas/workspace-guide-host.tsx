"use client";

import { WorkspaceGuideOverlay } from "@/components/saas/workspace-guide-overlay";

/** Mount once in Workspace so How to use + Pulse can open snapshots. */
export function WorkspaceGuideHost() {
  return <WorkspaceGuideOverlay />;
}
