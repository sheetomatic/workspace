"use client";

import { useActionState } from "react";
import {
  saveTaskAiSettings,
  type WorkspaceSettingsState,
} from "@/app/app/settings/actions";
import type { TaskAiUsageSummary } from "@/lib/integrations/task-ai-settings";

const initialState: WorkspaceSettingsState = { ok: false, message: "" };

export function TaskAiSettingsPanel({
  canEdit,
  openaiConfigured,
  summary,
}: {
  canEdit: boolean;
  openaiConfigured: boolean;
  summary: TaskAiUsageSummary;
}) {
  const [state, action, pending] = useActionState(saveTaskAiSettings, initialState);
  const usagePct =
    summary.dailyLimit > 0
      ? Math.min(100, Math.round((summary.usedToday / summary.dailyLimit) * 100))
      : 0;

  return (
    <div className="saas-task-ai-panel">
      <p className="saas-panel-lead">
        Voice and text task parsing on the Tasks page. Limits reset at midnight
        India time ({summary.dayLabel}).
      </p>

      <dl className="saas-settings-list saas-settings-list-meta">
        <div>
          <dt>OpenAI on server</dt>
          <dd>
            <span className={openaiConfigured ? "saas-pill ok" : "saas-pill warn"}>
              {openaiConfigured ? "Configured" : "Missing OPENAI_API_KEY"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Task AI status</dt>
          <dd>
            <span className={summary.enabled ? "saas-pill ok" : "saas-pill muted"}>
              {summary.enabled ? "Enabled" : "Disabled"}
            </span>
          </dd>
        </div>
        <div>
          <dt>Used today</dt>
          <dd>
            {summary.usedToday.toLocaleString()} / {summary.dailyLimit.toLocaleString()}{" "}
            ({summary.remainingToday.toLocaleString()} left)
          </dd>
        </div>
        <div>
          <dt>Breakdown</dt>
          <dd>
            Parse {summary.parseToday.toLocaleString()} | Voice{" "}
            {summary.transcribeToday.toLocaleString()} | Tokens{" "}
            {summary.tokensToday.toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="saas-task-ai-meter" aria-hidden>
        <span style={{ width: `${usagePct}%` }} />
      </div>

      {canEdit ? (
        <form action={action} className="saas-task-ai-form">
          <label>
            Daily AI calls (parse + voice)
            <input
              defaultValue={String(summary.dailyLimit)}
              max={10000}
              min={1}
              name="dailyLimit"
              type="number"
            />
          </label>
          <label className="saas-checkbox-row">
            <input defaultChecked={summary.enabled} name="enabled" type="checkbox" />
            Allow Task AI for this workspace
          </label>
          <button className="btn-secondary" disabled={pending} type="submit">
            {pending ? "Saving..." : "Save Task AI limits"}
          </button>
          {state.message ? (
            <p
              className={
                state.ok ? "saas-form-message success" : "saas-form-message error"
              }
              role="status"
            >
              {state.message}
            </p>
          ) : null}
        </form>
      ) : (
        <p className="saas-panel-lead">
          Daily limits are managed by workspace admins.
        </p>
      )}
    </div>
  );
}
