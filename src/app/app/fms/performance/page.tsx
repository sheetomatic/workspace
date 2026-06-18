import Link from "next/link";
import { Suspense } from "react";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { FmsPerformanceDashboard } from "@/components/saas/fms-performance-dashboard";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getFmsPerformanceSummary } from "@/lib/fms/queries";
import { buildPerformancePayload } from "@/lib/fms/performance-data";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{
    fms?: string;
    doer?: string;
    due?: string;
  }>;
};

export default async function FmsPerformancePage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const query = await searchParams;
  const templates = await getFmsPerformanceSummary(user.organizationId);
  const payload = buildPerformancePayload(templates, {
    fms: query.fms,
    doer: query.doer,
    due: query.due,
  });

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-performance-page">
      <TaskPageToolbar
        title="Performance"
        description="Charts and tables with FMS, doer, and due-date filters."
        actions={
          <Link href="/app/fms/lines" className="btn-secondary btn-sm">
            Live pipelines
          </Link>
        }
      />

      <Suspense fallback={<p className="ws-fms-muted">Loading filters...</p>}>
        <FmsPerformanceDashboard
          payload={payload}
          current={{
            fms: query.fms,
            doer: query.doer,
            due: query.due,
          }}
        />
      </Suspense>
    </div>
  );
}
