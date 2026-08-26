"use client";

import { useState } from "react";
import {
  SCRIPT_HELP,
  downloadPdf,
  planBotTasks,
  type AppBot,
  type AppBotTask,
  type AppConfig,
  type BotEventKind,
  type BotTaskKind,
} from "@/lib/app-builder";
import { dispatchAppBuilderBotAction } from "@/app/app/app-builder/actions";
import type { SheetAdapter } from "../sheet/mockAdapter";

const EVENTS: { id: BotEventKind; label: string }[] = [
  { id: "adds", label: "Data change: adds" },
  { id: "updates", label: "Data change: updates" },
  { id: "adds_or_updates", label: "Data change: adds or updates" },
  { id: "deletes", label: "Data change: deletes" },
  { id: "manual", label: "Manual (Run now)" },
  { id: "schedule", label: "Schedule (preview)" },
];

const TASKS: { id: BotTaskKind; label: string }[] = [
  { id: "whatsapp", label: "Send WhatsApp" },
  { id: "email", label: "Send email" },
  { id: "pdf", label: "Create PDF file" },
  { id: "script", label: "Run script" },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

export function BotsPanel({
  config,
  sheet,
  onChange,
}: {
  config: AppConfig;
  sheet: SheetAdapter;
  onChange: (next: AppConfig) => void;
}) {
  const bots = config.bots || [];
  const tables = Object.keys(sheet.getWorkbook().tabs);
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);

  function setBots(next: AppBot[]) {
    onChange({ ...config, bots: next });
  }

  function patch(id: string, patch: Partial<AppBot>) {
    setBots(bots.map((bot) => (bot.id === id ? { ...bot, ...patch } : bot)));
  }

  function patchTask(botId: string, taskId: string, patch: Partial<AppBotTask>) {
    setBots(
      bots.map((bot) =>
        bot.id === botId
          ? {
              ...bot,
              tasks: bot.tasks.map((task) =>
                task.id === taskId ? { ...task, ...patch } : task,
              ),
            }
          : bot,
      ),
    );
  }

  async function runNow(bot: AppBot) {
    const row = sheet.listRows(bot.table)[0];
    if (!row) {
      setLog(`No rows in ${bot.table || "that table"} to run against.`);
      return;
    }
    setBusy(true);
    const planned = planBotTasks(bot, row.cells);
    if (!planned.length) {
      setBusy(false);
      setLog("Bot did not fire — check the condition against the first row.");
      return;
    }
    for (const action of planned) {
      if (action.kind === "pdf" && action.pdfBase64) {
        const bytes = Uint8Array.from(atob(action.pdfBase64), (ch) => ch.charCodeAt(0));
        downloadPdf(action.fileName || "document.pdf", bytes);
      }
    }
    const sendable = planned.filter(
      (action): action is typeof action & { kind: "email" | "whatsapp" } =>
        action.kind === "email" || action.kind === "whatsapp",
    );
    const sent = sendable.length
      ? await dispatchAppBuilderBotAction(
          sendable.map((action) => ({
            kind: action.kind,
            to: action.to,
            subject: action.subject,
            body: action.body,
          })),
        )
      : { ok: true, message: "PDF downloaded." };
    setBusy(false);
    setLog(
      [
        ...planned.map((action) => action.message),
        sent.message,
      ].join(" · "),
    );
  }

  return (
    <div className="plain bots-panel">
      <h2>Bots & automation</h2>
      <p className="hint">
        AppSheet-style: a data change (or Run now) starts a bot. Tasks can send
        WhatsApp, email, create a PDF in a folder, or run a short script.
      </p>
      {bots.map((bot) => (
        <article key={bot.id} className="bot-card">
          <header>
            <label className="check">
              <input
                type="checkbox"
                checked={bot.enabled}
                onChange={(e) => patch(bot.id, { enabled: e.target.checked })}
              />
              On
            </label>
            <input
              value={bot.name}
              onChange={(e) => patch(bot.id, { name: e.target.value })}
              aria-label="Bot name"
            />
            <button
              type="button"
              className="linkish"
              onClick={() => setBots(bots.filter((item) => item.id !== bot.id))}
            >
              Delete
            </button>
          </header>
          <label className="field-label">
            Table
            <select
              value={bot.table}
              onChange={(e) => patch(bot.id, { table: e.target.value })}
            >
              <option value="">Select table</option>
              {tables.map((table) => (
                <option key={table} value={table}>
                  {table}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Event
            <select
              value={bot.event}
              onChange={(e) =>
                patch(bot.id, { event: e.target.value as BotEventKind })
              }
            >
              {EVENTS.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Condition (optional formula)
            <input
              value={bot.condition || ""}
              onChange={(e) => patch(bot.id, { condition: e.target.value })}
              placeholder={'[Stage]="Quote"'}
            />
          </label>
          {bot.tasks.map((task) => (
            <div key={task.id} className="bot-task">
              <label className="field-label">
                Task
                <select
                  value={task.kind}
                  onChange={(e) =>
                    patchTask(bot.id, task.id, {
                      kind: e.target.value as BotTaskKind,
                    })
                  }
                >
                  {TASKS.map((kind) => (
                    <option key={kind.id} value={kind.id}>
                      {kind.label}
                    </option>
                  ))}
                </select>
              </label>
              {task.kind === "script" ? (
                <label className="field-label">
                  Script
                  <textarea
                    rows={4}
                    value={task.script || ""}
                    onChange={(e) =>
                      patchTask(bot.id, task.id, { script: e.target.value })
                    }
                    placeholder={SCRIPT_HELP}
                  />
                </label>
              ) : (
                <>
                  {task.kind !== "pdf" ? (
                    <label className="field-label">
                      {task.kind === "email" ? "To email" : "To phone"}
                      <input
                        value={task.to || ""}
                        onChange={(e) =>
                          patchTask(bot.id, task.id, { to: e.target.value })
                        }
                        placeholder={task.kind === "email" ? "[Email]" : "[Phone]"}
                      />
                    </label>
                  ) : null}
                  {task.kind === "email" ? (
                    <label className="field-label">
                      Subject
                      <input
                        value={task.subject || ""}
                        onChange={(e) =>
                          patchTask(bot.id, task.id, { subject: e.target.value })
                        }
                        placeholder="Quote for [Name]"
                      />
                    </label>
                  ) : null}
                  {task.kind === "pdf" ? (
                    <>
                      <label className="field-label">
                        Folder
                        <input
                          value={task.folder || ""}
                          onChange={(e) =>
                            patchTask(bot.id, task.id, { folder: e.target.value })
                          }
                          placeholder="Quotes/[Company]"
                        />
                      </label>
                      <label className="field-label">
                        File name
                        <input
                          value={task.fileName || ""}
                          onChange={(e) =>
                            patchTask(bot.id, task.id, { fileName: e.target.value })
                          }
                          placeholder="[Name] quote.pdf"
                        />
                      </label>
                    </>
                  ) : null}
                  <label className="field-label">
                    {task.kind === "pdf" ? "PDF body" : "Message"}
                    <textarea
                      rows={3}
                      value={task.body || ""}
                      onChange={(e) =>
                        patchTask(bot.id, task.id, { body: e.target.value })
                      }
                      placeholder="Hi [Name], …"
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                className="linkish"
                onClick={() =>
                  patch(bot.id, {
                    tasks: bot.tasks.filter((item) => item.id !== task.id),
                  })
                }
              >
                Remove task
              </button>
            </div>
          ))}
          <div className="actions">
            <button
              type="button"
              className="btn ghost"
              onClick={() =>
                patch(bot.id, {
                  tasks: [
                    ...bot.tasks,
                    {
                      id: newId("task"),
                      kind: "whatsapp",
                      to: "[Phone]",
                      body: "Hi [Name]",
                    },
                  ],
                })
              }
            >
              Add task
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void runNow(bot)}
            >
              Run now
            </button>
          </div>
        </article>
      ))}
      <button
        type="button"
        className="btn primary"
        onClick={() =>
          setBots([
            ...bots,
            {
              id: newId("bot"),
              name: "New bot",
              enabled: true,
              table: tables[0] || "",
              event: "adds_or_updates",
              tasks: [
                {
                  id: newId("task"),
                  kind: "whatsapp",
                  to: "[Phone]",
                  body: "Hi [Name]",
                },
              ],
            },
          ])
        }
      >
        Add bot
      </button>
      <p className="hint">
        Script lines: <code>SEND_WA</code>, <code>SEND_EMAIL</code>,{" "}
        <code>CREATE_PDF</code>. Use [Column] like AppSheet.
      </p>
      {log ? <p className="build-note">{log}</p> : null}
    </div>
  );
}
