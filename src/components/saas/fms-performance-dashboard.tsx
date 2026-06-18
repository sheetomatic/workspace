"use client";

import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PerformancePayload } from "@/lib/fms/performance-data";
import { FmsPerformanceFilters } from "@/components/saas/fms-performance-filters";

function formatDueDate(value: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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

      <div className="ws-fms-perf-charts-grid">
        <article className="ws-sf-card ws-fms-perf-chart-card">
          <header className="ws-fms-perf-chart-head">
            <h2>FMS wise</h2>
            <p>On track vs delayed stops per workflow</p>
          </header>
          {payload.fmsChart.length > 0 ? (
            <div className="ws-fms-perf-chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={payload.fmsChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#706e6b" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#706e6b" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #dddbda",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="onTrack" name="On track" fill="#2e844a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="delayed" name="Delayed" fill="#ea001e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="ws-fms-muted ws-fms-perf-empty">No in-progress stops for this filter.</p>
          )}
        </article>

        <article className="ws-sf-card ws-fms-perf-chart-card">
          <header className="ws-fms-perf-chart-head">
            <h2>Doer wise</h2>
            <p>Active and delayed stops by doer</p>
          </header>
          {payload.doerChart.length > 0 ? (
            <div className="ws-fms-perf-chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={payload.doerChart}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                >
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#706e6b" }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    tick={{ fontSize: 11, fill: "#706e6b" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #dddbda",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="active" name="Active" fill="#0176d3" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="delayed" name="Delayed" fill="#ea001e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="ws-fms-muted ws-fms-perf-empty">No assigned doers for this filter.</p>
          )}
        </article>

        <article className="ws-sf-card ws-fms-perf-chart-card ws-fms-perf-chart-card-wide">
          <header className="ws-fms-perf-chart-head">
            <h2>Due date wise</h2>
            <p>Active stops grouped by planned due window</p>
          </header>
          {payload.dueChart.length > 0 ? (
            <div className="ws-fms-perf-chart-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={payload.dueChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#706e6b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#706e6b" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #dddbda",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Stops" radius={[4, 4, 0, 0]}>
                    {payload.dueChart.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="ws-fms-muted ws-fms-perf-empty">No due-date buckets for this filter.</p>
          )}
        </article>
      </div>

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
          <p>Upcoming and overdue active stops (sorted by planned time)</p>
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
