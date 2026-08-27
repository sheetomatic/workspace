"use client";

import { useState } from "react";
import {
  APP_ROLES,
  roleLabel,
  type AppConfig,
  type AppUser,
  type UserRole,
} from "@/lib/app-builder";

type Props = {
  config: AppConfig;
  onChange: (next: AppConfig) => void;
};

export function PeoplePanel({ config, onChange }: Props) {
  const users = config.users || [];
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const ownerCols = config.views
    .filter((view) => view.ownerCol)
    .map((view) => `${view.name} · ${view.ownerCol}`);

  function patchUser(id: string, patch: Partial<AppUser>) {
    onChange({
      ...config,
      users: users.map((user) => (user.id === id ? { ...user, ...patch } : user)),
    });
  }

  return (
    <div className="plain people-panel">
      <h2>Users</h2>
      <p className="hint">
        Assign Owner, Admin, Manager, or User. What that role can do is on
        Security.
      </p>

      <ul className="people-list">
        {users.map((user) => (
          <li key={user.id} className="ab-card">
            <header>
              <strong>{user.name}</strong>
              <em>{roleLabel(user.role)}</em>
              {user.disabled ? <em>Off</em> : null}
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
                Email
                <input
                  value={user.email || ""}
                  placeholder="Needed for USEREMAIL() and allow-list"
                  onChange={(e) => patchUser(user.id, { email: e.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  value={user.role === "staff" ? "user" : user.role}
                  onChange={(e) =>
                    patchUser(user.id, { role: e.target.value as UserRole })
                  }
                >
                  {APP_ROLES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label} — {item.hint}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </li>
        ))}
      </ul>

      <div className="add-inline">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
        <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          {APP_ROLES.filter((item) => item.id !== "owner").map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
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
                  role,
                },
              ],
            });
            setName("");
            setPin("");
            setEmail("");
            setRole("user");
          }}
        >
          Add person
        </button>
      </div>

      <p className="hint">
        {ownerCols.length
          ? `Row owner is on: ${ownerCols.join(" · ")}. Security filter is on Security.`
          : "On Data, pick a Row owner column. Users then only see their own rows."}
      </p>
    </div>
  );
}
