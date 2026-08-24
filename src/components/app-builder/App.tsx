"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyConfig,
  inferAppFromWorkbook,
  styleLabel,
  type AppConfig,
  type SheetWorkbook,
} from "@/lib/app-builder";
import { DesignPanel } from "./editor/DesignPanel";
import { TemplateGallery } from "./editor/TemplateGallery";
import { ThemePicker } from "./editor/ThemePicker";
import { AiBar } from "./ai/AiBar";
import { planFromPrompt } from "./ai/planner";
import { type AppPlan } from "@/lib/app-builder";
import { addCredits, readCredits, spendCredit, WELCOME_CREDITS } from "./credits";
import { AppRuntime } from "./runtime/AppRuntime";
import { createMockAdapter, type SheetAdapter } from "./sheet/mockAdapter";
import { withLiveSheetSync } from "./sheet/liveSync";
import "./App.css";

type Editor = "layout" | "data" | "users" | "settings";

type GoogleFile = { id: string; name: string };

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail?: string;
  spreadsheetId?: string | null;
  spreadsheetTitle?: string | null;
  files?: GoogleFile[];
};

const emptyBook = { title: "My Sheet", tabs: {} };

function googleCallbackNote(flag: string | null) {
  switch (flag) {
    case "denied":
      return "Google sign-in was cancelled.";
    case "missing":
      return "Google connect is not set up on this server yet. Paste a Sheet link for now.";
    case "invalid":
      return "Google sign-in expired. Click Connect with Google again.";
    case "norefresh":
      return "Google did not keep the login. Click Connect with Google and allow access.";
    case "failed":
      return "Google sign-in failed. Try again.";
    default:
      return "";
  }
}

