"use client";

import type { AppConfig, AppSlice } from "@/lib/app-builder";

type Props = {
  config: AppConfig;
  tabName: string;
  headers: string[];
  onChange: (next: AppConfig) => void;
};

export function SlicesPanel({ config, tabName, headers, onChange }: Props) {
  const slices = (config.slices || []).filter((slice) => slice.tab === tabName);
  const view = config.views.find((item) => item.tab === tabName);

  function patchSlice(id: string, patch: Partial<AppSlice>) {
    onChange({
      ...config,
      slices: (config.slices || []).map((slice) => (slice.id === id ? { ...slice, ...patch } : slice)),
    });
  }

  return (
    <div className="ab-slices">
      <p className="hint">
        A slice is a filtered table — same as AppSheet. The phone only shows
        rows where the filter is true.
      </p>
      {view ? (
        <label className="field-label">
          This screen uses
          <select
            value={view.sliceId || ""}
            onChange={(e) =>
              onChange({
                ...config,
                views: config.views.map((item) =>
                  item.id === view.id ? { ...item, sliceId: e.target.value || undefined } : item,
                ),
              })
            }
          >
            <option value="">All rows</option>
            {slices.map((slice) => (
              <option key={slice.id} value={slice.id}>
                {slice.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {slices.map((slice) => (
        <article className="ab-card" key={slice.id}>
          <header>
            <input
              value={slice.name}
              aria-label="Slice name"
              onChange={(e) => patchSlice(slice.id, { name: e.target.value })}
            />
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  slices: (config.slices || []).filter((item) => item.id !== slice.id),
                  views: config.views.map((item) =>
                    item.sliceId === slice.id ? { ...item, sliceId: undefined } : item,
                  ),
                })
              }
            >
              Remove
            </button>
          </header>
          <label>
            Row filter
            <input
              value={slice.filter || ""}
              placeholder={'[Category]="Direct Sale"'}
              onChange={(e) => patchSlice(slice.id, { filter: e.target.value || undefined })}
            />
          </label>
          <p className="aside-label">Columns</p>
          <ul className="sec-chips">
            {headers.map((col) => {
              const on = !slice.cols?.length || slice.cols.includes(col);
              return (
                <li key={col}>
                  <button
                    type="button"
                    className={on ? "on" : ""}
                    onClick={() =>
                      patchSlice(slice.id, {
                        cols: nextCols(slice.cols, headers, col, !on),
                      })
                    }
                  >
                    {col}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="aside-label">Update mode</p>
          <div className="ab-perm">
            <button
              type="button"
              className={slice.allowUpdates !== false ? "on" : ""}
              onClick={() => patchSlice(slice.id, { allowUpdates: slice.allowUpdates === false })}
            >
              Updates
            </button>
            <button
              type="button"
              className={slice.allowAdds !== false ? "on" : ""}
              onClick={() => patchSlice(slice.id, { allowAdds: slice.allowAdds === false })}
            >
              Adds
            </button>
            <button
              type="button"
              className={slice.allowDelete !== false ? "on" : ""}
              onClick={() => patchSlice(slice.id, { allowDelete: slice.allowDelete === false })}
            >
              Deletes
            </button>
          </div>
        </article>
      ))}
      <button
        type="button"
        className="ab-text-add"
        onClick={() =>
          onChange({
            ...config,
            slices: [
              ...(config.slices || []),
              {
                id: `sl-${Date.now()}`,
                name: `${tabName} slice`,
                tab: tabName,
                filter: headers[0] ? `ISNOTBLANK([${headers[0]}])` : "",
              },
            ],
          })
        }
      >
        + Slice
      </button>
    </div>
  );
}

function nextCols(current: string[] | undefined, all: string[], col: string, open: boolean) {
  const base = current?.length ? current : all;
  const next = open ? [...new Set([...base, col])] : base.filter((item) => item !== col);
  if (next.length === all.length) return undefined;
  return next;
}
