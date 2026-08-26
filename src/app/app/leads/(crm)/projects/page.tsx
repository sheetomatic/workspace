import Link from "next/link";
import { CrmClientGroups, type CrmClientGroup } from "@/components/saas/crm-client-groups";
import { CrmSubmoduleShell } from "@/components/saas/crm-submodule-shell";
import "@/components/saas/leads-machine.css";
import { formatInr } from "@/lib/leads/categories";
import { listCrmAlertCenterItems } from "@/lib/leads/alerts/evaluate";
import { formatCrmNavValue } from "@/lib/leads/crm-nav-format";
import { getLeadPaymentTotalsByLeadIds } from "@/lib/leads/payment-totals";
import { listSalesOrders } from "@/lib/leads/sales-orders";
import {
  partitionSalesOrdersByLifecycle,
  salesOrderStatusLabel,
  type SalesOrderListItem,
} from "@/lib/leads/sales-order-types";
import { istYmd } from "@/lib/leads/crm-meetings";
import {
  countCrmPeriods,
  crmPeriodKpis,
  crmPeriodLabel,
  parseCrmPeriod,
  ymdInCrmPeriod,
} from "@/lib/leads/crm-period";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import { requireCrmSubModule } from "@/lib/crm/crm-access";
import { prisma } from "@/lib/db";

function groupProjectsByLead(
  rows: SalesOrderListItem[],
  paymentByLead: Map<string, number>,
  sectionKey: string,
  overdueDaysByLead: Map<string, number>,
): CrmClientGroup[] {
  const byLead = new Map<
    string,
    {
      lead: SalesOrderListItem["lead"];
      orders: SalesOrderListItem[];
      value: number;
      received: number;
      due: number;
    }
  >();

  for (const order of rows) {
    const value = Number(order.orderValue || 0);
    const received = paymentByLead.get(order.lead.id) ?? 0;
    const due = Math.max(0, Math.round((value - received) * 100) / 100);
    const existing = byLead.get(order.lead.id);
    if (existing) {
      existing.orders.push(order);
      existing.value += value;
      existing.due = Math.max(0, Math.round((existing.value - existing.received) * 100) / 100);
    } else {
      byLead.set(order.lead.id, {
        lead: order.lead,
        orders: [order],
        value,
        received,
        due,
      });
    }
  }

  return [...byLead.values()].map((entry) => {
    const name = entry.lead.name || entry.lead.company || "Client";
    const overdueDays = overdueDaysByLead.get(entry.lead.id);
    const dueLabel =
      entry.due > 0
        ? overdueDays
          ? ` · OVERDUE ${formatInr(entry.due)} (${overdueDays}d)`
          : ` · due ${formatInr(entry.due)}`
        : "";
    return {
      id: `${sectionKey}-${entry.lead.id}`,
      name,
      phone: entry.lead.phone || "",
      inboundLeadId: entry.lead.id,
      summary: `${entry.orders.length} order${
        entry.orders.length === 1 ? "" : "s"
      } · ${formatInr(entry.value)}${dueLabel}`,
      meta:
        entry.received > 0 ? `received ${formatInr(entry.received)}` : undefined,
      waEvent: entry.due > 0 ? "alert_payment_pending" : "stage_follow_up",
      rows: entry.orders.map((order) => {
        const value = Number(order.orderValue || 0);
        const received = paymentByLead.get(order.lead.id) ?? 0;
        const due = Math.max(0, Math.round((value - received) * 100) / 100);
        return {
          id: order.id,
          cells: [
            { primary: order.orderNumber },
            salesOrderStatusLabel(order.status),
            formatInr(value),
            {
              primary: received > 0 ? formatInr(received) : "—",
              className: received > 0 ? "crm-projects-received" : undefined,
            },
            {
              primary: formatInr(due),
              className: due > 0 ? "crm-projects-due" : undefined,
            },
            new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          ],
        };
      }),
    };
  });
}

