import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getFmsPerformanceSummary } from "@/lib/fms/queries";
import { isStepOverdue } from "@/lib/fms/step-display";
import { redirect } from "next/navigation";

function formatWeekLabel(isoDate: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(new Date(`${isoDate}T12:00:00`));
}

export default async function FmsPerformancePage() {
  const user = await requireSession(undefined, { module: "FMS" });

  if (!hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/my-stops");
  }

  const templates = await getFmsPerformanceSummary(user.organizationId);

  const fmsRows = templates.map((template) => {
    const steps = template.instances.flatMap((i) => i.stepStates);
    const inProgress = steps.filter((s) => s.status === "IN_PROGRESS");
    const delayed = inProgress.filter((s) =>
      isStepOverdue(s.status, s.plannedAt, s.actualAt, s.delayMinutes),
    ).length;
    return {
      id: template.id,
      name: template.name,
      activeLeads: template.instances.length,
      inProgress: inProgress.length,
      delayed,
      onTrack: inProgress.length - delayed,
    };
  });

  const doerMap = new Map<
    string,
    { name: string; active: number; delayed: number }
  >();
  for (const template of templates) {
    for (const instance of template.instances) {
      for (const step of instance.stepStates) {
        if (step.status !== "IN_PROGRESS" || !step.owner) {
          continue;
        }
        const key = step.owner.id;
        const row = doerMap.get(key) ?? {
          name: step.owner.name ?? step.owner.email.split("@")[0],
          active: 0,
          delayed: 0,
        };
        row.active += 1;
        if (
          isStepOverdue(
            step.status,
            step.plannedAt,
            step.actualAt,
            step.delayMinutes,
          )
        ) {
          row.delayed += 1;
        }
        doerMap.set(key, row);
      }
    }
  }
  const doerRows = [...doerMap.values()].sort((a, b) => b.active - a.active);

  const weekMap = new Map<string, number>();
  for (const template of templates) {
    for (const instance of template.instances) {
      const weekStart = new Date(instance.createdAt);
      weekStart.setHours(0, 0, 0, 0);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    }
  }
  const weekRows = [...weekMap.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8);

  const totalActiveLeads = fmsRows.reduce((sum, row) => sum + row.activeLeads, 0);
  const totalDelayed = fmsRows.reduce((sum, row) => sum + row.delayed, 0);
  const totalInProgress = fmsRows.reduce((sum, row) => sum + row.inProgress, 0);
  const totalOnTrack = fmsRows.reduce((sum, row) => sum + row.onTrack, 0);

  return (
    <div className="saas-page ws-fms-page ws-fms-sf ws-fms-performance-page">
      <TaskPageToolbar
        title="Performance"
        description="FMS summary by workflow, doer, and week."
        actions={
          <Link href="/app/fms/lines" className="btn-secondary btn-sm">
            Live pipelines
          </Link>
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics ws-fms-perf-metrics">
        <div className="ws-sf-metric-tile">
          <span>Active workflows</span>
          <strong>{fmsRows.length}</strong>
          <span className="ws-stat-card-hint">Running now</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Active leads</span>
          <strong>{totalActiveLeads}</strong>
          <span className="ws-stat-card-hint">Across all FMS</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>On track</span>
          <strong>{totalOnTrack}</strong>
          <span className="ws-stat-card-hint">Of {totalInProgress} in progress</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Delayed</span>
          <strong>{totalDelayed}</strong>
          <span className="ws-stat-card-hint">
            {totalDelayed > 0 ? "Needs attention" : "None overdue"}
          </span>
        </div>
      </div>

      <div className="ws-fms-perf-grid">
        <section className="ws-sf-card ws-fms-section">
          <header className="ws-fms-section-heading">
            <h2>FMS wise</h2>
            <p>Active leads and stop health per workflow.</p>
          </header>
          <div className="ws-fms-perf-table-wrap">
            <table className="ws-fms-perf-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Active leads</th>
                  <th>In progress</th>
                  <th>On track</th>
                  <th>Delayed</th>
                </tr>
              </thead>
              <tbody>
                {fmsRows.map((row) => (
                  <tr key={row.id}>
                    <td className="ws-fms-perf-workflow">
                      <Link
                        href={`/app/fms/lines#fms-${row.id}`}
                        title={row.name}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.activeLeads}</td>
                    <td>{row.inProgress}</td>
                    <td>{row.onTrack}</td>
                    <td className={row.delayed > 0 ? "is-late" : ""}>
                      {row.delayed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ws-sf-card ws-fms-section">
          <header className="ws-fms-section-heading">
            <h2>Doer wise</h2>
            <p>Who is holding active stops right now.</p>
          </header>
          <div className="ws-fms-perf-table-wrap">
            <table className="ws-fms-perf-table">
              <thead>
                <tr>
                  <th>Doer</th>
                  <th>Active stops</th>
                  <th>Delayed</th>
                </tr>
              </thead>
              <tbody>
                {doerRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>No active stops assigned.</td>
                  </tr>
                ) : (
                  doerRows.map((row) => (
                    <tr key={row.name}>
                      <td className="ws-fms-perf-doer">{row.name}</td>
                      <td>{row.active}</td>
                      <td className={row.delayed > 0 ? "is-late" : ""}>
                        {row.delayed}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="ws-sf-card ws-fms-section">
        <header className="ws-fms-section-heading">
          <h2>Week wise</h2>
          <p>New leads started per week (Sunday start).</p>
        </header>
        <div className="ws-fms-perf-table-wrap ws-fms-perf-table-wrap-narrow">
          <table className="ws-fms-perf-table">
            <thead>
              <tr>
                <th>Week starting</th>
                <th>New leads</th>
              </tr>
            </thead>
            <tbody>
              {weekRows.map(([week, count]) => (
                <tr key={week}>
                  <td>{formatWeekLabel(week)}</td>
                  <td>{count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
