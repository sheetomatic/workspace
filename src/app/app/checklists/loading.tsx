import { WorkspaceRouteSkeleton } from "@/components/saas/workspace-route-skeleton";

export default function Loading() {
  return <WorkspaceRouteSkeleton label="Loading checklists…" cards={3} />;
}