/** Leads at a pre-project stage, shown as Upcoming / Pipeline groups. */
function groupLeadsWithQuote(
  leads: Array<{
    id: string;
    name: string | null;
    company: string | null;
    phone: string | null;
    status: string;
    quotations: Array<{
      quotationNumber: string;
      status: string;
      totalAmount: unknown;
      sentAt: Date | null;
      quotationDate: Date;
    }>;
  }>,
  sectionKey: string,
  waEvent: CrmClientGroup["waEvent"],
): CrmClientGroup[] {
  return leads.map((lead) => {
    const quote = lead.quotations[0] ?? null;
    const value = Number(quote?.totalAmount ?? 0);
    return {
      id: `${sectionKey}-${lead.id}`,
      name: lead.name || lead.company || "Client",
      phone: lead.phone || "",
      inboundLeadId: lead.id,
      summary: quote
        ? `${quote.quotationNumber} · ${formatInr(value)}`
        : "No quotation yet",
      waEvent,
      rows: quote
        ? [
            {
              id: `${sectionKey}-${lead.id}-quote`,
              cells: [
                { primary: quote.quotationNumber },
                quote.status === "LOCKED" ? "Accepted" : quote.status,
                formatInr(value),
                (quote.sentAt ?? quote.quotationDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }),
              ],
            },
          ]
        : [],
    };
  });
}

