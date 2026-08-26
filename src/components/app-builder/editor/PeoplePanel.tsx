"use client";

import { useState } from "react";
import type { AppConfig, AppUser, UserRole } from "@/lib/app-builder";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function PeoplePanel({ config, onChange }: Props) {
  const users = config.users || [];
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const ownerCols = config.views
    .filter((view) => view.ownerCol)
    .map((view) => `${view.name} · ${view.ownerCol}`);

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
    <div className="plain people-panel">
      <h2>Who can open this app</h2>
      <p className="hint">
        Google Sheets cannot hide rows. Staff get a PIN — no Gmail seat. They
        only see rows that match their name or email in the row-owner column.
      </p>

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
        Ask for PIN when the phone opens
      </label>

      <ul className="people-list">
        {users.map((user) => (
          <li key={user.id} className="ab-card">
            <header>
              <strong>{user.name}</strong>
              {user.role === "owner" ? <em>Owner</em> : <em>Staff</em>}
              {user.id !== "owner" ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...config,
                      users: users.filter((item) => item.id !== user.id),
                    })
                  }
                >
                  Remove
                </button>
              ) : null}
            </header>
            <div className="ab-card-grid">
              <label>
                Name
                <input
                  value={user.name}
                  onChange={(e) => patchUser(user.id, { name: e.target.value })}
                />
              </label>
              <label>
                PIN
                <input
                  value={user.pin}
                  onChange={(e) => patchUser(user.id, { pin: e.target.value })}
                />
              </label>
              <label>
                Email (optional)
                <input
                  value={user.email || ""}
                  placeholder="Matches the row-owner column"
                  onChange={(e) => patchUser(user.id, { email: e.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  value={user.role}
                  onChange={(e) =>
                    patchUser(user.id, { role: e.target.value as UserRole })
                  }
                >
                  <option value="owner">Owner — every row</option>
                  <option value="staff">Staff — own rows only</option>
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>

      <div className="add-inline">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" />
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email (optional)"
        />
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
                  email: email.trim() || undefined,
                  role: "staff",
                },
              ],
            });
            setName("");
            setPin("");
            setEmail("");
          }}
        >
          Add staff
        </button>
      </div>

      <section className="ab-block">
        <p className="aside-label">Screens staff can open</p>
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

      <p className="hint">
        {ownerCols.length
          ? `Row owner is on: ${ownerCols.join(" · ")}. Set it on Data for any other table.`
          : "On Data, pick a Row owner column (name or email). Until then, staff see every row."}
      </p>
    </div>
  );
}
