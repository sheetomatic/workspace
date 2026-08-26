"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  createEmptyConfig,
  evaluateAppSheetFormula,
  FIELD_TYPE_OPTIONS,
  fieldOf,
  fieldTypeOf,
  inferAppFromWorkbook,
  suggestAppSheetFormula,
  parseGoogleSheetId,
  setTableInApp,
  SPREADSHEET_ACCEPT,
  styleLabel,
  withColumnType,
  workbookFromSpreadsheetFile,
  type AppConfig,
  type AppFormField,
  type CellValue,
  type FieldType,
  type SheetWorkbook,
} from "@/lib/app-builder";
import { DesignPanel } from "./editor/DesignPanel";
import { SchemaStudio } from "./editor/SchemaStudio";
import { TemplateGallery } from "./editor/TemplateGallery";
import { ThemePicker } from "./editor/ThemePicker";
import { BotsPanel } from "./editor/BotsPanel";
import { IntelligencePanel } from "./editor/IntelligencePanel";
import { DeviceFrame, PREVIEW_DEVICES, type PreviewDevice } from "./preview/DeviceFrame";
import { AiBar } from "./ai/AiBar";
import { planFromPrompt } from "./ai/planner";
import { type AppPlan } from "@/lib/app-builder";
import { addCredits, readCredits, spendCredit, WELCOME_CREDITS } from "./credits";
import { AppRuntime } from "./runtime/AppRuntime";
import { createMockAdapter, type SheetAdapter } from "./sheet/mockAdapter";
import { withLiveSheetSync } from "./sheet/liveSync";
import { saveAppBuilderStudioAction } from "@/app/app/app-builder/actions";
import type { AppBuilderStudioSnapshot } from "@/lib/app-builder/persist";
import "./App.css";

type Editor = "layout" | "data" | "bots" | "intelligence" | "users" | "settings";

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
const PENDING_SHEET_KEY = "sheetomatic-ab-pending-sheet";

