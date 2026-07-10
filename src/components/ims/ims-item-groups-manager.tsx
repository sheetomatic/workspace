"use client";

import { useActionState } from "react";
import {
  createImsItemGroupAction,
  type ImsActionState,
} from "@/app/app/ims/actions";

type GroupRow = {
  id: string;
  name: string;
  _count: { items: number };
};

const initial: ImsActionState = { ok: false, message: "" };

export function ImsItemGroupsManager({ groups }: { groups: GroupRow[] }) {
  const [state, action] = useActionState(createImsItemGroupAction, initial);

  return (
    <div className="ws-ims-split">
      <section className="ws-ims-panel">
        <h2>Add item group</h2>
        <form action={action} className="ws-ims-form">
          <label>
            Group name
            <input name="name" required placeholder="e.g. Consumables" />
          </label>
          <label>
            Parent group (optional)
            <select name="parentId" defaultValue="">
              <option value="">None — top level</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="ws-btn ws-btn-primary">
            Create group
          </button>
          {state.message ? (
            <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
          ) : null}
        </form>
      </section>

      <section className="ws-ims-panel">
        <h2>Item groups</h2>
        {groups.length === 0 ? (
          <p className="ws-ims-help">No groups yet. Create one to classify items.</p>
        ) : (
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td>{group.name}</td>
                    <td>{group._count.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
