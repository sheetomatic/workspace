"use client";

import { useActionState } from "react";
import { createRackSectionAction, type ImsActionState } from "@/app/app/ims/actions";

type RackRow = {
  id: string;
  code: string;
  name: string;
  siteName: string | null;
  _count: { items: number };
};

const initial: ImsActionState = { ok: false, message: "" };

export function ImsRacksManager({ racks }: { racks: RackRow[] }) {
  const [state, action] = useActionState(createRackSectionAction, initial);

  return (
    <div className="ws-ims-split">
      <section className="ws-ims-panel">
        <h2>Add rack / section</h2>
        <form action={action} className="ws-ims-form">
          <label>
            Code
            <input name="code" required placeholder="e.g. A-01" />
          </label>
          <label>
            Name
            <input name="name" required placeholder="e.g. Raw material bay A" />
          </label>
          <label>
            Site (optional)
            <input name="siteName" placeholder="e.g. Main store" />
          </label>
          <button type="submit" className="ws-btn ws-btn-primary">
            Create section
          </button>
          {state.message ? (
            <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
          ) : null}
        </form>
      </section>

      <section className="ws-ims-panel">
        <h2>Store sections</h2>
        {racks.length === 0 ? (
          <p className="ws-ims-help">No rack sections yet.</p>
        ) : (
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Site</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody>
                {racks.map((rack) => (
                  <tr key={rack.id}>
                    <td>{rack.code}</td>
                    <td>{rack.name}</td>
                    <td>{rack.siteName ?? "—"}</td>
                    <td>{rack._count.items}</td>
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
