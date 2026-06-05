import Link from "next/link";
import { Workflow, ChevronRight } from "lucide-react";
import type { getWorkflowStatuses, WorkflowStatus } from "@/lib/ai-module-data";

type WorkflowsData = Awaited<ReturnType<typeof getWorkflowStatuses>>;

function statusLabel(status: WorkflowStatus) {
  if (status === "live") return "Live";
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  return "Setup";
}

export function AiWorkflowsPanel({ data }: { data: WorkflowsData }) {
  return (
    <div className="ai-workflows-page">
      <header className="ai-workflows-head">
        <span className="ai-workflows-icon" aria-hidden>
          <Workflow size={22} />
        </span>
        <div>
          <h1>Workflows</h1>
          <p>
            WhatsApp automations running in your workspace - AI replies, lead capture, tasks,
            and CRM follow-ups.
          </p>
        </div>
        <Link className="ai-workflows-head-cta" href="/ai/app/campaign">
          {data.stats.isLive ? "Manage Go Live" : "Go Live"}
        </Link>
      </header>

      <div className="ai-workflows-summary">
        <article>
          <span>Channel</span>
          <strong>{data.stats.isLive ? "Live" : "Paused"}</strong>
        </article>
        <article>
          <span>Active tasks</span>
          <strong>{data.delegatedTasks}</strong>
        </article>
        <article>
          <span>CRM follow-ups</span>
          <strong>{data.openFollowUps}</strong>
        </article>
        <article>
          <span>Templates</span>
          <strong>{data.approvedTemplates}</strong>
        </article>
      </div>

      <div className="ai-workflows-table-wrap">
        <table className="ai-workflows-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Trigger</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data.workflows.map((flow) => (
              <tr key={flow.id}>
                <td>
                  <strong>{flow.name}</strong>
                  <span>{flow.description}</span>
                  <em>{flow.metric}</em>
                </td>
                <td>{flow.trigger}</td>
                <td>
                  <span className={`ai-workflows-status tone-${flow.status}`}>
                    {statusLabel(flow.status)}
                  </span>
                </td>
                <td>
                  <Link href={flow.href}>
                    {flow.actionLabel}
                    <ChevronRight size={14} aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!data.stats.integrationsConnected ? (
        <p className="ai-workflows-hint">
          Connect RedLava in{" "}
          <Link href="/ai/app/settings">Settings</Link> to enable task delegation and
          outbound templates.
        </p>
      ) : null}
    </div>
  );
}