export default function AppBuilderStudio({
  googleAuthReady = false,
}: {
  googleAuthReady?: boolean;
}) {
  const [config, setConfig] = useState<AppConfig>(() => createEmptyConfig("My app"));
  const liveSheetId = useRef<string | null>(null);
  const [sheet] = useState<SheetAdapter>(() =>
    withLiveSheetSync(createMockAdapter(emptyBook), () => liveSheetId.current),
  );
  const [editor, setEditor] = useState<Editor>("layout");
  const [focus, setFocus] = useState("home");
  const [rev, setRev] = useState(0);
  const [dataTab, setDataTab] = useState("");
  const [credits, setCredits] = useState(WELCOME_CREDITS);

  useEffect(() => {
    setCredits(readCredits());
  }, []);
  const [note, setNote] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [connected, setConnected] = useState<string | null>(null);
  const [google, setGoogle] = useState<GoogleStatus>({
    configured: googleAuthReady,
    connected: false,
  });
  const [pickedSheet, setPickedSheet] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [importTabs, setImportTabs] = useState<string[]>([]);
  const [importTab, setImportTab] = useState("");
  const [importHeaderRow, setImportHeaderRow] = useState(1);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  liveSheetId.current = google.spreadsheetId || connected;
  const workbook = useMemo(() => sheet.getWorkbook(), [sheet, rev]);
  const screens = config.views;
  const bump = () => setRev((n) => n + 1);

  function build(prompt: string) {
    if (credits < 1) {
      setNote("Credits finished. Buy more to keep building.");
      return;
    }
    const plan = planFromPrompt(prompt);
    sheet.replace(plan.workbook);
    setConfig(plan.config);
    setFocus("home");
    setDataTab(Object.keys(plan.workbook.tabs)[0] || "");
    setCredits(spendCredit());
    setNote(`Built “${plan.config.meta.name}” from your words. Preview it in the phone.`);
    setEditor("layout");
    setGalleryOpen(false);
  }

  function applyPlan(plan: AppPlan) {
    sheet.replace(structuredClone(plan.workbook));
    setConfig({
      ...plan.config,
      meta: { ...plan.config.meta },
    });
    setFocus("home");
    setDataTab(Object.keys(plan.workbook.tabs)[0] || "");
    bump();
    setActiveTemplateId(plan.id);
    setGalleryOpen(false);
    setEditor("layout");
    setNote(
      google.connected
        ? `Loaded “${plan.label}”. Create that Sheet in Drive, or keep editing the preview.`
        : `Loaded “${plan.label}”. Connect Google to create this Sheet in your Drive.`,
    );
  }

  async function createSheetFromTemplate(templateId: string) {
    if (!google.connected) {
      setNote("Connect with Google first, then we can create the Sheet.");
      return;
    }
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/app-builder/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", templateId }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        spreadsheetId?: string;
        spreadsheetTitle?: string;
      } | null;
      if (!res.ok || !body?.spreadsheetId) {
        setNote(body?.error || "Could not create that Sheet. Reconnect Google and allow Sheets.");
        return;
      }
      setGoogle((prev) => ({
        ...prev,
        spreadsheetId: body.spreadsheetId,
        spreadsheetTitle: body.spreadsheetTitle,
      }));
      setConnected(body.spreadsheetId);
      setNote(`Created “${body.spreadsheetTitle}” in your Google Drive.`);
    } finally {
      setGoogleBusy(false);
    }
  }

  async function loadSheetMeta(spreadsheetId: string) {
    const res = await fetch(
      `/api/app-builder/google/workbook?id=${encodeURIComponent(spreadsheetId)}&meta=1`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setImportTabs([]);
      return;
    }
    const body = (await res.json()) as { tabs?: string[] };
    const tabs = body.tabs ?? [];
    setImportTabs(tabs);
    setImportTab(tabs[0] || "");
    setImportHeaderRow(1);
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("google");
    const fromCallback = googleCallbackNote(flag);
    if (fromCallback) setNote(fromCallback);
    if (flag) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    let cancelled = false;
    async function hydrateGoogle() {
      try {
        const res = await fetch("/api/app-builder/google", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as GoogleStatus;
        if (cancelled) return;
        setGoogle(data);
        if (data.spreadsheetId) {
          setPickedSheet(data.spreadsheetId);
          setConnected(data.spreadsheetId);
          await loadWorkbook(data.spreadsheetId);
        } else if (data.files?.[0]) {
          setPickedSheet(data.files[0].id);
        }
      } catch {
        /* stay on paste fallback */
      }
    }
    void hydrateGoogle();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadWorkbook(
    spreadsheetId: string,
    options?: { tab?: string; headerRow?: number },
  ) {
    const params = new URLSearchParams({ id: spreadsheetId });
    if (options?.headerRow && options.headerRow > 1) {
      params.set("headerRow", String(options.headerRow));
    }
    const res = await fetch(`/api/app-builder/google/workbook?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setNote(body?.error || "Could not read that Google Sheet.");
      return;
    }
    const body = (await res.json()) as { workbook: SheetWorkbook };
    applyWorkbook(body.workbook, options?.tab);
    setConnected(spreadsheetId);
    setNote(
      `Opened “${body.workbook.title}”. Screens and relations were built from your tables.`,
    );
  }

  function applyWorkbook(workbook: SheetWorkbook, focusTab?: string) {
    sheet.replace(workbook);
    const next = inferAppFromWorkbook(workbook);
    setConfig(next);
    const focusView = next.views.find((v) => v.tab === focusTab);
    setFocus(focusView?.id || "home");
    setDataTab(focusTab || Object.keys(workbook.tabs)[0] || "");
    setGalleryOpen(false);
    setActiveTemplateId(null);
    setRev((n) => n + 1);
  }

  async function usePickedSheet() {
    const spreadsheetId = pickedSheet.trim();
    if (!spreadsheetId) {
      setNote("Choose a Google Sheet from the list.");
      return;
    }
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/app-builder/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", spreadsheetId }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        spreadsheetTitle?: string;
      } | null;
      if (!res.ok) {
        setNote(body?.error || "Could not use that Sheet.");
        return;
      }
      setGoogle((prev) => ({
        ...prev,
        spreadsheetId,
        spreadsheetTitle: body?.spreadsheetTitle ?? prev.spreadsheetTitle,
      }));
      await loadWorkbook(spreadsheetId, {
        tab: importTab || undefined,
        headerRow: importHeaderRow,
      });
    } finally {
      setGoogleBusy(false);
    }
  }

  async function disconnectGoogle() {
    setGoogleBusy(true);
    try {
      await fetch("/api/app-builder/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      setGoogle({ configured: google.configured, connected: false, files: [] });
      setConnected(null);
      setPickedSheet("");
      setNote("Google disconnected. Connect again to pick a Sheet.");
    } finally {
      setGoogleBusy(false);
    }
  }

  function connectSheet() {
    const raw = sheetUrl.trim();
    const id = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1] || raw;
    if (!id || id.length < 8) {
      setNote("Paste a Google Sheet link from your Gmail Drive.");
      return;
    }
    setConnected(id);
    setNote(
      "Sheet linked by URL. For live tabs, use Connect with Google so we can read your Drive.",
    );
  }

  const emptyApp = config.views.length === 0;
  const showGallery = galleryOpen || (emptyApp && editor === "layout" && !preview);

  if (showGallery) {
    return (
      <div className="ab-studio">
        <TemplateGallery
          onPick={applyPlan}
          onBuild={build}
          sheetUrl={sheetUrl}
          onSheetUrl={setSheetUrl}
          onConnectSheet={connectSheet}
          onBack={emptyApp ? undefined : () => setGalleryOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`ab-studio glide${preview ? " previewing" : ""}${showGallery ? " gallery-open" : ""}`}>
      <div className="connect-bar">
        {google.connected ? (
          <>
            <p>
              Google <strong>{google.googleEmail}</strong>
              {google.spreadsheetTitle
                ? ` · ${google.spreadsheetTitle}`
                : connected
                  ? ` · Sheet ${connected.slice(0, 8)}…`
                  : " · pick a Sheet"}
              {" · "}
              {credits} credits left
            </p>
            {!google.spreadsheetId ? (
              <>
                <select
                  value={pickedSheet}
                  onChange={(e) => {
                    const id = e.target.value;
                    setPickedSheet(id);
                    if (id) void loadSheetMeta(id);
                    else {
                      setImportTabs([]);
                      setImportTab("");
                    }
                  }}
                  aria-label="Google Sheets in your Drive"
                >
                  <option value="">Choose a Google Sheet</option>
                  {(google.files ?? []).map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.name}
                    </option>
                  ))}
                </select>
                {importTabs.length > 0 ? (
                  <>
                    <select
                      value={importTab}
                      onChange={(e) => setImportTab(e.target.value)}
                      aria-label="Sheet tab name"
                    >
                      {importTabs.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <label className="header-row">
                      Header row
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={importHeaderRow}
                        onChange={(e) => setImportHeaderRow(Number(e.target.value) || 1)}
                      />
                    </label>
                  </>
                ) : null}
                <button type="button" disabled={googleBusy} onClick={() => void usePickedSheet()}>
                  Use this Sheet
                </button>
              </>
            ) : (
              <>
            <button
              type="button"
              className="ghost"
              disabled={googleBusy}
              onClick={() =>
                setGoogle((prev) => ({ ...prev, spreadsheetId: null, spreadsheetTitle: null }))
              }
            >
              Change Sheet
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => applyWorkbook(sheet.getWorkbook(), dataTab)}
            >
              Rebuild from Sheet
            </button>
              </>
            )}
            <button
              type="button"
              className="ghost"
              disabled={googleBusy}
              onClick={() => void disconnectGoogle()}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <a className="google-btn" href="/api/app-builder/google/start">
              Connect with Google
            </a>
            <input
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="or paste a Sheet link"
            />
            <button type="button" onClick={connectSheet}>
              Use link
            </button>
          </>
        )}
        {credits < 1 ? (
          <a className="buy-now" href="/contact?intent=app-builder">
            Buy credits
          </a>
        ) : (
          <span className="try-hint">
            New Gmail works after we add it as a tester, until Google verifies the app
          </span>
        )}
      </div>
      <header className="topbar">
        <div className="brand">
          <div className="logo">S</div>
          <div>
            <strong>{config.meta.name}</strong>
            <span>
              {google.connected
                ? `${google.googleEmail} · live Google Sheet`
                : "Gmail Sheet · no Workspace seat needed"}
            </span>
          </div>
        </div>
        <nav className="modes">
          {(
            [
              ["layout", "Layout"],
              ["data", "Data"],
              ["users", "Users"],
              ["settings", "Settings"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={editor === id ? "on" : ""}
              onClick={() => setEditor(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className={preview ? "on preview-btn" : "preview-btn"}
          onClick={() => setPreview((on) => !on)}
        >
          {preview ? "← Exit preview" : "Preview"}
        </button>
        <span className={`credits ${credits < 5 ? "low" : ""}`}>{credits} credits</span>
      </header>

      {editor === "layout" && (
        <div className="layout">
          <aside className="pages">
            <p className="aside-label">Screens</p>
            <button
              type="button"
              className={focus === "home" ? "on" : ""}
              onClick={() => {
                setFocus("home");
                if (emptyApp) setGalleryOpen(true);
              }}
            >
              Home
              <em>{emptyApp ? "Custom" : "Home"}</em>
            </button>
            <button type="button" onClick={() => setGalleryOpen(true)}>
              Templates
              <em>Ready apps</em>
            </button>
            {screens.map((s) => (
              <button
                key={s.id}
                type="button"
                className={focus === s.id ? "on" : ""}
                onClick={() => setFocus(s.id)}
              >
                {s.name}
                <em>
                  {s.nav === false ? "Hidden" : styleLabel(s.collectionStyle)}
                </em>
              </button>
            ))}
            <p className="hint aside-pad">
              Select a screen, then add or remove on the right.
            </p>
          </aside>

          <div className="canvas-col">
            {showGallery ? (
              <TemplateGallery
                onPick={applyPlan}
                onBuild={build}
                sheetUrl={sheetUrl}
                onSheetUrl={setSheetUrl}
                onConnectSheet={connectSheet}
                onBack={emptyApp ? undefined : () => setGalleryOpen(false)}
              />
            ) : (
              <div className="canvas">
                <div className="phone">
                  <div className="island" />
                  <div className="phone-screen">
                    <AppRuntime
                      config={config}
                      sheet={sheet}
                      focusViewId={focus}
                      onSheetChange={bump}
                    />
                  </div>
                </div>
              </div>
            )}
            {preview ? null : <AiBar credits={credits} onBuild={build} />}
            {note ? <p className="build-note">{note}</p> : null}
            {activeTemplateId && google.connected && !google.spreadsheetId ? (
              <p className="build-note">
                <button
                  type="button"
                  className="linkish"
                  disabled={googleBusy}
                  onClick={() => void createSheetFromTemplate(activeTemplateId)}
                >
                  Create this Sheet in my Google Drive
                </button>
              </p>
            ) : null}
          </div>

          <aside className="inspector">
            <p className="aside-label">Design</p>
            <DesignPanel
              config={config}
              sheet={sheet}
              focus={focus}
              onFocus={setFocus}
              onChange={(next) => {
                setConfig(next);
                bump();
              }}
            />
          </aside>
        </div>
      )}

      {editor === "data" && (
        <DataEditor
          sheet={sheet}
          tabName={dataTab || Object.keys(workbook.tabs)[0] || ""}
          onTab={setDataTab}
          onChange={bump}
        />
      )}

      {editor === "users" && (
        <UsersEditor
          config={config}
          onChange={setConfig}
          onBuy={() => setCredits(addCredits(20))}
        />
      )}

      {editor === "settings" && (
        <SettingsEditor
          config={config}
          credits={credits}
          onChange={setConfig}
          onBuy={() => setCredits(addCredits(20))}
        />
      )}
    </div>
  );
}

function DataEditor({
  sheet,
  tabName,
  onTab,
  onChange,
}: {
  sheet: SheetAdapter;
  tabName: string;
  onTab: (name: string) => void;
  onChange: () => void;
}) {
  const book = sheet.getWorkbook();
  const tab = book.tabs[tabName];
  const [col, setCol] = useState("");
  const [newTab, setNewTab] = useState("");

  return (
    <div className="data-editor">
      <aside className="pages">
        <p className="aside-label">Tables</p>
        {Object.values(book.tabs).map((t) => (
          <button
            key={t.name}
            type="button"
            className={tabName === t.name ? "on" : ""}
            onClick={() => onTab(t.name)}
          >
            {t.name}
            <em>{t.rows.length}</em>
          </button>
        ))}
        <div className="add-inline">
          <input
            value={newTab}
            onChange={(e) => setNewTab(e.target.value)}
            placeholder="New table"
          />
          <button
            type="button"
            onClick={() => {
              if (!newTab.trim()) return;
              sheet.addTab(newTab.trim());
              onTab(newTab.trim());
              setNewTab("");
              onChange();
            }}
          >
            Add
          </button>
        </div>
      </aside>
      <div className="sheet-wrap">
        {!tab ? (
          <p className="hint">Build an app first — tables appear here like your Sheet.</p>
        ) : (
          <div className="sheet">
            <header>
              <h2>{tab.name}</h2>
              <p>
                {book.title} · edit cells like Google Sheets
              </p>
            </header>
            <div className="grid-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="idx">#</th>
                    {tab.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tab.rows.map((r) => (
                    <tr key={r._row}>
                      <td className="idx">{r._row}</td>
                      {tab.headers.map((h) => (
                        <td key={h}>
                          <input
                            className="cell"
                            value={r.cells[h] == null ? "" : String(r.cells[h])}
                            onChange={(e) => {
                              sheet.setCell(tab.name, r._row, h, e.target.value);
                              onChange();
                            }}
                          />
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => {
                            sheet.deleteRow(tab.name, r._row);
                            onChange();
                          }}
                        >
                          Del
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sheet-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  sheet.appendRow(tab.name, {});
                  onChange();
                }}
              >
                Add row
              </button>
              <input
                value={col}
                onChange={(e) => setCol(e.target.value)}
                placeholder="New column"
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  if (!col.trim()) return;
                  sheet.addColumn(tab.name, col.trim());
                  setCol("");
                  onChange();
                }}
              >
                Add column
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UsersEditor({
  config,
  onChange,
  onBuy,
}: {
  config: AppConfig;
  onChange: (c: AppConfig) => void;
  onBuy: () => void;
}) {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const users = config.users || [];
  return (
    <div className="plain">
      <h2>Users</h2>
      <p className="hint">
        Staff do not need Gmail. Share a PIN. Never billed per person.
      </p>
      <ul className="user-list">
        {users.map((u) => (
          <li key={u.id}>
            <strong>{u.name}</strong>
            <span>
              {u.role} · PIN {u.pin}
            </span>
          </li>
        ))}
      </ul>
      <div className="add-inline">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
        <button
          type="button"
          onClick={() => {
            if (!name.trim() || !pin.trim()) return;
            onChange({
              ...config,
              users: [
                ...users,
                {
                  id: `u-${Date.now()}`,
                  name: name.trim(),
                  pin: pin.trim(),
                  role: "staff",
                },
              ],
            });
            setName("");
            setPin("");
          }}
        >
          Add staff
        </button>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={!!config.meta.requirePin}
          onChange={(e) =>
            onChange({
              ...config,
              meta: { ...config.meta, requirePin: e.target.checked },
            })
          }
        />
        Ask PIN when the phone app opens
      </label>
      <p className="hint">Credits are for AI and publish — not for adding staff.</p>
      <button type="button" className="btn ghost" onClick={onBuy}>
        +20 credits (demo)
      </button>
    </div>
  );
}

function SettingsEditor({
  config,
  credits,
  onChange,
  onBuy,
}: {
  config: AppConfig;
  credits: number;
  onChange: (c: AppConfig) => void;
  onBuy: () => void;
}) {
  return (
    <div className="plain">
      <h2>Settings</h2>
      <label className="field-label">
        App name
        <input
          value={config.meta.name}
          onChange={(e) =>
            onChange({ ...config, meta: { ...config.meta, name: e.target.value } })
          }
        />
      </label>
      <p className="hint">
        Google Connect works for any Gmail after the Cloud app is in{" "}
        <strong>Production</strong> and verification is submitted. Privacy page
        Google will ask for:{" "}
        <a href="/app-builder/privacy" target="_blank" rel="noreferrer">
          sheetomatic.com/app-builder/privacy
        </a>
        . Homepage: sheetomatic.com/app-builder. Scopes: Sheets + drive.file
        only. Until Google approves, add each new Gmail as a tester.
      </p>
      <ThemePicker
        meta={config.meta}
        onChange={(patch) =>
          onChange({ ...config, meta: { ...config.meta, ...patch } })
        }
      />
      <p className="hint">
        {credits} credits left. Welcome pack is 40. When empty, buy more — never
        a Google Workspace bill.
      </p>
      <button type="button" className="btn primary" onClick={onBuy}>
        Buy 20 credits (demo)
      </button>
    </div>
  );
}
