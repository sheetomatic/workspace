"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ImsReportData } from "@/lib/ims/ims-store";
import {
  IMS_STOCK_STATUS_LABELS,
  formatImsCurrency,
} from "@/lib/ims/stock-status";

const STATUS_COLORS: Record<string, string> = {
  red: "#dc2626",
  orange: "#f59e0b",
  green: "#16a34a",
  blue: "#2563eb",
};

const ABC_COLORS: Record<string, string> = {
  A: "#2563eb",
  B: "#7c3aed",
  C: "#94a3b8",
};

const MOVEMENT_LABELS: Record<string, string> = {
  RM_IN: "RM In",
  ISSUE_TO_PRODUCTION: "Issue to prod.",
  FG_IN: "FG In",
  FG_OUT: "FG Out",
  QC_PASS: "QC pass",
  QC_FAIL: "QC fail",
  ADJUSTMENT: "Adjustment",
};

const tooltipStyle = {
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  fontSize: 12,
};

const CHART_HEIGHT = 260;

function compactCurrency(value: number) {
  return `\u20b9${Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)}`;
}

export function ImsReportsCharts({ data }: { data: ImsReportData }) {
  const statusData = (Object.keys(IMS_STOCK_STATUS_LABELS) as Array<
    keyof typeof IMS_STOCK_STATUS_LABELS
  >)
    .map((status) => ({
      name: IMS_STOCK_STATUS_LABELS[status],
      value: data.statusCounts[status],
      color: STATUS_COLORS[status],
    }))
    .filter((entry) => entry.value > 0);

  const abcData = (["A", "B", "C"] as const)
    .map((cls) => ({
      name: `Class ${cls}`,
      value: data.abcValue[cls],
      color: ABC_COLORS[cls],
    }))
    .filter((entry) => entry.value > 0);

  const categoryData = data.categoryValuation.slice(0, 8).map((row) => ({
    name: row.category,
    value: Math.round(row.value),
  }));

  const typeData = Object.entries(data.movementTypeCounts)
    .map(([type, count]) => ({
      name: MOVEMENT_LABELS[type] ?? type,
      value: count,
    }))
    .sort((a, b) => b.value - a.value);

  const trendData = data.movementTrend.map((row) => ({
    date: row.date.slice(5),
    inbound: row.inbound,
    outbound: row.outbound,
  }));

  return (
    <div className="ws-ims-reports-grid">
      <article className="ws-ims-panel">
        <h2>Valuation by category</h2>
        {categoryData.length === 0 ? (
          <p className="ws-ims-help">No stock value to chart yet.</p>
        ) : (
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <BarChart data={categoryData} layout="vertical" margin={{ left: 12, right: 16 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickFormatter={compactCurrency}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatImsCurrency(Number(value))}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="ws-ims-panel">
        <h2>Value by ABC class</h2>
        {abcData.length === 0 ? (
          <p className="ws-ims-help">No stock value to chart yet.</p>
        ) : (
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <PieChart>
              <Pie
                data={abcData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {abcData.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => formatImsCurrency(Number(value))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="ws-ims-panel">
        <h2>Stock status mix</h2>
        {statusData.length === 0 ? (
          <p className="ws-ims-help">No items to chart yet.</p>
        ) : (
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {statusData.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </article>

      <article className="ws-ims-panel">
        <h2>Movements (last {data.trendDays} days)</h2>
        <ResponsiveContainer height={CHART_HEIGHT} width="100%">
          <LineChart data={trendData} margin={{ left: 4, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="inbound"
              name="Inbound"
              stroke="#16a34a"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="outbound"
              name="Outbound"
              stroke="#dc2626"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </article>

      <article className="ws-ims-panel ws-ims-reports-wide">
        <h2>Movements by type (last {data.trendDays} days)</h2>
        {typeData.length === 0 ? (
          <p className="ws-ims-help">No movements recorded in this window.</p>
        ) : (
          <ResponsiveContainer height={CHART_HEIGHT} width="100%">
            <BarChart data={typeData} margin={{ left: 4, right: 16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-12} dy={8} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" name="Movements" fill="#7c3aed" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </article>
    </div>
  );
}
