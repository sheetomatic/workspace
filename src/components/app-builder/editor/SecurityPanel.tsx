"use client";

import {
  APP_ROLES,
  isAppAdmin,
  roleLabel,
  type AppConfig,
  type AppUser,
  type AppView,
  type UserRole,
} from "@/lib/app-builder";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function SecurityPanel({ config, onChange }: Props) {
  const users = config.users || [];
  const tables = uniqueTables(config.views);
  const emails = (config.meta.allowedEmails || []).join("\n");

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
      <h2>App security</h2>
      <p className="hint">
        Google Sheets cannot lock a row. This app can. People open a link + PIN.
        Their role decides what they see and change.
      </p>

      <section className="ab-block">
        <p className="aside-label">Roles</p>
        <ul className="role-defs">
          {APP_ROLES.map((item) => (
            <li key={item.id}>
              <strong>{item.label}</strong>
              <em>USERROLE()=&quot;{item.userRole}&quot;</em>
              <span>{item.hint}</span>
            </li>
          ))}
        </ul>
      </section>

      <label className="check">
        <input
          type="checkbox"
          checked={config.meta.requirePin !== false}
          onChange={(e) => patchMeta({ requirePin: e.target.checked })}
        />
        Require sign-in (PIN)
      </label>

      <label className="field-label">
        Allowed emails
        <textarea
          value={emails}
          placeholder="One email per line. Empty = any listed person with a PIN."
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
        <em>User and Manager email must match this domain. Owner and Admin always get in.</em>
      </label>

      <p className="aside-label">Bots run as</p>
      <div className="ab-perm">
        <button
          type="button"
          className={config.meta.runAs !== "owner" ? "on" : ""}
          onClick={() => patchMeta({ runAs: "user" })}
        >
          Signed-in user
        </button>
        <button
          type="button"
          className={config.meta.runAs === "owner" ? "on" : ""}
          onClick={() => patchMeta({ runAs: "owner" })}
        >
          App owner
        </button>
      </div>

      <section className="ab-block">
        <p className="aside-label">Table security</p>
        {tables.length ? (
          <ul className="people-list">
            {tables.map((view) => (
              <li key={view.tab} className="ab-card">
                <header>
                  <strong>{view.name}</strong>
                  <em>{view.tab}</em>
                </header>
                <label className="field-label">
                  Security filter
                  <input
                    value={view.securityFilter || ""}
                    placeholder='IN(USERROLE(),"Admin","Manager")'
                    onChange={(e) =>
                      patchTable(view.tab, { securityFilter: e.target.value || undefined })
                    }
                  />
                  <em>
                    AppSheet formula. Owner column
                    {view.ownerCol ? ` is ${view.ownerCol}` : " is not set"}. Example:
                    OR(IN(USERROLE(),&quot;Admin&quot;,&quot;Manager&quot;),[Email]=USEREMAIL())
                  </em>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hint">Add a screen on App first.</p>
        )}
      </section>

      <section className="ab-block">
        <p className="aside-label">Screens Users and Managers can open</p>
        {config.views.length ? (
          <ul className="people-screens">
            {config.views.map((view) => {
              const hidden = config.visibility?.some(
                (rule) =>
                  rule.target === "view" &&
                  rule.targetId === view.id &&
                  rule.when === "owner",
              );
              return (
                <li key={view.id}>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!hidden}
                      onChange={(e) => setStaffScreen(view.id, e.target.checked)}
                    />
                    {view.name}
                    {view.ownerCol ? <em> · rows by {view.ownerCol}</em> : null}
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="hint">Add a screen on App first.</p>
        )}
      </section>

      <section className="ab-block">
        <p className="aside-label">This person</p>
        <ul className="people-list">
          {users.map((user) => (
            <li key={user.id} className="ab-card">
              <header>
                <strong>{user.name}</strong>
                <em>{roleLabel(user.role)}</em>
              </header>
              <label className="field-label">
                Role
                <select
                  value={user.role === "staff" ? "user" : user.role}
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
              </label>
              {isAppAdmin(user.role) ? (
                <p className="hint">Owner and Admin see every screen and every row.</p>
              ) : (
                <>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={!!user.disabled}
                      onChange={(e) => patchUser(user.id, { disabled: e.target.checked })}
                    />
                    Turned off
                  </label>
                  <p className="aside-label">This person may</p>
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
                      className={
                        user.role === "manager"
                          ? user.allowDeletes === true
                            ? "on"
                            : ""
                          : user.allowDeletes !== false
                            ? "on"
                            : ""
                      }
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
                    <>
                      <p className="aside-label">Tables they can open</p>
                      <ul className="people-screens">
                        {tables.map((view) => {
                          const listed = user.tables == null || user.tables.includes(view.tab);
                          return (
                            <li key={view.tab}>
                              <label className="check">
                                <input
                                  type="checkbox"
                                  checked={listed}
                                  onChange={(e) =>
                                    patchUser(user.id, {
                                      tables: nextTables(
                                        user.tables,
                                        tables.map((t) => t.tab),
                                        view.tab,
                                        e.target.checked,
                                      ),
                                    })
                                  }
                                />
                                {view.name}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
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
