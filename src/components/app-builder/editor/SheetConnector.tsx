"use client";

import { useEffect, useMemo, useState } from "react";

type SheetFile = { id: string; name: string };

type Props = {
  connected: boolean;
  googleEmail?: string;
  spreadsheetId?: string | null;
  files: SheetFile[];
  listError?: string | null;
  busy?: boolean;
  credits: number;
  sheetUrl: string;
  onSheetUrl: (value: string) => void;
  onConnectGoogle: () => void;
  onOpenLink: () => void;
  onPickFile: (id: string) => void;
  onUpload: () => void;
  onCreate?: () => void;
  onDisconnect?: () => void;
  onRefresh: () => void;
  note?: string;
};

declare global {
  interface Window {
    google?: {
      picker?: {
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          setOAuthToken: (token: string) => unknown;
          setDeveloperKey: (key: string) => unknown;
          setAppId: (id: string) => unknown;
          setCallback: (cb: (data: { action: string; docs?: { id: string; name: string }[] }) => void) => unknown;
          build: () => { setVisible: (on: boolean) => void };
        };
        DocsView: new (id: string) => { setMimeTypes: (types: string) => unknown };
        ViewId: { SPREADSHEETS: string };
        Action: { PICKED: string };
      };
    };
    gapi?: { load: (name: string, cb: () => void) => void };
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google Picker."));
    document.head.appendChild(script);
  });
}

async function openGooglePicker(onPick: (id: string, name: string) => void) {
  const res = await fetch("/api/app-builder/google/picker", { cache: "no-store" });
  const body = (await res.json().catch(() => null)) as {
    accessToken?: string;
    clientId?: string;
    apiKey?: string;
    appId?: string;
    error?: string;
  } | null;
  if (!res.ok || !body?.accessToken) {
    throw new Error(body?.error || "Reconnect Google to browse Sheets.");
  }
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise<void>((resolve) => {
    window.gapi?.load("picker", () => resolve());
  });
  const pickerApi = window.google?.picker;
  if (!pickerApi) throw new Error("Google Picker did not load.");
  const view = new pickerApi.DocsView(pickerApi.ViewId.SPREADSHEETS);
  view.setMimeTypes("application/vnd.google-apps.spreadsheet");
  const builder = new pickerApi.PickerBuilder();
  builder.addView(view);
  builder.setOAuthToken(body.accessToken);
  if (body.apiKey) builder.setDeveloperKey(body.apiKey);
  if (body.appId) builder.setAppId(body.appId);
  builder.setCallback((data) => {
    if (data.action !== pickerApi.Action.PICKED) return;
    const doc = data.docs?.[0];
    if (doc?.id) onPick(doc.id, doc.name);
  });
  builder.build().setVisible(true);
}

export function SheetConnector({
  connected,
  googleEmail,
  spreadsheetId,
  files,
  listError,
  busy,
  credits,
  sheetUrl,
  onSheetUrl,
  onConnectGoogle,
  onOpenLink,
  onPickFile,
  onUpload,
  onCreate,
  onDisconnect,
  onRefresh,
  note,
}: Props) {
  const [query, setQuery] = useState("");
  const [pickerNote, setPickerNote] = useState("");
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => file.name.toLowerCase().includes(needle));
  }, [files, query]);

  useEffect(() => {
    if (connected) onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  async function browseDrive() {
    setPickerNote("");
    try {
      await openGooglePicker((id) => onPickFile(id));
    } catch (error) {
      setPickerNote(
        error instanceof Error ? error.message : "Could not open the Sheet picker.",
      );
    }
  }

  if (!connected) {
    return (
      <section className="ab-connect" aria-label="Data sources">
        <header>
          <p>Data</p>
          <h2>Connectors</h2>
        </header>
        {note ? <p className="google-alert">{note}</p> : null}
        <ul className="ab-connect-sources">
          <li>
            <button type="button" className="ab-connect-card" onClick={onConnectGoogle}>
              <i aria-hidden>G</i>
              <span>
                <strong>Google Sheets</strong>
                <em>Sign in — then pick a spreadsheet</em>
              </span>
            </button>
          </li>
          <li>
            <button type="button" className="ab-connect-card" onClick={onUpload}>
              <i aria-hidden>↑</i>
              <span>
                <strong>Upload</strong>
                <em>Excel or CSV on this computer</em>
              </span>
            </button>
          </li>
        </ul>
        <label className="ab-connect-paste">
          Or paste a Sheets link
          <span>
            <input
              value={sheetUrl}
              onChange={(e) => onSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/…"
            />
            <button type="button" onClick={onOpenLink}>
              Open
            </button>
          </span>
        </label>
        <p className="ab-connect-meta">{credits} credits</p>
      </section>
    );
  }

  return (
    <section className="ab-connect" aria-label="Google Sheets connector">
      <header>
        <p>Google Sheets</p>
        <h2>{googleEmail}</h2>
        <div>
          <button type="button" disabled={busy} onClick={onRefresh}>
            Refresh
          </button>
          {onDisconnect ? (
            <button type="button" disabled={busy} onClick={onDisconnect}>
              Disconnect
            </button>
          ) : null}
        </div>
      </header>
      {note ? <p className="google-alert">{note}</p> : null}
      {listError ? <p className="ab-connect-empty">{listError}</p> : null}
      <input
        className="ab-connect-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search sheets"
        aria-label="Search sheets"
      />
      {shown.length ? (
        <ul className="ab-connect-list">
          {shown.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className={file.id === spreadsheetId ? "on" : ""}
                disabled={busy}
                onClick={() => onPickFile(file.id)}
              >
                <i aria-hidden />
                <span>
                  <strong>{file.name}</strong>
                  <em>
                    {file.id === spreadsheetId ? "Connected" : "Google Sheets"}
                  </em>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ab-connect-empty">
          No sheets in this list yet. Google only shows files this app created
          or that you open here. Browse Drive, paste a link, or create one.
        </p>
      )}
      <div className="ab-connect-add">
        <button type="button" disabled={busy} onClick={() => void browseDrive()}>
          Browse Drive
        </button>
        {onCreate ? (
          <button type="button" disabled={busy} onClick={onCreate}>
            Create Sheet
          </button>
        ) : null}
        <button type="button" onClick={onUpload}>
          Upload
        </button>
      </div>
      <label className="ab-connect-paste">
        Paste a Sheets link
        <span>
          <input
            value={sheetUrl}
            onChange={(e) => onSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/…"
          />
          <button type="button" disabled={busy} onClick={onOpenLink}>
            Open
          </button>
        </span>
      </label>
      {pickerNote ? <p className="ab-connect-empty">{pickerNote}</p> : null}
    </section>
  );
}
