import Link from "next/link";
import { Clock, GitBranch, User } from "lucide-react";
import type { SalesOrderFmsLink } from "@/lib/leads/sales-order-types";
import { FMS_FULFILLMENT_BASE_PATH } from "@/lib/fms/sales-fulfillment";

const ROLE_LABELS: Record<SalesOrderFmsLink["role"], string> = {
  OTHER: "Sales order",
  STOCK_CHECK: "Stock check",
  PO: "Purchase order",
  DISPATCH: "Dispatch",
};

export function SalesOrderProcessFmsPanel({
  processes,
}: {
  processes: SalesOrderFmsLink[];
}) {
  if (processes.length === 0) {
    return (
      <section className="sales-order-detail-card sales-order-fms-panel">
        <header className="sales-order-fms-panel-head">
          <h2>Process tracking (FMS)</h2>
          <p>
            Each business process on this order runs as an FMS — status, owner, and
            time delay (bottleneck) like SAP / Zoho workflows.
          </p>
        </header>
        <p className="ws-fms-muted">
          No FMS processes started yet. They spawn automatically as the order moves
          through sales order entry, IMS stock check, purchase, and dispatch.
        </p>
      </section>
    );
  }

  return (
    <section className="sales-order-detail-card sales-order-fms-panel">
      <header className="sales-order-fms-panel-head">
        <div>
          <h2>Process tracking (FMS)</h2>
          <p>
            ERP work happens in Leads / Sales orders / IMS. FMS tracks who owns each
            stop and where time was lost.
          </p>
        </div>
        <Link href={FMS_FULFILLMENT_BASE_PATH} className="btn-secondary btn-sm">
          <GitBranch size={14} aria-hidden />
          FMS board
        </Link>
      </header>

      <ul className="sales-order-fms-process-list">
        {processes.map((process) => (
          <li key={process.id} className="sales-order-fms-process-row">
            <div className="sales-order-fms-process-main">
              <strong>{ROLE_LABELS[process.role]}</strong>
              <span className="sales-order-fms-template">{process.templateName}</span>
              <span
                className={`sales-order-fms-status status-${process.status.toLowerCase()}`}
              >
                {process.status}
              </span>
            </div>

            {process.currentStepName ? (
              <div className="sales-order-fms-process-meta">
                <span>
                  <GitBranch size={12} aria-hidden />
                  {process.currentStepName}
                </span>
                {process.ownerName ? (
                  <span>
                    <User size={12} aria-hidden />
                    {process.ownerName}
                  </span>
                ) : null}
                {process.delayLabel ? (
                  <span className="sales-order-fms-delay">
                    <Clock size={12} aria-hidden />
                    {process.delayLabel}
                  </span>
                ) : (
                  <span className="sales-order-fms-on-time">On time</span>
                )}
              </div>
            ) : (
              <p className="sales-order-fms-waiting">Waiting to start</p>
            )}

            <div className="sales-order-fms-process-actions">
              <Link href={process.fmsHref} className="btn-secondary btn-sm">
                Open FMS
              </Link>
              <Link href={process.boardHref} className="btn-secondary btn-sm">
                Process board
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
