"use client";

import { useMemo, useState } from "react";

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
  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((file) => file.name.toLowerCase().includes(needle));
  }, [files, query]);

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
                <em>Sign in once — then paste a Sheet link</em>
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
          Paste a Sheets link
          <span>
            <input
              value={sheetUrl}
              onChange={(e) => onSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…"
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
      <label className="ab-connect-paste">
        Open a spreadsheet
        <span>
          <input
            value={sheetUrl}
            onChange={(e) => onSheetUrl(e.target.value)}
            placeholder="Paste the Sheets link, then Open"
            disabled={busy}
          />
          <button type="button" disabled={busy} onClick={onOpenLink}>
            {busy ? "Opening…" : "Open"}
          </button>
        </span>
      </label>
      <p className="ab-connect-empty">
        In Google Sheets: Share → Copy link. Paste it here. Do not use Browse
        Drive — Google’s picker asks you to sign in again and then hangs.
      </p>
      {listError ? <p className="ab-connect-empty">{listError}</p> : null}
      {files.length ? (
        <>
          <input
            className="ab-connect-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opened sheets"
            aria-label="Search opened sheets"
          />
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
                      {file.id === spreadsheetId ? "Connected" : "Opened in this app"}
                    </em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="ab-connect-add">
        {onCreate ? (
          <button type="button" disabled={busy} onClick={onCreate}>
            Create Sheet
          </button>
        ) : null}
        <button type="button" onClick={onUpload}>
          Upload Excel or CSV
        </button>
      </div>
    </section>
  );
}
