import Link from "next/link";
import { MisScoreBadge } from "@/components/saas/mis-score-badge";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { checklistMisScore, taskMisScore, aggregateMisScore } from "@/lib/mis/score";
import { canCreateTasks, listDelegatedTasks } from "@/lib/tasks";
import { redirect } from "next/navigation";

export default async function TasksScoresPage() {
  const user = await requireSession(undefined, { module: "TASKS" });

  if (!canCreateTasks(user.role)) {
    redirect("/app/tasks/my-work");
  }

  const taskPage = await listDelegatedTasks(
    user,
    { includeCompleted: true },
    { page: 1, pageSize: 100 },
  );

  const rows = taskPage.items.map((task) => {
    const checklistDone =
      task.attachments.length > 0 || task.status === "COMPLETED" ? 1 : 0;
    const taskScore = taskMisScore({
      status: task.status,
      dueAt: task.dueAt,
      completedAt: task.completedAt,
    });
    const checklist = checklistMisScore(checklistDone, 1);
    const combined = aggregateMisScore([taskScore.score, checklist.score]);

    return { task, taskScore, checklist, combined };
  });

  const byAssignee = new Map<
    string,
    { name: string; scores: number[]; checklistScores: number[] }
  >();

  for (const row of rows) {
    const id = row.task.assignee.id;
    const name = row.task.assignee.name ?? row.task.assignee.email.split("@")[0];
    const bucket = byAssignee.get(id) ?? { name, scores: [], checklistScores: [] };
    bucket.scores.push(row.taskScore.score);
    bucket.checklistScores.push(row.checklist.score);
    byAssignee.set(id, bucket);
  }

  const assigneeRows = [...byAssignee.entries()].map(([id, data]) => ({
    id,
    name: data.name,
    taskScore: aggregateMisScore(data.scores),
    checklistScore: aggregateMisScore(data.checklistScores),
    count: data.scores.length,
  }));

  const orgTaskAvg =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.taskScore.score, 0) / rows.length)
      : 100;
  const orgChecklistAvg =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.checklist.score, 0) / rows.length)
      : 100;

  return (
    <div className="saas-page ws-tasks-page ws-tasks-sf">
      <TaskPageToolbar
        title="MIS scores"
        description="Task performance and checklist completion. Same scoring model as FMS stops."
        actions={
          <Link href="/app/reports" className="btn-secondary btn-sm">
            Reports & MIS
          </Link>
        }
      />

      <div className="ws-sf-metrics ws-fms-metrics">
        <div className="ws-sf-metric-tile">
          <span>Task score</span>
          <strong>{orgTaskAvg}</strong>
          <span className="ws-stat-card-hint">Org average</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Checklist score</span>
          <strong>{orgChecklistAvg}</strong>
          <span className="ws-stat-card-hint">Proof completion</span>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Tasks tracked</span>
          <strong>{rows.length}</strong>
          <span className="ws-stat-card-hint">In scope</span>
        </div>
      </div>

      {assigneeRows.length === 0 ? (
        <div className="ws-empty-state">
          <p>No tasks to score yet.</p>
        </div>
      ) : (
        <div className="ws-sf-table-wrap">
          <table className="ws-fms-data-table ws-sf-data-table ws-mis-score-table">
            <thead>
              <tr>
                <th>Assignee</th>
                <th>Tasks</th>
                <th>Task score</th>
                <th>Checklist score</th>
              </tr>
            </thead>
            <tbody>
              {assigneeRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td className="ws-fms-table-meta">{row.count}</td>
                  <td>
                    <MisScoreBadge score={row.taskScore} />
                  </td>
                  <td>
                    <MisScoreBadge score={row.checklistScore} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="ws-fms-muted ws-mis-score-footnote">
        Task MIS: on-time completion = 100, minus ~2 pts/hour late. Checklist = proof
        uploaded vs required items. Combined view feeds Reports & MIS.
      </p>
    </div>
  );
}
