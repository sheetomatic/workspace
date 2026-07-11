import Link from "next/link";
import {
  CheckSquare,
  ClipboardList,
  GitBranch,
  IndianRupee,
  Megaphone,
  Package,
  Presentation,
  ShoppingCart,
  Users,
} from "lucide-react";
import type {
  DashboardPaymentRow,
  DashboardTaskStats,
} from "@/lib/dashboard-types";
import type { WidgetDashboardData } from "@/lib/dashboard/widgets";
import { formatDeficitPct } from "@/lib/mis/reports-data";
import {
  DEFAULT_WORKSPACE_NAV_PREFS,
  isDashboardWidgetVisible,
  type WorkspaceNavPrefs,
} from "@/lib/workspace-nav-prefs";

type WorkspaceWidgetDashboardProps = {
  organizationName: string;
  userName: string;
  data: WidgetDashboardData;
  taskStats: DashboardTaskStats;
  pendingPayments: DashboardPaymentRow[];
  tasksEnabled: boolean;
  navPrefs?: WorkspaceNavPrefs;
};

function formatInr(value: number) {
  if (value >= 10_000_000) {
    return `\u20B9${(value / 10_000_000).toFixed(1)} Cr`;
  }
  if (value >= 100_000) {
    return `\u20B9${(value / 100_000).toFixed(1)} L`;
  }
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function Widget(props: {
  icon: React.ReactNode;
  title: string;
  href: string;
  linkLabel?: string;
  span2?: boolean;
  children: React.ReactNode;
  footer?: {
    text: string;
    tone: "danger" | "muted";
    /** When set, the alert bar is a real link (e.g. follow-ups → filtered leads). */
    href?: string;
  } | null;
}) {
  const footClass = `ws-widget-foot ${
    props.footer?.tone === "danger" ? "is-danger" : "is-muted"
  }`;

  return (
    <section className={`ws-widget${props.span2 ? " ws-widget--span2" : ""}`}>
      <Link className="ws-widget-hit" href={props.href}>
        <header className="ws-widget-head">
          <span className="ws-widget-icon">{props.icon}</span>
          <h3>{props.title}</h3>
          <span className="ws-widget-link">
            {props.linkLabel ?? "View all \u2192"}
          </span>
        </header>
        <div className="ws-widget-body">{props.children}</div>
      </Link>
      {props.footer ? (
        <Link
          className={`${footClass} is-link`}
          href={props.footer.href ?? props.href}
        >
          {props.footer.text}
        </Link>
      ) : null}
    </section>
  );
}

function Kpi(props: { value: string; label: string; danger?: boolean }) {
  return (
    <div className={`ws-widget-kpi${props.danger ? " is-danger" : ""}`}>
      <strong>{props.value}</strong>
      <span>{props.label}</span>
    </div>
  );
}

const EMPTY_FOOTER = { text: "No open items", tone: "muted" as const };

export function WorkspaceWidgetDashboard({
  organizationName,
  userName,
  data,
  taskStats,
  pendingPayments,
  tasksEnabled,
  navPrefs = DEFAULT_WORKSPACE_NAV_PREFS,
}: WorkspaceWidgetDashboardProps) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const pendingCollectionsTotal = pendingPayments.reduce(
    (sum, row) => sum + row.amountNumeric,
    0,
  );
  const delayedProcesses = data.fms?.delayedSteps ?? 0;
  const openOrders = data.salesOrders?.open ?? null;
  const show = (id: Parameters<typeof isDashboardWidgetVisible>[1]) =>
    isDashboardWidgetVisible(navPrefs, id);

  return (
    <div className="ws-widget-dash">
      <header className="ws-widget-hero">
        <div className="ws-widget-hero-title">
          <p className="ws-widget-hero-kicker">
            <span className="ws-widget-hero-home">Home</span>
            <span className="ws-widget-hero-sep" aria-hidden>
              ·
            </span>
            {organizationName}
          </p>
          <h1>Hello, {userName}</h1>
          <p className="ws-widget-hero-date">
            {today}
            {data.scope === "personal" ? " \u00B7 Your queue" : " \u00B7 Business at a glance"}
          </p>
        </div>
        <div className="ws-widget-hero-stats" aria-label="Key metrics">
          {openOrders !== null && show("salesOrders") ? (
            <div className="ws-widget-hero-stat">
              <strong>{openOrders}</strong>
              <span>Open orders</span>
            </div>
          ) : null}
          {show("fms") ? (
            <div
              className={`ws-widget-hero-stat${delayedProcesses > 0 ? " is-danger" : ""}`}
            >
              <strong>{delayedProcesses}</strong>
              <span>Delayed steps</span>
            </div>
          ) : null}
          {tasksEnabled && show("tasks") ? (
            <div
              className={`ws-widget-hero-stat${taskStats.overdue > 0 ? " is-danger" : ""}`}
            >
              <strong>{taskStats.overdue}</strong>
              <span>Overdue tasks</span>
            </div>
          ) : null}
          {show("collection") ? (
            <div
              className={`ws-widget-hero-stat${pendingPayments.length > 0 ? " is-danger" : ""}`}
            >
              <strong>{formatInr(pendingCollectionsTotal)}</strong>
              <span>To collect</span>
            </div>
          ) : null}
        </div>
      </header>

      <section aria-label="Module overview" className="ws-widget-section">
        <div className="ws-widget-section-head">
          <h2 className="ws-widget-section-title">Modules</h2>
          <p className="ws-widget-section-sub">
            Open a module to review exceptions and follow-ups
          </p>
        </div>
        <div className="ws-widget-grid">
        {data.leads && show("leads") ? (
          <Widget
            footer={
              data.leads.followUpsDue > 0
                ? {
                    text: `${data.leads.followUpsDue} follow-up${data.leads.followUpsDue === 1 ? "" : "s"} due today`,
                    tone: "danger",
                    href: "/app/leads?status=FOLLOW_UP",
                  }
                : data.leads.open === 0
                  ? EMPTY_FOOTER
                  : null
            }
            href="/app/leads"
            icon={<Megaphone size={15} />}
            linkLabel={"Open CRM \u2192"}
            title="CRM"
          >
            <div className="ws-widget-kpis">
              <Kpi label="Open" value={String(data.leads.open)} />
              <Kpi label="New this week" value={String(data.leads.newThisWeek)} />
              <Kpi
                danger={data.leads.followUpsDue > 0}
                label="Follow-ups due"
                value={String(data.leads.followUpsDue)}
              />
            </div>
          </Widget>
        ) : null}

        {data.salesOrders && show("salesOrders") ? (
          <Widget
            footer={
              data.salesOrders.delayedFms > 0
                ? {
                    text: `${data.salesOrders.delayedFms} order${data.salesOrders.delayedFms === 1 ? "" : "s"} with a delayed process step`,
                    tone: "danger",
                  }
                : data.salesOrders.open === 0
                  ? EMPTY_FOOTER
                  : null
            }
            href="/app/sales-orders"
            icon={<ShoppingCart size={15} />}
            title="Sales orders"
          >
            <div className="ws-widget-kpis">
              <Kpi label="Open" value={String(data.salesOrders.open)} />
              <Kpi
                label="In pipeline"
                value={formatInr(data.salesOrders.pipelineValue)}
              />
              <Kpi
                danger={data.salesOrders.delayedFms > 0}
                label="Delayed"
                value={String(data.salesOrders.delayedFms)}
              />
            </div>
          </Widget>
        ) : null}

        {data.fms && show("fms") ? (
          <Widget
            footer={
              data.fms.bottleneck
                ? {
                    text: `Bottleneck: ${data.fms.bottleneck.name} \u00B7 ${data.fms.bottleneck.delayed} delayed`,
                    tone: "danger",
                  }
                : data.fms.activeInstances === 0
                  ? EMPTY_FOOTER
                  : null
            }
            href="/app/fms/fulfillment"
            icon={<GitBranch size={15} />}
            title="Process FMS"
          >
            <div className="ws-widget-kpis">
              <Kpi label="Active" value={String(data.fms.activeInstances)} />
              <Kpi
                danger={data.fms.delayedSteps > 0}
                label="Delayed steps"
                value={String(data.fms.delayedSteps)}
              />
            </div>
          </Widget>
        ) : null}

        {data.ims && show("ims") ? (
          <Widget
            footer={
              data.ims.stockOuts > 0
                ? {
                    text: `${data.ims.stockOuts} item${data.ims.stockOuts === 1 ? "" : "s"} out of stock`,
                    tone: "danger",
                  }
                : data.ims.belowReorder === 0 && data.ims.pendingQc === 0
                  ? EMPTY_FOOTER
                  : null
            }
            href="/app/ims"
            icon={<Package size={15} />}
            title="Inventory"
          >
            <div className="ws-widget-kpis">
              <Kpi
                danger={data.ims.belowReorder > 0}
                label="Below reorder"
                value={String(data.ims.belowReorder)}
              />
              <Kpi
                danger={data.ims.stockOuts > 0}
                label="Stock-outs"
                value={String(data.ims.stockOuts)}
              />
              <Kpi label="Pending QC" value={String(data.ims.pendingQc)} />
            </div>
          </Widget>
        ) : null}

        {tasksEnabled && show("tasks") ? (
          <Widget
            footer={
              taskStats.overdue > 0
                ? {
                    text: `${taskStats.overdue} task${taskStats.overdue === 1 ? "" : "s"} overdue`,
                    tone: "danger",
                  }
                : taskStats.pending + taskStats.inProgress === 0
                  ? EMPTY_FOOTER
                  : null
            }
            href="/app/tasks"
            icon={<ClipboardList size={15} />}
            title="Tasks"
          >
            <div className="ws-widget-kpis">
              <Kpi label="Pending" value={String(taskStats.pending)} />
              <Kpi label="In progress" value={String(taskStats.inProgress)} />
              <Kpi
                danger={taskStats.overdue > 0}
                label="Overdue"
                value={String(taskStats.overdue)}
              />
            </div>
          </Widget>
        ) : null}

        {data.checklists && show("checklists") ? (
          <Widget
            footer={
              data.checklists.overdue > 0
                ? {
                    text: `${data.checklists.overdue} checklist item${data.checklists.overdue === 1 ? "" : "s"} overdue`,
                    tone: "danger",
                  }
                : data.checklists.dueToday === 0
                  ? EMPTY_FOOTER
                  : null
            }
            href="/app/checklists"
            icon={<CheckSquare size={15} />}
            title="Checklists"
          >
            <div className="ws-widget-kpis">
              <Kpi label="Due today" value={String(data.checklists.dueToday)} />
              <Kpi
                danger={data.checklists.overdue > 0}
                label="Overdue"
                value={String(data.checklists.overdue)}
              />
            </div>
          </Widget>
        ) : null}

        {data.em && show("em") ? (
          <Widget
            footer={
              data.em.people.length === 0
                ? { text: "No deficits this week", tone: "muted" }
                : null
            }
            href="/app/em"
            icon={<Presentation size={15} />}
            linkLabel={"Open EM board \u2192"}
            span2
            title={"EM Ready \u00B7 KRA deficits"}
          >
            {data.em.people.length > 0 ? (
              <ul className="ws-widget-list">
                {data.em.people.map((person) => (
                  <li key={person.name}>
                    <span className="ws-widget-list-label">{person.name}</span>
                    <span className="ws-widget-deficit">
                      {formatDeficitPct(person.deficitPct)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="ws-widget-kpis">
                <Kpi
                  danger={data.em.exceptions > 0}
                  label="Exceptions this week"
                  value={String(data.em.exceptions)}
                />
              </div>
            )}
          </Widget>
        ) : null}

        {data.recruitment && show("recruitment") ? (
          <Widget
            footer={data.recruitment.active === 0 ? EMPTY_FOOTER : null}
            href="/app/fms/fulfillment?flow=recruitment"
            icon={<Users size={15} />}
            title="Recruitment"
          >
            <div className="ws-widget-kpis">
              <Kpi label="Open positions" value={String(data.recruitment.active)} />
            </div>
            {data.recruitment.stages.length > 0 ? (
              <ul className="ws-widget-list">
                {data.recruitment.stages.map((stage) => (
                  <li key={stage.name}>
                    <span className="ws-widget-list-label">{stage.name}</span>
                    <span className="ws-widget-list-value">{stage.count}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Widget>
        ) : null}

        {show("collection") ? (
          <Widget
            footer={pendingPayments.length === 0 ? EMPTY_FOOTER : null}
            href="/app/reports"
            icon={<IndianRupee size={15} />}
            title="Collection follow-up"
          >
            <div className="ws-widget-kpis">
              <Kpi
                danger={pendingPayments.length > 0}
                label="Pending"
                value={String(pendingPayments.length)}
              />
              <Kpi label="Amount" value={formatInr(pendingCollectionsTotal)} />
            </div>
            {pendingPayments.length > 0 ? (
              <ul className="ws-widget-list">
                {pendingPayments.slice(0, 3).map((row) => (
                  <li key={row.id}>
                    <span className="ws-widget-list-label">{row.clientName}</span>
                    <span
                      className={
                        row.urgency === "overdue"
                          ? "ws-widget-deficit"
                          : "ws-widget-list-value"
                      }
                    >
                      {row.amount}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Widget>
        ) : null}
        </div>
      </section>
    </div>
  );
}
