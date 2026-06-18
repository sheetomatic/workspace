"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PerformancePayload } from "@/lib/fms/performance-data";
import { FmsPerformanceFilters } from "@/components/saas/fms-performance-filters";

const PIE_COLORS = ["#0176d3", "#2e844a", "#7c3aed", "#fe9339", "#06b6d4", "#706e6b"];
const CHART_H = 152;
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
};

function formatDueDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ChartCard({
  title,
  subtitle,
  type,
  children,
  empty,
  wide,
}: {
  title: string;
  subtitle: string;
  type: string;
  children: ReactNode;
  empty?: boolean;
  wide?: boolean;
}) {
  return (
    <article
      className={`ws-fms-perf-chart-card${wide ? " is-wide" : ""}`}
    >
      <header className="ws-fms-perf-chart-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <span className="ws-fms-perf-chart-type">{type}</span>
      </header>
      {empty ? (
        <p className="ws-fms-muted ws-fms-perf-empty">No data for this filter.</p>
      ) : (
        <div className="ws-fms-perf-chart-body">{children}</div>
      )}
    </article>
  );
}

export function FmsPerformanceDashboard({
  payload,
  current,
}: {
  payload: PerformancePayload;
  current: {
    fms?: string;
    doer?: string;
    due?: string;
  };
}) {
  const { kpis } = payload;

  const healthDonut = useMemo(
    () =>
      [
        { name: "On track", value: kpis.onTrack, fill: "#2e844a" },
        { name: "Delayed", value: kpis.delayed, fill: "#ea001e" },
      ].filter((slice) => slice.value > 0),
    [kpis.delayed, kpis.onTrack],
  );

  const doerPie = useMemo(
    () =>
      payload.doerRows.map((row, index) => ({
        name: row.name.length > 14 ? `${row.name.slice(0, 12)}...` : row.name,
        value: row.active,
        fill: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [payload.doerRows],
  );

  const fmsMixed = useMemo(
    () =>
      payload.fmsChart.map((row) => ({
        ...row,
        total: row.onTrack + row.delayed,
      })),
    [payload.fmsChart],
  );

  return (
    <>
      <FmsPerformanceFilters
        workflows={payload.workflows}
        doers={payload.doers}
        current={current}
      />

      <div className="ws-sf-metrics ws-fms-metrics ws-fms-perf-metrics">
        <div className="ws-sf-metric-tile">
          <span>Active workflows</span>
          <strong>{kpis.activeWorkflows}</strong>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Active leads</span>
          <strong>{kpis.activeLeads}</strong>
        </div>
        <div className="ws-sf-metric-tile">
          <span>On track</span>
          <strong>{kpis.onTrack}</strong>
        </div>
        <div className="ws-sf-metric-tile">
          <span>Delayed</span>
          <strong className={kpis.delayed > 0 ? "is-late" : ""}>{kpis.delayed}</strong>
        </div>
      </div>

      <section className="ws-fms-perf-charts-grid" aria-label="Performance charts">
        <ChartCard
          title="Stop health"
          subtitle="On track vs delayed mix"
          type="Donut"
          empty={healthDonut.length === 0}
        >
          <ResponsiveContainer width="100%" height={CHART_H}>
            <PieChart>
              <Pie
                data={healthDonut}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={42}
                outerRadius={62}
                paddingAngle={2}
              >
                {healthDonut.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="FMS wise"
          subtitle="Stops per workflow"
          type="Column"
          empty={payload.fmsChart.length === 0}
        >
          <ResponsiveContainer width="100%" height={CHART_H}>
            <BarChart
              data={payload.fmsChart}
              margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
            >
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                interval={0}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                allowDecimals={false}
                width={24}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="onTrack" name="On track" stackId="a" fill="#2e844a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="delayed" name="Delayed" stackId="a" fill="#ea001e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Doer load"
          subtitle="Share of active stops"
          type="Pie"
          empty={doerPie.length === 0}
        >
          <ResponsiveContainer width="100%" height={CHART_H}>
            <PieChart>
              <Pie
                data={doerPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={62}
                paddingAngle={1}
              >
                {doerPie.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Due window"
          subtitle="Stops by planned due bucket"
          type="Area"
          empty={payload.dueChart.length === 0}
        >
          <ResponsiveContainer width="100%" height={CHART_H}>
            <AreaChart
              data={payload.dueChart}
              margin={{ top: 4, right: 4, left: -18, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fmsDueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0176d3" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#0176d3" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                allowDecimals={false}
                width={24}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="count"
                name="Stops"
                stroke="#0176d3"
                fill="url(#fmsDueFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Doer workload"
          subtitle="Active vs delayed by doer"
          type="Bar"
          empty={payload.doerChart.length === 0}
        >
          <ResponsiveContainer width="100%" height={CHART_H}>
            <BarChart
              data={payload.doerChart}
              layout="vertical"
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="active" name="Active" fill="#0176d3" radius={[0, 3, 3, 0]} barSize={10} />
              <Bar dataKey="delayed" name="Delayed" fill="#ea001e" radius={[0, 3, 3, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="FMS performance"
          subtitle="Bars + trend line per workflow"
          type="Mixed"
          empty={fmsMixed.length === 0}
          wide
        >
          <ResponsiveContainer width="100%" height={CHART_H}>
            <ComposedChart
              data={fmsMixed}
              margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
            >
              <CartesianGrid stroke="#eef2f6" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                allowDecimals={false}
                width={24}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              <Bar dataKey="onTrack" name="On track" fill="#2e844a" barSize={14} radius={[3, 3, 0, 0]} />
              <Bar dataKey="delayed" name="Delayed" fill="#ea001e" barSize={14} radius={[3, 3, 0, 0]} />
              <Line
                type="monotone"
                dataKey="total"
                name="Total active"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </section>

      <div className="ws-fms-perf-tables-grid">
        <section className="ws-sf-card ws-fms-section">
          <header className="ws-fms-section-heading">
            <h2>FMS wise table</h2>
            <p>Workflow health breakdown</p>
          </header>
          <div className="ws-fms-perf-table-wrap">
            <table className="ws-fms-perf-table">
              <thead>
                <tr>
                  <th>Workflow</th>
                  <th>Leads</th>
                  <th>In progress</th>
                  <th>On track</th>
                  <th>Delayed</th>
                </tr>
              </thead>
              <tbody>
                {payload.fmsRows.map((row) => (
                  <tr key={row.id}>
                    <td className="ws-fms-perf-workflow">
                      <Link href={`/app/fms/lines#fms-${row.id}`} title={row.name}>
                        {row.name}
                      </Link>
                    </td>
                    <td>{row.activeLeads}</td>
                    <td>{row.inProgress}</td>
                    <td>{row.onTrack}</td>
                    <td className={row.delayed > 0 ? "is-late" : ""}>{row.delayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="ws-sf-card ws-fms-section">
          <header className="ws-fms-section-heading">
            <h2>Doer wise table</h2>
            <p>Who holds active stops</p>
          </header>
          <div className="ws-fms-perf-table-wrap">
            <table className="ws-fms-perf-table">
              <thead>
                <tr>
                  <th>Doer</th>
                  <th>Active</th>
                  <th>On track</th>
                  <th>Delayed</th>
                </tr>
              </thead>
              <tbody>
                {payload.doerRows.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No active stops assigned.</td>
                  </tr>
                ) : (
                  payload.doerRows.map((row) => (
                    <tr key={row.id}>
                      <td className="ws-fms-perf-doer">{row.name}</td>
                      <td>{row.active}</td>
                      <td>{row.onTrack}</td>
                      <td className={row.delayed > 0 ? "is-late" : ""}>{row.delayed}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="ws-sf-card ws-fms-section">
        <header className="ws-fms-section-heading">
          <h2>Due date wise table</h2>
          <p>Upcoming and overdue active stops</p>
        </header>
        <div className="ws-fms-perf-table-wrap">
          <table className="ws-fms-perf-table">
            <thead>
              <tr>
                <th>Workflow</th>
                <th>Doer</th>
                <th>Planned due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payload.dueTable.length === 0 ? (
                <tr>
                  <td colSpan={4}>No active stops match this due-date filter.</td>
                </tr>
              ) : (
                payload.dueTable.map((row) => (
                  <tr key={row.id}>
                    <td>{row.workflow}</td>
                    <td>{row.doer}</td>
                    <td className={row.isOverdue ? "is-late" : ""}>
                      {formatDueDate(row.plannedAt)}
                    </td>
                    <td>{row.isOverdue ? "Delayed" : "On track"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
