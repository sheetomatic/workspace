"use client";

import { useState } from "react";
import {
  APP_ROLES,
  isAppAdmin,
  type AppConfig,
  type AppUser,
  type AppView,
  type UserRole,
} from "@/lib/app-builder";

type Pane = "app" | "tables" | "people";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function SecurityPanel({ config, onChange }: Props) {
  const [pane, setPane] = useState<Pane>("app");
  const users = config.users || [];
  const tables = uniqueTables(config.views);
  const emails = (config.meta.allowedEmails || []).join("\n");
  const pinOn = config.meta.requirePin !== false;

  function patchMeta(patch: Partial<AppConfig["meta"]>) {
    onChange({ ...config, meta: { ...config.meta, ...patch } });
  }

  function patchTable(tab: string, patch: Partial<AppView>) {
    onChange({
      ...config,
      views: config.views.map((view) => (view.tab === tab ? { ...view, ...patch } : view)),
    });
  }

  function patchUser(id: string, patch: Partial<AppUser>) {
    onChange({
      ...config,
      users: users.map((user) => (user.id === id ? { ...user, ...patch } : user)),
    });
  }

  function setStaffScreen(viewId: string, open: boolean) {
    const rest = (config.visibility || []).filter(
      (rule) => !(rule.target === "view" && rule.targetId === viewId),
    );
    onChange({
      ...config,
      visibility: open
        ? rest
        : [...rest, { id: `vis-${viewId}`, target: "view", targetId: viewId, when: "owner" }],
    });
  }

  return (
    <div className="plain people-panel security-panel">
      <h2>Security</h2>
      <p className="hint">Who can open the app, and what they can see.</p>

      <div className="ab-insp-seg sec-seg" role="tablist" aria-label="Security">
        {(
          [
            ["app", "App"],
            ["tables", "Tables"],
            ["people", "People"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pane === id}
            className={pane === id ? "on" : ""}
            onClick={() => setPane(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {pane === "app" ? (
        <div className="sec-pane">
          <div className="sec-roles">
            {APP_ROLES.map((item) => (
              <div key={item.id}>
                <strong>{item.label}</strong>
                <span>{roleShort(item.id)}</span>
              </div>
            ))}
          </div>

          <div className="sec-row">
            <div>
              <strong>Require PIN</strong>
              <span>Sign in. No Google account.</span>
            </div>
            <div className="ab-perm">
              <button type="button" className={pinOn ? "on" : ""} onClick={() => patchMeta({ requirePin: true })}>
                On
              </button>
              <button type="button" className={!pinOn ? "on" : ""} onClick={() => patchMeta({ requirePin: false })}>
                Off
              </button>
            </div>
          </div>

          <label className="field-label">
            Allowed emails
            <textarea
              value={emails}
              rows={3}
              placeholder="One per line"
              onChange={(e) =>
                patchMeta({
                  allowedEmails: e.target.value
                    .split(/\n/)
                    .map((line) => line.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>

          <label className="field-label">
            Allowed domain
            <input
              value={config.meta.allowedDomain || ""}
              placeholder="firm.com"
              onChange={(e) => patchMeta({ allowedDomain: e.target.value.trim() || undefined })}
            />
          </label>

          <div className="sec-row">
            <div>
              <strong>Bots run as</strong>
              <span>Who USEREMAIL() is when a bot fires.</span>
            </div>
            <div className="ab-perm">
              <button
                type="button"
                className={config.meta.runAs !== "owner" ? "on" : ""}
                onClick={() => patchMeta({ runAs: "user" })}
              >
                Signed-in
              </button>
              <button
                type="button"
                className={config.meta.runAs === "owner" ? "on" : ""}
                onClick={() => patchMeta({ runAs: "owner" })}
              >
                Owner
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pane === "tables" ? (
        <div className="sec-pane">
          <p className="aside-label">Screens</p>
          {config.views.length ? (
            <ul className="sec-chips">
              {config.views.map((view) => {
                const hidden = config.visibility?.some(
                  (rule) =>
                    rule.target === "view" &&
                    rule.targetId === view.id &&
                    rule.when === "owner",
                );
                return (
                  <li key={view.id}>
                    <button
                      type="button"
                      className={hidden ? "" : "on"}
                      onClick={() => setStaffScreen(view.id, hidden)}
                    >
                      {view.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="hint">Add a screen on App first.</p>
          )}
          <p className="hint">Off = Owner and Admin only.</p>

          <p className="aside-label">Row filter</p>
          {tables.length ? (
            <ul className="sec-tables">
              {tables.map((view) => (
                <li key={view.tab}>
                  <label>
                    {view.name}
                    <input
                      value={view.securityFilter || ""}
                      placeholder="[Email]=USEREMAIL()"
                      onChange={(e) =>
                        patchTable(view.tab, { securityFilter: e.target.value || undefined })
                      }
                    />
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <p className="hint">Add a screen on App first.</p>
          )}
        </div>
      ) : null}

      {pane === "people" ? (
        <div className="sec-pane">
          <ul className="sec-people">
            {users.map((user) => {
              const admin = isAppAdmin(user.role);
              const deletesOn =
                user.role === "manager" ? user.allowDeletes === true : user.allowDeletes !== false;
              return (
                <li key={user.id} className="ab-card">
                  <header>
                    <strong>{user.name}</strong>
                    <select
                      value={user.role === "staff" ? "user" : user.role}
                      aria-label={`Role for ${user.name}`}
                      onChange={(e) =>
                        patchUser(user.id, { role: e.target.value as UserRole })
                      }
                    >
                      {APP_ROLES.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    {admin ? null : (
                      <button
                        type="button"
                        className={user.disabled ? "" : "on"}
                        onClick={() => patchUser(user.id, { disabled: !user.disabled })}
                      >
                        {user.disabled ? "Off" : "On"}
                      </button>
                    )}
                  </header>
                  {admin ? null : (
                    <>
                      <div className="ab-perm">
                        <button
                          type="button"
                          className={user.allowAdds !== false ? "on" : ""}
                          onClick={() => patchUser(user.id, { allowAdds: user.allowAdds === false })}
                        >
                          Adds
                        </button>
                        <button
                          type="button"
                          className={user.allowUpdates !== false ? "on" : ""}
                          onClick={() =>
                            patchUser(user.id, { allowUpdates: user.allowUpdates === false })
                          }
                        >
                          Updates
                        </button>
                        <button
                          type="button"
                          className={deletesOn ? "on" : ""}
                          onClick={() =>
                            patchUser(user.id, {
                              allowDeletes:
                                user.role === "manager"
                                  ? user.allowDeletes !== true
                                  : user.allowDeletes === false,
                            })
                          }
                        >
                          Deletes
                        </button>
                      </div>
                      {tables.length ? (
                        <ul className="sec-chips">
                          {tables.map((view) => {
                            const listed = user.tables == null || user.tables.includes(view.tab);
                            return (
                              <li key={view.tab}>
                                <button
                                  type="button"
                                  className={listed ? "on" : ""}
                                  onClick={() =>
                                    patchUser(user.id, {
                                      tables: nextTables(
                                        user.tables,
                                        tables.map((item) => item.tab),
                                        view.tab,
                                        !listed,
                                      ),
                                    })
                                  }
                                >
                                  {view.name}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="hint">Name and PIN are on Users.</p>
        </div>
      ) : null}
    </div>
  );
}

function roleShort(id: string) {
  if (id === "owner" || id === "admin") return "All rows";
  if (id === "manager") return "All rows";
  return "Own rows";
}

function uniqueTables(views: AppView[]) {
  const seen = new Set<string>();
  return views.filter((view) => {
    if (seen.has(view.tab)) return false;
    seen.add(view.tab);
    return true;
  });
}

function nextTables(
  current: string[] | undefined,
  all: string[],
  tab: string,
  open: boolean,
): string[] | undefined {
  const base = current?.length ? current : all;
  const next = open ? [...new Set([...base, tab])] : base.filter((item) => item !== tab);
  if (next.length === all.length) return undefined;
  return next;
}
