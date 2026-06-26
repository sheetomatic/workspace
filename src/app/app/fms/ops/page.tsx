import Link from "next/link";
import { FmsOpsBoard } from "@/components/saas/fms-ops-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getFmsOpsPage, getFmsPipelineCounts } from "@/lib/fms/queries";
import { listRecentFmsAudit } from "@/lib/fms/audit";
import { getFmsNotificationHealth } from "@/lib/fms/notification-health";
import { fmsPageFromSearchParam } from "@/lib/scale";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ overduePage?: string; unassignedPage?: string }>;
};

export default async function FmsOpsPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const overduePage = fmsPageFromSearchParam(params.overduePage);
  const unassignedPage = fmsPageFromSearchParam(params.unassignedPage);

  const [ops, recentActivity, pipelineCounts, notifyHealth] = await Promise.all([
    getFmsOpsPage(user.organizationId, { overduePage, unassignedPage }),
    listRecentFmsAudit(user.organizationId, 15),
    getFmsPipelineCounts(user.organizationId),
    getFmsNotificationHealth(user.organizationId),
  ]);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-ops-page">
      <TaskPageToolbar
        title="Ops monitor"
        description="WHO / WHEN / delay - chase overdue FMS stops and fix unassigned owners."
        actions={
          <>
            <Link href="/app/em" className="btn-secondary btn-sm">
              EM Ready
            </Link>
            <Link href="/app/fms/lines" className="btn-secondary btn-sm">
              Live pipelines
            </Link>
          </>
        }
      />
      <FmsOpsBoard
        pipelineCounts={pipelineCounts}
        ops={ops}
        notifyHealth={notifyHealth}
        recentActivity={recentActivity}
        searchParams={params}
      />
    </div>
  );
}
