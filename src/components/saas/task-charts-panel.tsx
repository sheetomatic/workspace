"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TaskChartData } from "@/lib/tasks";

const CHART_HEIGHT = 118;

export function TaskChartsPanel({ charts }: { charts: TaskChartData }) {
  const hasStatus = charts.statusBreakdown.length > 0;

  if (!hasStatus) {
    return null;
  }

  return (
    <div aria-label="Task analytics" className="ws-task-charts-grid ws-task-charts-single">
      <article className="ws-task-chart-card">
        <header className="ws-task-chart-head">
          <h2>Status mix</h2>
        </header>
        <div className="ws-task-chart-body ws-task-chart-body-pie">
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <PieChart>
              <Pie
                data={charts.statusBreakdown}
                dataKey="value"
                innerRadius={30}
                nameKey="name"
                outerRadius={46}
                paddingAngle={2}
              >
                {charts.statusBreakdown.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </article>
    </div>
  );
}