export default async function CrmProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await requireSession(undefined, { module: "CRM" });
  await requireCrmSubModule(user, "projects");
  const canManage = hasMinimumRole(user.role, "MANAGER");
  const period = parseCrmPeriod((await searchParams).period);
  const { orders: allOrders } = await listSalesOrders(user.organizationId, {
    limit: 400,
  });
  const orders = allOrders.filter((order) =>
    ymdInCrmPeriod(istYmd(new Date(order.createdAt)), period),
  );

  const preProjectLeadSelect = {
    id: true,
    name: true,
    company: true,
    phone: true,
    status: true,
    quotations: {
      where: { requestType: "PROPOSAL" as const },
      orderBy: [{ sentAt: "desc" as const }, { quotationDate: "desc" as const }],
      take: 1,
      select: {
        quotationNumber: true,
        status: true,
        totalAmount: true,
        sentAt: true,
        quotationDate: true,
      },
    },
  };

  const [paymentByLead, alertItems, upcomingLeads, pipelineLeadsRaw] =
    await Promise.all([
      getLeadPaymentTotalsByLeadIds(
        user.organizationId,
        orders.map((order) => order.lead.id),
      ),
      listCrmAlertCenterItems(user.organizationId, { limit: 120 }),
      // Upcoming: quotation accepted / deal won, advance payment still pending.
      prisma.inboundLead.findMany({
        where: {
          organizationId: user.organizationId,
          archivedAt: null,
          salesOrders: { none: {} },
          OR: [
            { status: { in: ["WON", "PAYMENT"] } },
            { quotations: { some: { lockedAt: { not: null } } } },
          ],
        },
        select: preProjectLeadSelect,
        orderBy: { modifiedAt: "desc" },
        take: 100,
      }),
      // Pipeline: quotation sent, client has not confirmed yet.
      prisma.inboundLead.findMany({
        where: {
          organizationId: user.organizationId,
          archivedAt: null,
          status: { notIn: ["LOST", "WON", "PAYMENT", "PROJECT_ACTIVE"] },
          salesOrders: { none: {} },
          payments: { none: {} },
          quotations: {
            some: {
              requestType: "PROPOSAL",
              status: { in: ["SENT", "REVISED"] },
              lockedAt: null,
            },
          },
        },
        select: preProjectLeadSelect,
        orderBy: { modifiedAt: "desc" },
        take: 100,
      }),
    ]);

  const quoteYmd = (lead: (typeof upcomingLeads)[number]) => {
    const quote = lead.quotations[0];
    if (!quote) {
      return null;
    }
    return istYmd(new Date(quote.sentAt ?? quote.quotationDate));
  };
  const inPeriodLead = (lead: (typeof upcomingLeads)[number]) => {
    const ymd = quoteYmd(lead);
    return ymd ? ymdInCrmPeriod(ymd, period) : period === "all";
  };

  const upcomingIds = new Set(upcomingLeads.map((lead) => lead.id));
  const upcomingVisible = upcomingLeads.filter(inPeriodLead);
  const pipelineLeads = pipelineLeadsRaw
    .filter((lead) => !upcomingIds.has(lead.id))
    .filter(inPeriodLead);
  const periodCounts = countCrmPeriods([
    ...allOrders.map((order) => istYmd(new Date(order.createdAt))),
    ...upcomingLeads.map(quoteYmd).filter((ymd): ymd is string => Boolean(ymd)),
    ...pipelineLeadsRaw
      .filter((lead) => !upcomingIds.has(lead.id))
      .map(quoteYmd)
      .filter((ymd): ymd is string => Boolean(ymd)),
  ]);
  // Leads whose payment reminder has aged past the configured wait.
  const overdueDaysByLead = new Map<string, number>(
    alertItems
      .filter((item) => item.kind === "payment_not_received")
      .map((item) => [item.leadId, item.daysOverdue]),
  );
  const { running, delivered } = partitionSalesOrdersByLifecycle(orders);
  const pipelineValue = running.reduce(
    (sum, order) => sum + Number(order.orderValue || 0),
    0,
  );
  const receivedOnProjects = orders.reduce((sum, order) => {
    return sum + (paymentByLead.get(order.lead.id) ?? 0);
  }, 0);
  const overdueValue = [...new Set(orders.map((order) => order.lead.id))]
    .filter((leadId) => overdueDaysByLead.has(leadId))
    .reduce((sum, leadId) => {
      const leadValue = orders
        .filter((order) => order.lead.id === leadId)
        .reduce((total, order) => total + Number(order.orderValue || 0), 0);
      return sum + Math.max(0, leadValue - (paymentByLead.get(leadId) ?? 0));
    }, 0);

  const runningGroups = groupProjectsByLead(
    running,
    paymentByLead,
    "running",
    overdueDaysByLead,
  );
  const deliveredGroups = groupProjectsByLead(
    delivered,
    paymentByLead,
    "delivered",
    overdueDaysByLead,
  );
  const upcomingGroups = groupLeadsWithQuote(
    upcomingVisible,
    "upcoming",
    "alert_payment_pending",
  );
  const pipelineGroups = groupLeadsWithQuote(
    pipelineLeads,
    "pipeline",
    "alert_quotation_pending",
  );

  return (
    <CrmSubmoduleShell
      title="Projects"
      description={`Running work, upcoming advances, pipeline quotes, and completed handovers for ${crmPeriodLabel(period)}. Click a number to change the range.`}
      kpis={[
        ...crmPeriodKpis("/app/leads/projects", periodCounts, period),
        { label: "Running", value: String(running.length), accent: "blue" },
        {
          label: "Upcoming",
          value: String(upcomingVisible.length),
          accent: "warning",
        },
        { label: "Pipeline", value: String(pipelineLeads.length) },
        { label: "Completed", value: String(delivered.length), accent: "success" },
        {
          label: "Received",
          value: formatCrmNavValue(receivedOnProjects),
          accent: "success",
        },
        {
          label: "Overdue",
          value: formatCrmNavValue(overdueValue),
          accent: "danger",
        },
      ]}
    >
      <div className="crm-projects-sections">
        <section>
          <h3>Running ({running.length})</h3>
          <CrmClientGroups
            groups={runningGroups}
            columns={[
              "Order",
              "Status",
              "Value",
              "Received",
              "Due",
              "Created",
            ]}
            openTab="projects"
            waEvent="stage_follow_up"
            canManage={canManage}
            emptyMessage="No running projects."
            filterPlaceholder="Filter running clients…"
            noun="client"
          />
        </section>
        <section>
          <h3>Upcoming ({upcomingVisible.length})</h3>
          <p className="leads-machine-muted">
            Quotation accepted — advance payment pending. Record the advance to
            start the project.
          </p>
          <CrmClientGroups
            groups={upcomingGroups}
            columns={["Quote", "Status", "Value", "Sent"]}
            openTab="payments"
            waEvent="alert_payment_pending"
            canManage={canManage}
            emptyMessage="Nothing waiting on advance payment."
            filterPlaceholder="Filter upcoming clients…"
            noun="client"
          />
        </section>
        <section>
          <h3>Pipeline ({pipelineLeads.length})</h3>
          <p className="leads-machine-muted">
            Quotation sent — client has not confirmed yet.
          </p>
          <CrmClientGroups
            groups={pipelineGroups}
            columns={["Quote", "Status", "Value", "Sent"]}
            openTab="quote"
            waEvent="alert_quotation_pending"
            canManage={canManage}
            emptyMessage="No quotations awaiting confirmation."
            filterPlaceholder="Filter pipeline clients…"
            noun="client"
          />
        </section>
        <section>
          <h3 className="leads-projects-h-done">Completed ({delivered.length})</h3>
          <CrmClientGroups
            groups={deliveredGroups}
            columns={[
              "Order",
              "Status",
              "Value",
              "Received",
              "Due",
              "Created",
            ]}
            openTab="projects"
            waEvent="stage_follow_up"
            canManage={canManage}
            emptyMessage="No completed projects yet."
            filterPlaceholder="Filter completed clients…"
            noun="client"
          />
        </section>
      </div>
      <p className="leads-machine-muted crm-submodule-footnote">
        Payments come from CRM Payment records on the lead. Full ops queue also
        lives in <Link href="/app/sales-orders">Sales orders</Link>.
      </p>
    </CrmSubmoduleShell>
  );
}
