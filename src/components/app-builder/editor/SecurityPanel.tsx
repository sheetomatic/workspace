"use client";

import { useState, type ReactNode } from "react";
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
  const [pane, setPane] = useState<Pane>("people");
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
    <div className="plain security-panel">
      <h2>Security</h2>
      <p className="sec-lead">Who can open this app, and what they can do.</p>

      <div className="sec-seg" role="tablist" aria-label="Security">
        {(
          [
            ["people", "People"],
            ["app", "App"],
            ["tables", "Tables"],
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

      {pane === "people"
        ? users.map((user) => {
            const admin = isAppAdmin(user.role);
            const deletesOn =
              user.role === "manager" ? user.allowDeletes === true : user.allowDeletes !== false;
            return (
              <SecGroup key={user.id} title={user.name}>
                <SecRow label="Role">
                  <select
                    className="sec-value"
                    value={user.role === "staff" ? "user" : user.role}
                    aria-label={`Role for ${user.name}`}
                    onChange={(e) => patchUser(user.id, { role: e.target.value as UserRole })}
                  >
                    {APP_ROLES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </SecRow>
                {admin ? (
                  <p className="sec-foot">Every screen and every row.</p>
                ) : (
                  <>
                    <SecRow label="Active">
                      <Switch
                        on={!user.disabled}
                        label={`Active ${user.name}`}
                        onChange={(on) => patchUser(user.id, { disabled: !on })}
                      />
                    </SecRow>
                    <SecRow label="Adds">
                      <Switch
                        on={user.allowAdds !== false}
                        label={`Adds for ${user.name}`}
                        onChange={(on) => patchUser(user.id, { allowAdds: on })}
                      />
                    </SecRow>
                    <SecRow label="Updates">
                      <Switch
                        on={user.allowUpdates !== false}
                        label={`Updates for ${user.name}`}
                        onChange={(on) => patchUser(user.id, { allowUpdates: on })}
                      />
                    </SecRow>
                    <SecRow label="Deletes">
                      <Switch
                        on={deletesOn}
                        label={`Deletes for ${user.name}`}
                        onChange={(on) => patchUser(user.id, { allowDeletes: on })}
                      />
                    </SecRow>
                    {tables.map((view) => {
                      const listed = user.tables == null || user.tables.includes(view.tab);
                      return (
                        <SecRow key={view.tab} label={view.name}>
                          <Switch
                            on={listed}
                            label={`${view.name} for ${user.name}`}
                            onChange={(on) =>
                              patchUser(user.id, {
                                tables: nextTables(
                                  user.tables,
                                  tables.map((item) => item.tab),
                                  view.tab,
                                  on,
                                ),
                              })
                            }
                          />
                        </SecRow>
                      );
                    })}
                  </>
                )}
              </SecGroup>
            );
          })
        : null}

      {pane === "app" ? (
        <>
          <SecGroup title="Sign-in">
            <SecRow label="Require PIN" hint="No Google account">
              <Switch
                on={pinOn}
                label="Require PIN"
                onChange={(on) => patchMeta({ requirePin: on })}
              />
            </SecRow>
            <label className="sec-note">
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
            <SecRow label="Domain">
              <input
                className="sec-value"
                value={config.meta.allowedDomain || ""}
                placeholder="firm.com"
                onChange={(e) => patchMeta({ allowedDomain: e.target.value.trim() || undefined })}
              />
            </SecRow>
          </SecGroup>
          <SecGroup title="Bots">
            <SecRow label="Run as">
              <select
                className="sec-value"
                value={config.meta.runAs === "owner" ? "owner" : "user"}
                onChange={(e) =>
                  patchMeta({ runAs: e.target.value === "owner" ? "owner" : "user" })
                }
              >
                <option value="user">Signed-in person</option>
                <option value="owner">Owner</option>
              </select>
            </SecRow>
          </SecGroup>
          <p className="sec-caption">
            Owner and Admin see all rows. Manager sees all. User sees their own.
          </p>
        </>
      ) : null}

      {pane === "tables" ? (
        <>
          <SecGroup title="Screens">
            {config.views.length ? (
              config.views.map((view) => {
                const hidden = config.visibility?.some(
                  (rule) =>
                    rule.target === "view" &&
                    rule.targetId === view.id &&
                    rule.when === "owner",
                );
                return (
                  <SecRow key={view.id} label={view.name}>
                    <Switch
                      on={!hidden}
                      label={`Screen ${view.name}`}
                      onChange={(on) => setStaffScreen(view.id, on)}
                    />
                  </SecRow>
                );
              })
            ) : (
              <p className="sec-foot">Add a screen on App first.</p>
            )}
          </SecGroup>
          <SecGroup title="Row filter">
            {tables.length ? (
              tables.map((view) => (
                <label key={view.tab} className="sec-note">
                  {view.name}
                  <input
                    value={view.securityFilter || ""}
                    placeholder="[Email]=USEREMAIL()"
                    onChange={(e) =>
                      patchTable(view.tab, { securityFilter: e.target.value || undefined })
                    }
                  />
                </label>
              ))
            ) : (
              <p className="sec-foot">Add a screen on App first.</p>
            )}
          </SecGroup>
          <p className="sec-caption">Off screens are Owner and Admin only.</p>
        </>
      ) : null}
    </div>
  );
}

function SecGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sec-group">
      <h3>{title}</h3>
      <div className="sec-box">{children}</div>
    </section>
  );
}

function SecRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="sec-item">
      <div>
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>
      {children}
    </div>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={on ? "sec-switch on" : "sec-switch"}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <i />
    </button>
  );
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
