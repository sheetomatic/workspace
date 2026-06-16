import Link from "next/link";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listFmsInstances } from "@/lib/fms/queries";
import { fmsJobMisScore, fmsStepMisScore } from "@/lib/mis/score";
import { redirect } from "next/navigation";

export default async function FmsScoresPage() {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const instances = await listFmsInstances(user.organizationId);
  const activeJobs = instances.filter((job) => job.status === "ACTIVE");

  const lineScores = activeJobs.map((job) => {
    const score = fmsJobMisScore(job.stepStates);
    const current = job.stepStates.find((s) => s.status === "IN_PROGRESS");
    const stepScore = current ? fmsStepMisScore(current) : null;
    return { job, score, stepScore, current };
  });

  const orgAvg =
    lineScores.length > 0
      ? Math.round(
          lineScores.reduce((sum, row) => sum + row.score.score, 0) / lineScores.length,
        )
      : 100;

  return (
    <div className="saas-page ws-fms-page ws-fms-sf">
      <TaskPageToolbar
        title="MIS scores"
        description="On-time performance across FMS lines. Scores reflect SLA adherence at each stop."
        actions={
          <Link href="/app/reports" className="btn-secondary btn-sm">
            Reports & MIS
          </Link>
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Org FMS score</span>
          <strong>{orgAvg}</strong>
          <span className="ws-stat-card-hint">Active lines average</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Lines tracked</span>
          <strong>{lineScores.length}</strong>
          <span className="ws-stat-card-hint">In pipeline</span>
        </div>
      </div>

      {lineScores.length === 0 ? (
        <div className="ws-empty-state ws-fms-empty-state">
          <p>No active lines to score yet.</p>
        </div>
      ) : (
        <div className="ws-sf-table-wrap">
          <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Current stop</th>
                <th>Line score</th>
                <th>Current stop score</th>
              </tr>
            </thead>
            <tbody>
              {lineScores.map(({ job, score, stepScore, current }) => (
                <tr key={job.id}>
                  <td>
                    <Link
                      href={`/app/fms/instances/${job.id}`}
                      className="ws-sf-record-link"
                    >
                      {job.referenceLabel ?? job.template.name}
                    </Link>
                  </td>
                  <td className="ws-fms-table-meta">
                    {current?.step.stepName ?? "Complete"}
                  </td>
                  <td>
                    <MisScoreBadge score={score} />
                  </td>
                  <td>
                    {stepScore ? <MisScoreBadge score={stepScore} /> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="ws-fms-muted ws-mis-score-footnote">
        FMS MIS score: 100 for on-time stops, minus ~2 points per hour late. Feeds into
        Reports & MIS alongside Tasks and checklist scores.
      </p>
    </div>
  );
}
