import Link from "next/link";
import { formatImsQty } from "@/lib/ims/stock-status";
import type { ConsumptionRow } from "@/lib/ims/consumption";

export function ImsConsumptionTable({ rows }: { rows: ConsumptionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="ws-ims-help">
        No issue movements in this period. Record MIN / issue to production first.
      </p>
    );
  }

  return (
    <div className="ws-ims-table-wrap">
      <table className="ws-ims-table ws-ims-table-responsive">
        <thead>
          <tr>
            <th>Code</th>
            <th>Item</th>
            <th>Total issued</th>
            <th>Movements</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.itemId}>
              <td data-label="Code">
                <Link href={`/app/ims/items/${row.itemId}`}>{row.code}</Link>
              </td>
              <td data-label="Item">{row.name}</td>
              <td data-label="Total issued">{formatImsQty(row.totalIssued, row.uom)}</td>
              <td data-label="Movements">{row.movementCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
