"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import {
  saveAiReplySettingsAction,
  type AiSettingsActionState,
} from "@/app/ai/app/settings/actions";
import type { AiReplyUsageSummary } from "@/lib/integrations/ai-reply-settings";

const initialState: AiSettingsActionState = { ok: false, message: "" };

export function AiReplySettingsPanel({
  canEdit,
  openaiConfigured,
  summary,
}: {
  canEdit: boolean;
  openaiConfigured: boolean;
  summary: AiReplyUsageSummary;
}) {
  const [state, action, pending] = useActionState(
    saveAiReplySettingsAction,
    initialState,
  );
  const usagePct =
    summary.dailyLimit > 0
      ? Math.min(100, Math.round((summary.usedToday / summary.dailyLimit) * 100))
      : 0;

  return (
    <section className="ws-settings-pro-ai-card" id="ai-reply-limits">
      <h2 className="ws-settings-pro-ai-title">
        WhatsApp AI reply limits
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Caps OpenAI usage for inbound WhatsApp knowledge replies. Resets at
        midnight India time ({summary.dayLabel}).
      </p>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">OpenAI on server</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {openaiConfigured ? "Configured" : "Not enabled — contact admin"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">AI replies today</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {summary.usedToday.toLocaleString()} /{" "}
            {summary.dailyLimit.toLocaleString()} ({summary.remainingToday}{" "}
            left)
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Handoffs today</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {summary.handoffsToday.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Tokens today</dt>
          <dd className="mt-1 font-medium text-slate-900">
            {summary.tokensToday.toLocaleString()}
          </dd>
        </div>
      </dl>

      <div className="saas-task-ai-meter mt-4" aria-hidden>
        <span style={{ width: `${usagePct}%` }} />
      </div>

      {canEdit ? (
        <form action={action} className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex min-w-[12rem] flex-col gap-1 text-sm">
            Daily AI replies
            <input
              className="rounded-lg border border-slate-300 px-3 py-2"
              defaultValue={String(summary.dailyLimit)}
              max={10000}
              min={1}
              name="dailyLimit"
              required
              type="number"
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              defaultChecked={summary.enabled}
              name="enabled"
              type="checkbox"
              value="on"
            />
            Enable WhatsApp AI replies
          </label>
          <button
            className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            disabled={pending}
            type="submit"
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="animate-spin" size={14} aria-hidden />
                Saving...
              </span>
            ) : (
              "Save limits"
            )}
          </button>
          {state.message ? (
            <span
              className={
                state.ok ? "text-sm text-emerald-600" : "text-sm text-rose-600"
              }
            >
              {state.message}
            </span>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
