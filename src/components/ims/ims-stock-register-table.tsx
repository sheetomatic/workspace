import Link from "next/link";
import { formatImsCurrency, formatImsQty } from "@/lib/ims/stock-status";

export type StockRegisterRow = {
  id: string;
  code: string;
  name: string;
  uom: string;
  groupName: string | null;
  usableQty: number;
  qcPendingQty: number;
  totalQty: number;
  unitCost: number;
  value: number;
};

export function ImsStockRegisterTable({ rows }: { rows: StockRegisterRow[] }) {
  if (rows.length === 0) {
    return <p className="ws-ims-help">No items in register yet — add items to get started.</p>;
  }

  return (
    <div className="ws-ims-table-wrap">
      <table className="ws-ims-table ws-ims-table-responsive">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Group</th>
            <th>Usable</th>
            <th>QC pending</th>
            <th>Total</th>
            <th>Unit cost</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td data-label="Code">
                <Link href={`/app/ims/items/${row.id}`}>{row.code}</Link>
              </td>
              <td data-label="Name">{row.name}</td>
              <td data-label="Group">{row.groupName ?? "—"}</td>
              <td data-label="Usable">{formatImsQty(row.usableQty, row.uom)}</td>
              <td data-label="QC pending">{formatImsQty(row.qcPendingQty, row.uom)}</td>
              <td data-label="Total">{formatImsQty(row.totalQty, row.uom)}</td>
              <td data-label="Unit cost">{formatImsCurrency(row.unitCost)}</td>
              <td data-label="Value">{formatImsCurrency(row.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