function googleCallbackNote(flag: string | null) {
  switch (flag) {
    case "testing":
      return "Google blocked Connect: the Cloud app is still in Testing. Add this Gmail as a tester, or publish the OAuth consent screen to In production. Upload a spreadsheet works without Connect.";
    case "denied":
      return "Google sign-in was cancelled. If you saw “verification process”, the Cloud app is in Testing — add testers or publish it.";
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
  initial = null,
}: {
  googleAuthReady?: boolean;
  initial?: AppBuilderStudioSnapshot | null;
}) {
  const [config, setConfig] = useState<AppConfig>(
    () => initial?.config ?? createEmptyConfig("My app"),
  );
  const liveSheetId = useRef<string | null>(null);
  const skipSave = useRef(true);
  const [sheet] = useState<SheetAdapter>(() =>
    withLiveSheetSync(
      createMockAdapter(initial?.workbook ?? emptyBook),
      () => liveSheetId.current,
    ),
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
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("phone");
  const [showAllDevices, setShowAllDevices] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [importTabs, setImportTabs] = useState<string[]>([]);
  const [importTab, setImportTab] = useState("");
  const [importHeaderRow, setImportHeaderRow] = useState(1);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(
    initial?.templateId ?? null,
  );
  const [lastPrompt, setLastPrompt] = useState("");
  const [dataPane, setDataPane] = useState<"rows" | "schema">("rows");
  const fileRef = useRef<HTMLInputElement>(null);

  liveSheetId.current = google.spreadsheetId || connected;
  const workbook = useMemo(() => sheet.getWorkbook(), [sheet, rev]);
  const screens = config.views;
  const bump = () => setRev((n) => n + 1);

  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (Object.keys(workbook.tabs).length === 0) return;
    const timer = window.setTimeout(() => {
      void saveAppBuilderStudioAction({
        config,
        workbook,
        templateId: activeTemplateId,
      }).then((result) => {
        if (result.ok) setNote(result.message);
      });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [config, workbook, activeTemplateId]);

  function applyGeneratedPlan(plan: AppPlan, noteText: string) {
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
    setNote(noteText);
  }

  function build(prompt: string) {
    if (credits < 1) {
      setNote("Credits finished. Buy more to keep building.");
      return;
    }
    const rebuilding = config.views.length > 0;
    const plan = planFromPrompt(prompt);
    setLastPrompt(prompt.trim());
    setCredits(spendCredit());
    applyGeneratedPlan(
      plan,
      rebuilding
        ? `Rebuilt “${plan.config.meta.name}” from your prompt. Use Layout or Data if you only need a small change.`
        : google.connected && !google.spreadsheetId
          ? `Built “${plan.config.meta.name}”. Create this as a new Sheet in Drive — you do not need to upload one.`
          : `Built “${plan.config.meta.name}” from your words. Preview it in the phone.`,
    );
  }

  async function createNewSpreadsheet(prompt: string) {
    const plan = planFromPrompt(prompt.trim() || "custom blank app with one table");
    applyGeneratedPlan(
      plan,
      google.connected
        ? `Creating “${plan.config.meta.name}” as a new Sheet in your Drive…`
        : `“${plan.config.meta.name}” is ready. Connect Google to save it as a new Sheet — no upload needed.`,
    );
    if (google.connected) {
      await createSheetFromPlan(plan);
    }
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

  async function createSheetFromPlan(plan: AppPlan) {
    if (!google.connected) {
      setNote("Connect with Google first, then we can create the Sheet.");
      return;
    }
    setGoogleBusy(true);
    try {
      const res = await fetch("/api/app-builder/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          templateId: plan.id,
          title: `${plan.config.meta.name} · Sheetomatic`,
          workbook: plan.workbook,
        }),
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
        const pending =
          typeof sessionStorage !== "undefined"
            ? sessionStorage.getItem(PENDING_SHEET_KEY)
            : null;
        if (data.connected && pending) {
          sessionStorage.removeItem(PENDING_SHEET_KEY);
          setPickedSheet(pending);
          setConnected(pending);
          await loadWorkbook(pending);
        } else if (data.spreadsheetId) {
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
    options?: { tab?: string; headerRow?: number; askSchema?: boolean },
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
    applyWorkbook(body.workbook, options?.tab, options?.askSchema);
    setConnected(spreadsheetId);
    setNote(
      options?.askSchema
        ? `Opened “${body.workbook.title}”. Tick the tables for the phone, then link parent and child.`
        : `Opened “${body.workbook.title}”. Screens and relations were built from your tables.`,
    );
  }

  function applyWorkbook(
    workbook: SheetWorkbook,
    focusTab?: string,
    askSchema = false,
  ) {
    sheet.replace(workbook);
    const next = inferAppFromWorkbook(workbook);
    setConfig(next);
    const focusView = next.views.find((v) => v.tab === focusTab);
    setFocus(focusView?.id || "home");
    setDataTab(focusTab || Object.keys(workbook.tabs)[0] || "");
    setGalleryOpen(false);
    setActiveTemplateId(null);
    if (askSchema) {
      setEditor("data");
      setDataPane("schema");
    }
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
        askSchema: true,
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

  function openGallery() {
    setPreview(false);
    setEditor("layout");
    setGalleryOpen(true);
  }

  function pickSpreadsheet() {
    fileRef.current?.click();
  }

  async function onSpreadsheetFile(file: File | undefined) {
    if (!file) return;
    try {
      const book = await workbookFromSpreadsheetFile(file);
      applyWorkbook(book, undefined, true);
      setPreview(false);
      setEditor("data");
      setDataPane("schema");
      setNote(
        `Opened “${book.title}”. Tick the tables for the phone, then link parent and child.`,
      );
    } catch (error) {
      setNote(
        error instanceof Error
          ? error.message
          : "Could not read that spreadsheet.",
      );
    }
  }

  async function connectSheet() {
    const id = parseGoogleSheetId(sheetUrl);
    if (!id) {
      pickSpreadsheet();
      return;
    }
    if (google.connected) {
      setGoogleBusy(true);
      try {
        await loadWorkbook(id, { askSchema: true });
        setPreview(false);
      } finally {
        setGoogleBusy(false);
      }
      return;
    }
    setConnected(id);
    sessionStorage.setItem(PENDING_SHEET_KEY, id);
    setNote(
      "Connect with Google to open that Sheet live, or upload a .xlsx / .csv.",
    );
  }

  const emptyApp = config.views.length === 0;
  const showGallery = galleryOpen || (emptyApp && editor === "layout" && !preview);

  if (showGallery) {
    return (
      <div className="ab-studio">
        <input
          ref={fileRef}
          type="file"
          hidden
          accept={SPREADSHEET_ACCEPT}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void onSpreadsheetFile(file);
          }}
        />
        <TemplateGallery
          onPick={applyPlan}
          onBuild={build}
          onCreateNew={createNewSpreadsheet}
          sheetUrl={sheetUrl}
          onSheetUrl={setSheetUrl}
          onConnectSheet={connectSheet}
          onUploadFile={onSpreadsheetFile}
          onBack={emptyApp ? undefined : () => setGalleryOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className={`ab-studio glide${preview ? " previewing" : ""}${showGallery ? " gallery-open" : ""}`}>
      <input
        ref={fileRef}
        type="file"
        hidden
        accept={SPREADSHEET_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void onSpreadsheetFile(file);
        }}
      />
      {/Testing|verification process/.test(note) ? (
        <p className="google-alert" role="status">
          {note} Google Cloud → APIs &amp; Services → OAuth consent screen →
          Test users (add the Gmail) or Publish app.
        </p>
      ) : null}
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
              onClick={() => applyWorkbook(sheet.getWorkbook(), dataTab, true)}
            >
              Rebuild from Sheet
            </button>
            <button type="button" className="ghost" onClick={pickSpreadsheet}>
              Upload spreadsheet
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
            <button type="button" onClick={() => void connectSheet()}>
              Open Sheet
            </button>
            <button type="button" className="ghost" onClick={pickSpreadsheet}>
              Upload spreadsheet
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
              ["bots", "Bots"],
              ["intelligence", "Intelligence"],
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
        <div className="topbar-actions">
          <button
            type="button"
            className="templates-btn"
            onClick={openGallery}
          >
            ← Templates
          </button>
          <button type="button" className="ghost-bar" onClick={pickSpreadsheet}>
            Upload
          </button>
          <div className="device-switch" role="group" aria-label="Preview device">
            {PREVIEW_DEVICES.map((device) => (
              <button
                key={device.id}
                type="button"
                className={
                  !showAllDevices && previewDevice === device.id ? "on" : ""
                }
                onClick={() => {
                  setPreviewDevice(device.id);
                  setShowAllDevices(false);
                  setPreview(true);
                }}
              >
                {device.label}
              </button>
            ))}
            <button
              type="button"
              className={showAllDevices ? "on" : ""}
              onClick={() => {
                setShowAllDevices(true);
                setPreview(true);
              }}
            >
              All
            </button>
          </div>
          <button
            type="button"
            className={preview ? "on preview-btn" : "preview-btn"}
            onClick={() => setPreview((on) => !on)}
          >
            {preview ? "← Exit preview" : "Preview"}
          </button>
          <span className={`credits ${credits < 5 ? "low" : ""}`}>{credits} credits</span>
        </div>
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
            <button type="button" onClick={openGallery}>
              Templates
              <em>Ready apps</em>
            </button>
            <button type="button" onClick={() => setFocus("home")}>
              Tables in app
              <em>
                {screens.filter((s) => s.nav !== false).length} of {screens.length}
              </em>
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
                onCreateNew={createNewSpreadsheet}
                sheetUrl={sheetUrl}
                onSheetUrl={setSheetUrl}
          onConnectSheet={connectSheet}
          onUploadFile={onSpreadsheetFile}
          onBack={emptyApp ? undefined : () => setGalleryOpen(false)}
              />
            ) : (
              <div className={`canvas${showAllDevices ? " is-all-devices" : ""}`}>
                {(showAllDevices ? PREVIEW_DEVICES : [PREVIEW_DEVICES.find((d) => d.id === previewDevice)!]).map(
                  (device) => (
                    <DeviceFrame key={device.id} device={device.id}>
                      <AppRuntime
                        config={config}
                        sheet={sheet}
                        focusViewId={focus}
                        onSheetChange={bump}
                      />
                    </DeviceFrame>
                  ),
                )}
              </div>
            )}
            {preview ? null : (
              <AiBar
                credits={credits}
                built={config.views.length > 0}
                lastPrompt={lastPrompt}
                onBuild={build}
              />
            )}
            {note ? <p className="build-note">{note}</p> : null}
            {google.connected && !google.spreadsheetId && Object.keys(workbook.tabs).length ? (
              <p className="build-note">
                <button
                  type="button"
                  className="linkish"
                  disabled={googleBusy}
                  onClick={() =>
                    void createSheetFromPlan({
                      id: activeTemplateId || "custom",
                      label: config.meta.name,
                      blurb: "",
                      prompt: "",
                      config,
                      workbook,
                    })
                  }
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
          config={config}
          tabName={dataTab || Object.keys(workbook.tabs)[0] || ""}
          pane={dataPane}
          onPane={setDataPane}
          onTab={setDataTab}
          onChange={bump}
          onConfigChange={(next) => {
            setConfig(next);
            bump();
          }}
          onTemplates={openGallery}
          onUpload={pickSpreadsheet}
          onSeePhone={() => {
            setDataPane("rows");
            setEditor("layout");
            setFocus("home");
            setPreview(true);
          }}
        />
      )}

      {editor === "bots" && (
        <BotsPanel
          config={config}
          sheet={sheet}
          onChange={(next) => {
            setConfig(next);
            bump();
          }}
        />
      )}

      {editor === "intelligence" && (
        <IntelligencePanel
          config={config}
          onChange={(next) => {
            setConfig(next);
            bump();
          }}
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
  config,
  tabName,
  pane,
  onPane,
  onTab,
  onChange,
  onConfigChange,
  onTemplates,
  onUpload,
  onSeePhone,
}: {
  sheet: SheetAdapter;
  config: AppConfig;
  tabName: string;
  pane: "rows" | "schema";
  onPane: (pane: "rows" | "schema") => void;
  onTab: (name: string) => void;
  onChange: () => void;
  onConfigChange: (next: AppConfig) => void;
  onTemplates: () => void;
  onUpload: () => void;
  onSeePhone: () => void;
}) {
  const book = sheet.getWorkbook();
  const tab = book.tabs[tabName];
  const view = config.views.find((item) => item.tab === tabName);
  const [col, setCol] = useState("");
  const [colType, setColType] = useState<FieldType>("text");
  const [newTab, setNewTab] = useState("");
  const [focusCol, setFocusCol] = useState(tab?.headers[0] || "");
  const [aiHint, setAiHint] = useState("");
  const tables = Object.keys(book.tabs);

  function applyType(name: string, type: FieldType, extras: Parameters<typeof withColumnType>[5] = {}) {
    const values = tab?.rows.map((row) => row.cells[name]) || [];
    const field = fieldOf(view, name);
    onConfigChange(
      withColumnType(config, tabName, name, type, values, {
        ...field,
        ...extras,
        fileFolder:
          extras.fileFolder ||
          field?.fileFolder ||
          `${config.meta.name}/${tabName}`,
        refTab: extras.refTab || field?.refTab || tables.find((item) => item !== tabName),
      }),
    );
  }

  return (
    <div className="data-editor">
      <aside className="pages">
        <p className="aside-label">Tables</p>
        <button type="button" onClick={onTemplates}>
          Templates
          <em>Change app</em>
        </button>
        <button
          type="button"
          className={pane === "schema" ? "on" : ""}
          onClick={() => onPane("schema")}
        >
          Tables & relations
          <em>
            {config.views.filter((v) => v.nav !== false).length} in app
          </em>
        </button>
        {Object.values(book.tabs).map((t) => {
          const view = config.views.find((v) => v.tab === t.name);
          const inApp = view ? view.nav !== false : false;
          return (
            <div key={t.name} className="table-row">
              <label className="table-check">
                <input
                  type="checkbox"
                  checked={inApp}
                  onChange={(e) =>
                    onConfigChange(
                      setTableInApp(config, book, t.name, e.target.checked),
                    )
                  }
                  aria-label={`${t.name} in app`}
                />
              </label>
              <button
                type="button"
                className={tabName === t.name && pane === "rows" ? "on" : ""}
                onClick={() => {
                  onTab(t.name);
                  onPane("rows");
                }}
              >
                {t.name}
                <em>
                  {t.rows.length}
                  {inApp ? "" : " · off"}
                </em>
              </button>
            </div>
          );
        })}
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
        {pane === "schema" ? (
          <SchemaStudio
            config={config}
            sheet={sheet}
            onChange={onConfigChange}
            onDone={onSeePhone}
          />
        ) : !tab ? (
          <p className="hint">Build an app first — tables appear here like your Sheet.</p>
        ) : (
          <div className="sheet">
            <header>
              <h2>{tab.name}</h2>
              <p>
                {book.title} · edit cells like Google Sheets
              </p>
              <div className="sheet-toolbar">
                <button type="button" className="btn ghost" onClick={onTemplates}>
                  ← Templates
                </button>
                <button type="button" className="btn ghost" onClick={() => onPane("schema")}>
                  Tables & relations
                </button>
                <button type="button" className="btn ghost" onClick={onUpload}>
                  Upload spreadsheet
                </button>
              </div>
            </header>
            <div className="grid-scroll">
              <table>
                <thead>
                  <tr>
                    <th className="idx">#</th>
                    {tab.headers.map((h, index) => (
                      <th key={h}>
                        <span className="col-head">
                          <button
                            type="button"
                            className="col-move"
                            disabled={index === 0}
                            aria-label={`Move ${h} left`}
                            onClick={() => {
                              sheet.moveColumn(tab.name, h, -1);
                              const headers =
                                sheet.getTab(tab.name)?.headers || [];
                              onConfigChange({
                                ...config,
                                views: config.views.map((view) =>
                                  view.tab === tab.name
                                    ? { ...view, cols: headers }
                                    : view,
                                ),
                              });
                            }}
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            className={focusCol === h ? "col-name on" : "col-name"}
                            onClick={() => setFocusCol(h)}
                          >
                            {h}
                          </button>
                          <select
                            className="col-type"
                            aria-label={`Type for ${h}`}
                            value={fieldTypeOf(
                              view,
                              h,
                              tab.rows.map((row) => row.cells[h]),
                            )}
                            onChange={(e) => {
                              setFocusCol(h);
                              applyType(h, e.target.value as FieldType);
                            }}
                          >
                            {FIELD_TYPE_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="col-move"
                            disabled={index === tab.headers.length - 1}
                            aria-label={`Move ${h} right`}
                            onClick={() => {
                              sheet.moveColumn(tab.name, h, 1);
                              const headers =
                                sheet.getTab(tab.name)?.headers || [];
                              onConfigChange({
                                ...config,
                                views: config.views.map((view) =>
                                  view.tab === tab.name
                                    ? { ...view, cols: headers }
                                    : view,
                                ),
                              });
                            }}
                          >
                            ›
                          </button>
                        </span>
                      </th>
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
                          <DataCell
                            type={fieldTypeOf(view, h, tab.rows.map((row) => row.cells[h]))}
                            field={fieldOf(view, h)}
                            value={r.cells[h]}
                            row={r.cells}
                            tables={tables}
                            sheet={sheet}
                            folder={`${config.meta.name}/${tab.name}`}
                            onChange={(next) => {
                              sheet.setCell(tab.name, r._row, h, next);
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
            {focusCol ? (
              <ColumnInspector
                col={focusCol}
                type={fieldTypeOf(view, focusCol, tab.rows.map((row) => row.cells[focusCol]))}
                field={fieldOf(view, focusCol)}
                tables={tables}
                tabName={tab.name}
                headers={tab.headers}
                aiHint={aiHint}
                onAiHint={setAiHint}
                onApply={(type, extras) => applyType(focusCol, type, extras)}
              />
            ) : null}
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
              <select
                className="col-type"
                aria-label="New column type"
                value={colType}
                onChange={(e) => setColType(e.target.value as FieldType)}
              >
                {FIELD_TYPE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  const name = col.trim();
                  if (!name) return;
                  sheet.addColumn(tab.name, name);
                  applyType(name, colType);
                  setCol("");
                  setColType("text");
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

function DataCell({
  type,
  field,
  value,
  row,
  tables,
  sheet,
  folder,
  onChange,
}: {
  type: FieldType;
  field?: AppFormField;
  value: CellValue;
  row: Record<string, CellValue>;
  tables: string[];
  sheet: SheetAdapter;
  folder: string;
  onChange: (next: CellValue) => void;
}) {
  const text = value == null ? "" : String(value).split("::")[0];
  if (type === "virtual") {
    const tablesMap = Object.fromEntries(tables.map((name) => [name, sheet.listRows(name)]));
    const shown = evaluateAppSheetFormula(field?.formula || "", { row, tables: tablesMap });
    return <span className="cell-virtual">{shown === "" ? "—" : String(shown)}</span>;
  }
  if (type === "enum" || type === "choice") {
    const options = field?.options || [];
    return (
      <select className="cell" value={text} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        {text && !options.includes(text) ? <option value={text}>{text}</option> : null}
      </select>
    );
  }
  if (type === "ref") {
    const refTab = field?.refTab || tables[0] || "";
    const keyCol = field?.refKeyCol || field?.refLabelCol || "";
    const labelCol = field?.refLabelCol || keyCol;
    const rows = refTab ? sheet.listRows(refTab) : [];
    const key = keyCol || Object.keys(rows[0]?.cells || {})[0] || "";
    const label = labelCol || key;
    return (
      <select className="cell" value={text} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {rows.map((row) => {
          const id = row.cells[key] == null ? "" : String(row.cells[key]);
          const name = row.cells[label] == null ? id : String(row.cells[label]);
          return (
            <option key={`${row._row}-${id}`} value={id}>
              {name}
            </option>
          );
        })}
      </select>
    );
  }
  if (type === "file") {
    return (
      <label className="cell-file">
        <span>{text ? text.split("/").slice(-1)[0] : `${folder}/`}</span>
        <input
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const path = `${field?.fileFolder || folder}/${file.name}`;
              onChange(typeof reader.result === "string" ? `${path}::${reader.result}` : path);
            };
            reader.readAsDataURL(file);
          }}
        />
      </label>
    );
  }
  return (
    <input
      className="cell"
      type={type === "number" ? "number" : type === "date" ? "date" : "text"}
      value={text}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ColumnInspector({
  col,
  type,
  field,
  tables,
  tabName,
  headers,
  aiHint,
  onAiHint,
  onApply,
}: {
  col: string;
  type: FieldType;
  field?: AppFormField;
  tables: string[];
  tabName: string;
  headers: string[];
  aiHint: string;
  onAiHint: (value: string) => void;
  onApply: (type: FieldType, extras: Partial<AppFormField>) => void;
}) {
  return (
    <div className="col-inspector">
      <strong>
        {col} · {FIELD_TYPE_OPTIONS.find((item) => item.id === type)?.label || type}
      </strong>
      {type === "enum" || type === "choice" ? (
        <label>
          Dropdown values (AppSheet Enum)
          <input
            defaultValue={(field?.options || []).join(", ")}
            placeholder="New, Quote, Won"
            onBlur={(e) =>
              onApply(type, {
                options: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
      ) : null}
      {type === "ref" ? (
        <div className="col-inspector-row">
          <label>
            Referenced table
            <select
              value={field?.refTab || ""}
              onChange={(e) => onApply("ref", { refTab: e.target.value })}
            >
              <option value="">Pick table</option>
              {tables
                .filter((item) => item !== tabName)
                .map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Key / label column
            <input
              defaultValue={field?.refLabelCol || field?.refKeyCol || ""}
              placeholder="Name"
              onBlur={(e) =>
                onApply("ref", {
                  refKeyCol: e.target.value.trim(),
                  refLabelCol: e.target.value.trim(),
                })
              }
            />
          </label>
        </div>
      ) : null}
      {type === "file" ? (
        <label>
          Custom folder (folder / file)
          <input
            defaultValue={field?.fileFolder || ""}
            placeholder={`${tabName}/Files`}
            onBlur={(e) => onApply("file", { fileFolder: e.target.value.trim() })}
          />
        </label>
      ) : null}
      {type === "virtual" ? (
        <>
          <label>
            App formula
            <input
              defaultValue={field?.formula || ""}
              placeholder='CONCATENATE([Name]," — ",[Company])'
              onBlur={(e) => onApply("virtual", { formula: e.target.value, virtual: true })}
            />
          </label>
          <div className="col-inspector-row">
            <input
              value={aiHint}
              onChange={(e) => onAiHint(e.target.value)}
              placeholder="AI: combine name and company"
            />
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                const formula = suggestAppSheetFormula(aiHint || col, headers);
                onApply("virtual", { formula, virtual: true });
                onAiHint("");
              }}
            >
              AI formula
            </button>
          </div>
        </>
      ) : null}
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
        <strong>Connect to Google is blocked for everyone</strong> until the
        Cloud OAuth consent screen is published. Today it is in Testing — that
        is the 403 you saw. In Google Cloud Console → APIs &amp; Services →
        OAuth consent screen: add each Gmail as a <strong>Test user</strong>,
        or click <strong>Publish app</strong> (In production). Users then see
        an “unverified app” warning and can continue. Verification is only
        needed to hide that warning. Privacy URL Google asks for:{" "}
        <a href="/app-builder/privacy" target="_blank" rel="noreferrer">
          sheetomatic.com/app-builder/privacy
        </a>
        . Until that is done, use <strong>Upload spreadsheet</strong>.
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
