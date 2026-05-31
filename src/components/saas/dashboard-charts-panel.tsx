"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardChartsData } from "@/lib/dashboard-types";

export function DashboardChartsPanel({ charts }: { charts: DashboardChartsData }) {
  const hasWeekly = charts.weeklyActivity.some(
    (row) => row.followUps > 0 || row.tasks > 0,
  );
  const hasTasks = charts.taskBreakdown.length > 0;
  const hasMetrics = charts.metricBars.length > 0;
  const hasPayments = charts.paymentBreakdown.length > 0;

  if (!hasWeekly && !hasTasks && !hasMetrics && !hasPayments) {
    return null;
  }

  return (
    <section aria-label="Analytics charts" className="hs-charts-grid">
      {hasWeekly ? (
        <article className="hs-chart-card">
          <header className="hs-chart-head">
            <h2>Weekly activity</h2>
            <p>Follow-ups and task load by day</p>
          </header>
          <div className="hs-chart-body">
            <ResponsiveContainer height={240} width="100%">
              <BarChart data={charts.weeklyActivity}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="followUps"
                  fill="#1e88e5"
                  name="Follow-ups"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="tasks"
                  fill="#7c3aed"
                  name="Tasks due"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {hasTasks ? (
        <article className="hs-chart-card">
          <header className="hs-chart-head">
            <h2>Task pipeline</h2>
            <p>Status mix for your visible queue</p>
          </header>
          <div className="hs-chart-body hs-chart-body-pie">
            <ResponsiveContainer height={240} width="100%">
              <PieChart>
                <Pie
                  data={charts.taskBreakdown}
                  dataKey="value"
                  innerRadius={52}
                  nameKey="name"
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {charts.taskBreakdown.map((entry) => (
                    <Cell fill={entry.fill} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {hasMetrics ? (
        <article className="hs-chart-card hs-chart-card-wide">
          <header className="hs-chart-head">
            <h2>Top metrics</h2>
            <p>Numeric KPI comparison (role-filtered)</p>
          </header>
          <div className="hs-chart-body">
            <ResponsiveContainer height={260} width="100%">
              <BarChart data={charts.metricBars} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={110}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {charts.metricBars.map((entry) => (
                    <Cell fill={entry.fill} key={entry.name} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}

      {hasPayments ? (
        <article className="hs-chart-card">
          <header className="hs-chart-head">
            <h2>Payment risk</h2>
            <p>Conditional buckets by due date</p>
          </header>
          <div className="hs-chart-body">
            <ResponsiveContainer height={240} width="100%">
              <BarChart data={charts.paymentBreakdown}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {charts.paymentBreakdown.map((entry) => (
                    <Cell fill={entry.fill} key={entry.name} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      ) : null}
    </section>
  );
}
