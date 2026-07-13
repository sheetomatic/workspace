import Link from "next/link";
import { Suspense } from "react";
import { EmPeriodFilter } from "@/components/saas/em-period-filter";
import { EmReadyBoard } from "@/components/saas/em-ready-board";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { WorkspaceGuideButton } from "@/components/saas/workspace-guide-button";
import { getEmReadyPayload } from "@/lib/em/em-ready-data";
import { parseEmPeriodParams } from "@/lib/em/em-period";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    period?: string;
    week?: string;
    month?: string;
    year?: string;
    from?: string;
    to?: string;
  }>;
};

export default async function EmReadyPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "REPORTS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/reports");
  }

  const params = await searchParams;
  const period = parseEmPeriodParams(params);
  const payload = await getEmReadyPayload(user, period);

  return (
    <div className="saas-page ws-mis-page ws-fms-sf ws-em-page">
      <TaskPageToolbar
        title="EM Ready"
        description="Executive meeting board with period-wise exceptions and zero prep."
        actions={
          <>
            <WorkspaceGuideButton guideId="em" />
            {payload.fmsEnabled ? (
              <Link href="/app/fms/lines" className="btn-secondary btn-sm">
                Live pipelines
              </Link>
            ) : null}
            {payload.tasksEnabled ? (
              <Link href="/app/tasks" className="btn-secondary btn-sm">
                Task board
              </Link>
            ) : null}
            <Link href="/app/reports" className="btn-secondary btn-sm">
              MIS reports
            </Link>
          </>
        }
      />

      <Suspense
        fallback={
          <div className="ws-task-filter-bar ws-em-period-filter is-loading">
            Loading period filter...
          </div>
        }
      >
        <EmPeriodFilter current={period} />
      </Suspense>

      <EmReadyBoard payload={payload} />
    </div>
  );
}
