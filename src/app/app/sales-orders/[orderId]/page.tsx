import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadDeliveryJourney } from "@/components/saas/lead-delivery-journey";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { salesOrderStatusLabel } from "@/lib/leads/sales-order-types";
import { buildDispatchPublicUrl, getSalesOrderById } from "@/lib/leads/sales-orders";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import {
  startSalesOrderPo,
  startSalesOrderStockCheck,
} from "@/app/app/sales-orders/actions";
import { SalesOrderDetailActions } from "@/components/saas/sales-order-detail-actions";
import { SalesOrderProcessFmsPanel } from "@/components/saas/sales-order-process-fms";

type PageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function SalesOrderDetailPage({ params }: PageProps) {
  const user = await requireSession(undefined, { module: "FMS" });
  const { orderId } = await params;
  const canManage = hasMinimumRole(user.role, "MANAGER");

  const order = await getSalesOrderById(user.organizationId, orderId);
  if (!order) {
    notFound();
  }

  const leadDelivery = {
    quotations: order.quotationId
      ? [
          {
            id: order.quotationId,
            quotationNumber: order.quotationNumber ?? order.orderNumber,
            status: "LOCKED",
            lockedAt: order.createdAt,
            sentAt: order.createdAt,
          },
        ]
      : [],
    payments:
      Number(order.advanceAmount) > 0
        ? [{ paymentType: "ADVANCE", receivedAmount: order.advanceAmount }]
        : [],
    salesOrder: order,
  };

  const dispatchUrl = order.dispatchShareToken
    ? buildDispatchPublicUrl(order.dispatchShareToken)
    : null;

  return (
    <div className="saas-page ws-fms-page ws-fms-sf sales-order-detail-page">
      <TaskPageToolbar
        title={order.orderNumber}
        description={salesOrderStatusLabel(order.status)}
        actions={
          <Link href="/app/sales-orders" className="btn-secondary btn-sm">
            All orders
          </Link>
        }
      />

      <LeadDeliveryJourney lead={leadDelivery} variant="full" />

      <div className="sales-order-detail-grid">
        <section className="sales-order-detail-card">
          <h2>Order summary</h2>
          <dl className="sales-order-metrics">
            <div>
              <dt>Status</dt>
              <dd>
                <span
                  className={`sales-order-status-badge status-${order.status.toLowerCase()}`}
                >
                  {salesOrderStatusLabel(order.status)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Order value</dt>
              <dd>{formatInr(Number(order.orderValue))}</dd>
            </div>
            <div>
              <dt>Advance</dt>
              <dd>{formatInr(Number(order.advanceAmount))}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd>{formatInr(Number(order.balanceAmount))}</dd>
            </div>
            <div>
              <dt>Lead</dt>
              <dd>
                <Link href={`/app/leads?leadId=${order.lead.id}`}>
                  {order.lead.name || order.lead.company || order.lead.phone || "View lead"}
                </Link>
              </dd>
            </div>
            {order.quotationId ? (
              <div>
                <dt>Quotation</dt>
                <dd>
                  <Link href={`/app/leads/quotations/${order.quotationId}/print`}>
                    {order.quotationNumber ?? "View quotation"}
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          {canManage ? (
            <SalesOrderDetailActions
              orderId={order.id}
              status={order.status}
              hasStockCheck={Boolean(order.stockCheckFmsInstanceId)}
              hasPo={Boolean(order.poFmsInstanceId)}
              poFmsInstanceId={order.poFmsInstanceId}
              dispatchFmsInstanceId={order.dispatchFmsInstanceId}
              dispatchUrl={dispatchUrl}
              startStockCheck={startSalesOrderStockCheck}
              startPo={startSalesOrderPo}
            />
          ) : null}
        </section>

        <section className="sales-order-detail-card">
          <h2>Timeline</h2>
          <ol className="sales-order-timeline">
            <li>
              <strong>Created</strong>
              <span>{new Date(order.createdAt).toLocaleString("en-IN")}</span>
            </li>
            <li>
              <strong>Last updated</strong>
              <span>{new Date(order.updatedAt).toLocaleString("en-IN")}</span>
            </li>
          </ol>
        </section>

        <SalesOrderProcessFmsPanel processes={order.fmsInstances} />
      </div>
    </div>
  );
}
