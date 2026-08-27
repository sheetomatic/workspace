"use client";

import type { AppConfig, AppView } from "@/lib/app-builder";

type Props = {
  config: AppConfig;
  view?: AppView;
  tabName: string;
  sourceTitle?: string;
  spreadsheetId?: string | null;
  connected?: boolean;
  onPatchView: (patch: Partial<AppView>) => void;
  onRefresh: () => void;
  onLink: () => void;
  onDelink: () => void;
};

export function TableSettingsPanel({
  config,
  view,
  tabName,
  sourceTitle,
  spreadsheetId,
  connected,
  onPatchView,
  onRefresh,
  onLink,
  onDelink,
}: Props) {
  const adds = view?.allowAdds !== false;
  const updates = view?.allowUpdates !== false;
  const deletes = view?.allowDelete !== false;
  const readOnly = !adds && !updates && !deletes;
  const sourceUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    : null;

  return (
    <div className="ab-table-set">
      <label className="field-label">
        Table name
        <input
          value={view?.name || tabName}
          onChange={(e) => onPatchView({ name: e.target.value })}
        />
        <em>Name staff see on the phone. The Sheet tab stays {tabName}.</em>
      </label>

      <label className="field-label">
        Security filter
        <input
          value={view?.securityFilter || ""}
          placeholder='OR(IN(USERROLE(),"Admin","Manager"),[Email]=USEREMAIL())'
          onChange={(e) => onPatchView({ securityFilter: e.target.value || undefined })}
        />
        <em>AppSheet formula. Users only see rows where this is true. Admin and Manager skip row-owner.</em>
      </label>

      <p className="aside-label">Are updates allowed?</p>
      <div className="ab-perm">
        <button
          type="button"
          className={updates && !readOnly ? "on" : ""}
          onClick={() => onPatchView({ allowUpdates: !updates })}
        >
          Updates
        </button>
        <button
          type="button"
          className={adds && !readOnly ? "on" : ""}
          onClick={() => onPatchView({ allowAdds: !adds })}
        >
          Adds
        </button>
        <button
          type="button"
          className={deletes && !readOnly ? "on" : ""}
          onClick={() => onPatchView({ allowDelete: !deletes })}
        >
          Deletes
        </button>
        <button
          type="button"
          className={readOnly ? "on" : ""}
          onClick={() =>
            onPatchView({ allowAdds: false, allowUpdates: false, allowDelete: false })
          }
        >
          Read-only
        </button>
      </div>

      <p className="aside-label">Storage</p>
      <dl className="ab-store">
        <div>
          <dt>Source</dt>
          <dd>{sourceTitle || config.meta.name}</dd>
        </div>
        <div>
          <dt>Worksheet</dt>
          <dd>{tabName}</dd>
        </div>
        <div>
          <dt>Data source</dt>
          <dd>{connected ? "Google Sheets" : "This app (not linked)"}</dd>
        </div>
        <div>
          <dt>Source id</dt>
          <dd>{spreadsheetId || "—"}</dd>
        </div>
      </dl>

      <div className="sheet-toolbar">
        {sourceUrl ? (
          <a className="btn ghost" href={sourceUrl} target="_blank" rel="noreferrer">
            View data source
          </a>
        ) : null}
        <button type="button" className="btn ghost" onClick={onRefresh} disabled={!connected}>
          Refresh data
        </button>
        {connected ? (
          <button type="button" className="btn ghost" onClick={onDelink}>
            Delink Sheet
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={onLink}>
            Link Sheet
          </button>
        )}
      </div>
      <p className="hint">
        Refresh pulls the latest rows from Google. Cell edits already write back
        when the Sheet is linked. Delink keeps the app; staff lose the live Sheet.
      </p>
    </div>
  );
}
