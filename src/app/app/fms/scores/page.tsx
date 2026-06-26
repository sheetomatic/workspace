import Link from "next/link";
import {
  MisCategorySummaryTable,
  MisDataViewTable,
} from "@/components/saas/mis-category-table";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { canAccessEmReady } from "@/lib/em/em-access";
import { listFmsInstancesPage } from "@/lib/fms/queries";
import {
  buildFmsMisRows,
  categorySummary,
  filterMisRows,
} from "@/lib/mis/reports-data";
import { redirect } from "next/navigation";

type PageProps = {
  searchParams: Promise<{ category?: string; metric?: string }>;
};

export default async function FmsScoresPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const params = await searchParams;
  const fmsPage = await listFmsInstancesPage(user.organizationId, {
    status: "ALL",
    page: 1,
    pageSize: 500,
  });

  const fmsRows = buildFmsMisRows(fmsPage.items);
  const summary = categorySummary("FMS", fmsRows);
  const detailRows = filterMisRows(fmsRows, params);
  const showEmReady = canAccessEmReady(user);

  return (
    <div className="saas-page ws-mis-page ws-fms-sf">
      <TaskPageToolbar
        title="MIS scores"
        description="FMS line performance with deficit tracking. Click any number to drill down."
        actions={
          <>
            {showEmReady ? (
              <Link href="/app/em" className="btn-primary btn-sm ws-sf-btn-primary">
                EM Ready
              </Link>
            ) : null}
            <Link href="/app/reports" className="btn-secondary btn-sm">
              Reports & MIS
            </Link>
          </>
        }
      />

      <MisCategorySummaryTable
        basePath="/app/fms/scores"
        itemCount={fmsRows.length}
        summaries={[summary]}
      />

      <MisDataViewTable basePath="/app/fms/scores" rows={detailRows} />

      <p className="ws-fms-muted ws-mis-score-footnote">
        FMS MIS score: 100 for on-time stops, minus ~2 points per hour late. Deficit
        % is shown as a negative gap from 100.
      </p>
    </div>
  );
}
