"use client";

import { useMemo, useState } from "react";
import {
  SCRIPT_HELP,
  botFiresOn,
  downloadPdf,
  planBotTasks,
  withBotChange,
  type AppBot,
  type AppBotTask,
  type AppConfig,
  type BotSource,
  type BotTaskKind,
} from "@/lib/app-builder";
import { dispatchAppBuilderBotAction } from "@/app/app/app-builder/actions";
import type { SheetAdapter } from "../sheet/mockAdapter";

type Sel = { kind: "event" } | { kind: "process" } | { kind: "task"; id: string };

const TASK_KINDS: { id: BotTaskKind; label: string; hint: string }[] = [
  { id: "whatsapp", label: "WhatsApp", hint: "Send a WhatsApp" },
  { id: "email", label: "Email", hint: "Send an email" },
  { id: "notify", label: "Notify", hint: "In-app message" },
  { id: "pdf", label: "File", hint: "Create a PDF" },
  { id: "script", label: "Script", hint: "SEND_WA / SEND_EMAIL" },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}`;
}

function changeLabel(bot: AppBot) {
  const parts = (["adds", "updates", "deletes"] as const)
    .filter((kind) => botFiresOn(bot, kind))
    .map((kind) => (kind === "adds" ? "Adds" : kind === "updates" ? "Updates" : "Deletes"));
  if (bot.source === "schedule" || bot.event === "schedule") return "Schedule";
  if (bot.event === "manual" && !parts.length) return "Run now";
  return parts.join(" · ") || "No trigger";
}

function taskSummary(task: AppBotTask) {
  if (task.kind === "script") return "Script";
  if (task.kind === "pdf") return task.fileName || "Create PDF";
  if (task.kind === "notify") return task.subject || task.body || "Notification";
  return task.to || (task.kind === "email" ? "Send email" : "Send WhatsApp");
}

function blankTask(kind: BotTaskKind = "notify"): AppBotTask {
  if (kind === "whatsapp") return { id: newId("task"), kind, to: "[Phone]", body: "Hi [Name]," };
  if (kind === "email") {
    return {
      id: newId("task"),
      kind,
      to: "[Email]",
      subject: "[Name] · update",
      body: "Hi [Name],\n",
    };
  }
  if (kind === "pdf") {
    return {
      id: newId("task"),
      kind,
      folder: "Files/[Name]",
      fileName: "[Name].pdf",
      body: "<<[Name]>>",
    };
  }
  if (kind === "script") return { id: newId("task"), kind, script: "" };
  return {
    id: newId("task"),
    kind: "notify",
    subject: "New [Name]",
    body: "Hi <<[Assigned To]>>,\nA new row was logged.",
  };
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
  const [botId, setBotId] = useState(bots[0]?.id || "");
  const [sel, setSel] = useState<Sel>({ kind: "event" });
  const [log, setLog] = useState("");
  const [busy, setBusy] = useState(false);
  const [runRow, setRunRow] = useState<number | "">("");

  const bot = bots.find((item) => item.id === botId) || bots[0] || null;
  const task = sel.kind === "task" ? bot?.tasks.find((item) => item.id === sel.id) : undefined;
  const groups = useMemo(() => {
    const map = new Map<string, AppBot[]>();
    for (const item of bots) {
      const key = item.table || "No table";
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()];
  }, [bots]);

  function setBots(next: AppBot[], focusId?: string) {
    onChange({ ...config, bots: next });
    if (focusId) {
      setBotId(focusId);
      setSel({ kind: "event" });
    }
  }

  function patch(id: string, next: Partial<AppBot>) {
    setBots(bots.map((item) => (item.id === id ? { ...item, ...next } : item)));
  }

  function patchTask(taskId: string, next: Partial<AppBotTask>) {
    if (!bot) return;
    patch(bot.id, {
      tasks: bot.tasks.map((item) => (item.id === taskId ? { ...item, ...next } : item)),
    });
  }

  function addBot() {
    const next: AppBot = {
      id: newId("bot"),
      name: "New bot",
      enabled: true,
      table: tables[0] || "",
      event: "adds",
      source: "app",
      eventName: "Send notification",
      changes: { adds: true, updates: false, deletes: false },
      tasks: [blankTask("notify")],
    };
    setBots([...bots, next], next.id);
  }

  function addStep(afterId?: string) {
    if (!bot) return;
    const step = blankTask("notify");
    const tasks = afterId
      ? bot.tasks.flatMap((item) => (item.id === afterId ? [item, step] : [item]))
      : [...bot.tasks, step];
    patch(bot.id, { tasks });
    setSel({ kind: "task", id: step.id });
  }

  async function runNow() {
    if (!bot) return;
    const rows = sheet.listRows(bot.table);
    const picked = rows.find((row) => row._row === runRow) || rows[0];
    if (!picked) {
      setLog(`No rows in ${bot.table || "that table"}.`);
      return;
    }
    setBusy(true);
    const planned = planBotTasks(bot, picked.cells);
    if (!planned.length) {
      setBusy(false);
      setLog("Did not fire — check the condition against this row.");
      return;
    }
    const view = config.views.find((item) => item.tab === bot.table);
    const fileCol =
      view?.addFields?.find((field) => field.type === "file")?.col ||
      view?.cols.find((col) => /file|pdf|quote|attachment/i.test(col));
    for (const action of planned) {
      if (action.kind === "pdf" && action.pdfBase64) {
        const bytes = Uint8Array.from(atob(action.pdfBase64), (ch) => ch.charCodeAt(0));
        downloadPdf(action.fileName || "document.pdf", bytes);
        if (fileCol) {
          const path = [action.folder, action.fileName].filter(Boolean).join("/");
          sheet.setCell(bot.table, picked._row, fileCol, path);
        }
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
      : { ok: true, message: planned.map((item) => item.message).join(" · ") };
    setBusy(false);
    setLog([...planned.map((action) => action.message), sent.message].join(" · "));
  }

  const rows = bot ? sheet.listRows(bot.table) : [];

  return (
    <div className="bot-studio">
      <aside className="bot-rail" aria-label="Bots">
        <header>
          <strong>Bots</strong>
          <button type="button" className="bot-icon-btn" onClick={addBot} aria-label="Add bot">
            +
          </button>
        </header>
        {!bots.length ? <p className="bot-empty">No bots yet.</p> : null}
        {groups.map(([table, items]) => (
          <section key={table}>
            <h3>{table}</h3>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${item.id === bot?.id ? "on" : ""}${item.enabled ? "" : " off"}`}
                onClick={() => {
                  setBotId(item.id);
                  setSel({ kind: "event" });
                }}
              >
                <i aria-hidden />
                <span>{item.enabled ? item.name : `(disabled) ${item.name}`}</span>
              </button>
            ))}
          </section>
        ))}
      </aside>

      <div className="bot-flow">
        {!bot ? (
          <div className="bot-empty-flow">
            <strong>When a row changes, run a process.</strong>
            <button type="button" className="btn primary" onClick={addBot}>
              Add bot
            </button>
          </div>
        ) : (
          <>
            <header className="bot-flow-head">
              <input
                value={bot.name}
                aria-label="Bot name"
                onChange={(e) => patch(bot.id, { name: e.target.value })}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => patch(bot.id, { enabled: !bot.enabled })}
              >
                {bot.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  const next = bots.filter((item) => item.id !== bot.id);
                  setBots(next, next[0]?.id);
                }}
              >
                Delete
              </button>
            </header>

            <p className="bot-when">When this EVENT occurs</p>
            <button
              type="button"
              className={`bot-node${sel.kind === "event" ? " on" : ""}`}
              onClick={() => setSel({ kind: "event" })}
            >
              <b>{bot.eventName || bot.name}</b>
              <small>
                {bot.table || "No table"} · {changeLabel(bot)}
              </small>
            </button>

            <span className="bot-line" />
            <p className="bot-when">Run this PROCESS</p>
            <button
              type="button"
              className={`bot-node slim${sel.kind === "process" ? " on" : ""}`}
              onClick={() => setSel({ kind: "process" })}
            >
              <b>Process</b>
              <small>{bot.tasks.length || 0} task{bot.tasks.length === 1 ? "" : "s"}</small>
            </button>

            {bot.tasks.map((item) => (
              <div key={item.id} className="bot-step">
                <span className="bot-line" />
                <button
                  type="button"
                  className="bot-plus"
                  aria-label="Add a step"
                  onClick={() => addStep(item.id)}
                >
                  +
                </button>
                <button
                  type="button"
                  className={`bot-node${sel.kind === "task" && sel.id === item.id ? " on" : ""}`}
                  onClick={() => setSel({ kind: "task", id: item.id })}
                >
                  <em>{TASK_KINDS.find((kind) => kind.id === item.kind)?.label || item.kind}</em>
                  <b>{taskSummary(item)}</b>
                </button>
              </div>
            ))}
            <span className="bot-line" />
            <button type="button" className="bot-add-step" onClick={() => addStep()}>
              + Add a step
            </button>
            <span className="bot-line" />
            <i className="bot-end">END</i>
          </>
        )}
      </div>

      <aside className="bot-inspector" aria-label="Bot settings">
        {!bot ? (
          <p className="hint">Pick a bot.</p>
        ) : sel.kind === "event" ? (
          <EventInspector
            bot={bot}
            tables={tables}
            onPatch={(next) => patch(bot.id, next)}
          />
        ) : sel.kind === "process" ? (
          <div className="bot-insp">
            <h2>Process</h2>
            <p className="hint">Tasks run in order when the event fires.</p>
            <button type="button" className="btn primary" onClick={() => addStep()}>
              Add a step
            </button>
          </div>
        ) : task ? (
          <TaskInspector
            task={task}
            views={config.views}
            onPatch={(next) => patchTask(task.id, next)}
            onRemove={() => {
              patch(bot.id, { tasks: bot.tasks.filter((item) => item.id !== task.id) });
              setSel({ kind: "process" });
            }}
          />
        ) : (
          <p className="hint">Pick a step.</p>
        )}

        {bot ? (
          <div className="bot-run">
            <label>
              Run against
              <select
                value={runRow || rows[0]?._row || ""}
                onChange={(e) => setRunRow(Number(e.target.value))}
              >
                {rows.map((row) => (
                  <option key={row._row} value={row._row}>
                    Row {row._row}
                    {row.cells.Name != null ? ` · ${row.cells.Name}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void runNow()}>
              Run now
            </button>
            {log ? <p>{log}</p> : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

function EventInspector({
  bot,
  tables,
  onPatch,
}: {
  bot: AppBot;
  tables: string[];
  onPatch: (next: Partial<AppBot>) => void;
}) {
  const source: BotSource = bot.source || (bot.event === "schedule" ? "schedule" : "app");
  return (
    <div className="bot-insp">
      <h2>Event</h2>
      <label>
        Event name
        <input
          value={bot.eventName || bot.name}
          onChange={(e) => onPatch({ eventName: e.target.value })}
        />
      </label>
      <label>
        Event source
        <select
          value={source}
          onChange={(e) => {
            const next = e.target.value as BotSource;
            onPatch(
              next === "schedule"
                ? { source: "schedule", event: "schedule" }
                : { source: "app", event: bot.changes ? "adds_or_updates" : "adds" },
            );
          }}
        >
          <option value="app">App</option>
          <option value="schedule">Schedule</option>
        </select>
      </label>
      <label>
        Table
        <select value={bot.table} onChange={(e) => onPatch({ table: e.target.value })}>
          <option value="">Select table</option>
          {tables.map((table) => (
            <option key={table} value={table}>
              {table}
            </option>
          ))}
        </select>
      </label>
      <p className="aside-label">Data change</p>
      <div className="bot-tiles">
        {(["adds", "updates", "deletes"] as const).map((kind) => {
          const on = botFiresOn(bot, kind);
          return (
            <button
              key={kind}
              type="button"
              className={on ? "on" : ""}
              disabled={source === "schedule"}
              onClick={() => onPatch(withBotChange(bot, kind, !on))}
            >
              <i>{on ? "✓" : ""}</i>
              {kind === "adds" ? "Adds" : kind === "updates" ? "Updates" : "Deletes"}
            </button>
          );
        })}
      </div>
      <label>
        Condition
        <input
          value={bot.condition || ""}
          onChange={(e) => onPatch({ condition: e.target.value || undefined })}
          placeholder={'ISNOTBLANK([Dated])'}
        />
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={!!bot.bypassSecurity}
          onChange={(e) => onPatch({ bypassSecurity: e.target.checked })}
        />
        Bypass security filters
      </label>
    </div>
  );
}

function TaskInspector({
  task,
  views,
  onPatch,
  onRemove,
}: {
  task: AppBotTask;
  views: AppConfig["views"];
  onPatch: (next: Partial<AppBotTask>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bot-insp">
      <h2>Task</h2>
      <div className="bot-kinds">
        {TASK_KINDS.map((kind) => (
          <button
            key={kind.id}
            type="button"
            className={task.kind === kind.id ? "on" : ""}
            onClick={() => onPatch({ kind: kind.id })}
          >
            <b>{kind.label}</b>
            <small>{kind.hint}</small>
          </button>
        ))}
      </div>
      {task.kind === "script" ? (
        <label>
          Script
          <textarea
            rows={6}
            value={task.script || ""}
            onChange={(e) => onPatch({ script: e.target.value })}
            placeholder={SCRIPT_HELP}
          />
        </label>
      ) : (
        <>
          {task.kind !== "pdf" && task.kind !== "notify" ? (
            <label>
              To
              <input
                value={task.to || ""}
                onChange={(e) => onPatch({ to: e.target.value })}
                placeholder={task.kind === "email" ? "[Email]" : "[Phone]"}
              />
            </label>
          ) : null}
          {task.kind === "email" || task.kind === "notify" ? (
            <label>
              Title
              <input
                value={task.subject || ""}
                onChange={(e) => onPatch({ subject: e.target.value })}
                placeholder="Fleet | <<[Name]>>"
              />
            </label>
          ) : null}
          {task.kind === "pdf" ? (
            <>
              <label>
                Folder
                <input
                  value={task.folder || ""}
                  onChange={(e) => onPatch({ folder: e.target.value })}
                  placeholder="Quotes/[Company]"
                />
              </label>
              <label>
                File name
                <input
                  value={task.fileName || ""}
                  onChange={(e) => onPatch({ fileName: e.target.value })}
                  placeholder="[Name].pdf"
                />
              </label>
            </>
          ) : null}
          <label>
            Body
            <textarea
              rows={5}
              value={task.body || ""}
              onChange={(e) => onPatch({ body: e.target.value })}
              placeholder={"Hi <<[Name]>>,\nRoute: <<[Plant]>>"}
            />
          </label>
          {task.kind !== "pdf" ? (
            <label>
              DeepLink
              <input
                value={task.deepLink || ""}
                onChange={(e) => onPatch({ deepLink: e.target.value || undefined })}
                placeholder={'LINKTOVIEW("Leads")'}
                list="bot-views"
              />
            </label>
          ) : null}
          <datalist id="bot-views">
            {views.map((view) => (
              <option key={view.id} value={`LINKTOVIEW("${view.name}")`} />
            ))}
          </datalist>
        </>
      )}
      <button type="button" className="linkish" onClick={onRemove}>
        Remove task
      </button>
    </div>
  );
}
