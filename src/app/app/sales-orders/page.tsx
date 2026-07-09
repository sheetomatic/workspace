import { Suspense } from "react";
import Link from "next/link";
import { SalesOrdersList } from "@/components/saas/sales-orders-list";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import type { SalesOrderStatus } from "@/lib/leads/sales-order-types";
import { salesOrderStatusLabel } from "@/lib/leads/sales-order-types";
import { listSalesOrders } from "@/lib/leads/sales-orders";
import { getSalesOrderStats } from "@/lib/sales-orders/queries";
import {
  FMS_FULFILLMENT_DISPATCH_PATH,
  FMS_FULFILLMENT_PO_PATH,
} from "@/lib/fms/sales-fulfillment";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
    leadId?: string;
  }>;
};

function parseStatus(value: string | undefined): SalesOrderStatus | "ALL" {
  if (!value || value === "ALL") {
    return "ALL";
  }
  return value as SalesOrderStatus;
}

export default async function SalesOrdersPage({ searchParams }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const params = await searchParams;
  const status = parseStatus(params.status);
  const q = params.q?.trim() ?? "";

  const [{ orders, total }, stats] = await Promise.all([
    listSalesOrders(user.organizationId, {
      status,
      q: q || undefined,
    }),
    getSalesOrderStats(user.organizationId),
  ]);

  const pageTitle =
    status === "ALL" ? "Sales orders" : salesOrderStatusLabel(status);
  const pageDescription =
    status === "ALL"
      ? "ERP order queue — work here. Each process also runs as FMS for status, owner, and delay."
      : status === "PO_PENDING" || status === "PO_IN_PROGRESS"
        ? "Purchase work queue. Start PO FMS on each order to track vendor → receive goods delays."
        : status === "DISPATCH_PENDING" || status === "DISPATCHED"
          ? "Dispatch work queue. Dispatch FMS tracks pack → delivery bottlenecks."
          : `Orders in ${salesOrderStatusLabel(status).toLowerCase()} stage.`;

  const fmsBoardHref =
    status === "PO_PENDING" || status === "PO_IN_PROGRESS"
      ? FMS_FULFILLMENT_PO_PATH
      : status === "DISPATCH_PENDING" || status === "DISPATCHED"
        ? FMS_FULFILLMENT_DISPATCH_PATH
        : "/app/fms/fulfillment";

  return (
    <div className="saas-page ws-fms-page ws-fms-sf sales-orders-page">
      <TaskPageToolbar
        title={pageTitle}
        description={pageDescription}
        actions={
          <>
            <Link href={fmsBoardHref} className="btn-secondary btn-sm">
              FMS process board
            </Link>
            <Link href="/app/fms/lines" className="btn-secondary btn-sm">
              Live pipelines
            </Link>
            <Link href="/app/leads" className="btn-primary btn-sm ws-sf-btn-primary">
              Leads
            </Link>
          </>
        }
      />

      <section className="sales-orders-stats" aria-label="Sales order summary">
        <article className="sales-orders-stat-card">
          <span>Total orders</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="sales-orders-stat-card accent-blue">
          <span>In progress</span>
          <strong>{stats.inProgress}</strong>
        </article>
        <article className="sales-orders-stat-card accent-warning">
          <span>PO pending</span>
          <strong>{stats.poPending}</strong>
        </article>
        <article className="sales-orders-stat-card accent-success">
          <span>Delivered</span>
          <strong>{stats.delivered}</strong>
        </article>
      </section>

      <Suspense fallback={<p className="leads-machine-muted">Loading orders…</p>}>
        <SalesOrdersList orders={orders} total={total} status={status} q={q} />
      </Suspense>
    </div>
  );
}
