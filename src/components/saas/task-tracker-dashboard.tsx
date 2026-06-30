"use client";

import Link from "next/link";
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TaskTrackerDashboardData } from "@/lib/tasks";
import { assigneeInitials } from "@/lib/tasks";

type TaskTrackerDashboardProps = {
  data: TaskTrackerDashboardData;
  userName: string;
  greetingDate: string;
  greetingTime: string;
  showTeam: boolean;
  showCreateLink?: boolean;
};

function formatTrend(trend: number) {
  if (trend === 0) {
    return "0";
  }
  return trend > 0 ? `+${trend}` : `${trend}`;
}

function trendTone(trend: number) {
  if (trend > 0) {
    return "positive";
  }
  if (trend < 0) {
    return "negative";
  }
  return "neutral";
}

function progressPercent(done: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((done / total) * 100));
}

function MemberAvatars({
  members,
  tone,
}: {
  members: Array<{ name: string; userId: string }>;
  tone: "on-track" | "overdue" | "idle";
}) {
  if (members.length === 0) {
    return <span className="ws-tracker-insight-empty">None</span>;
  }

  return (
    <div className="ws-tracker-avatar-row">
      {members.map((member) => (
        <span
          key={member.userId}
          className={`ws-task-avatar ws-tracker-avatar tone-${tone}`}
          title={member.name}
        >
          {assigneeInitials(member.name, member.name)}
        </span>
      ))}
    </div>
  );
}

export function TaskTrackerDashboard({
  data,
  userName,
  greetingDate,
  greetingTime,
  showTeam,
  showCreateLink = true,
}: TaskTrackerDashboardProps) {
  const dueTodayPct = progressPercent(data.dueToday.completed, data.dueToday.total);
  const yieldPct = progressPercent(data.dailyYield.completed, data.dailyYield.target);

  return (
    <section className="ws-task-tracker" aria-label="Task dashboard">
      <header className="ws-task-tracker-welcome">
        <div>
          <p className="ws-task-tracker-kicker">Dashboard</p>
          <h2>
            Hi {userName},{" "}
            <span className="ws-task-tracker-date">{greetingDate}</span>
          </h2>
          <span className="ws-task-tracker-time">{greetingTime}</span>
        </div>
        {showCreateLink ? (
          <Link className="btn-secondary btn-sm" href="/app/tasks/create">
            Add task
          </Link>
        ) : null}
      </header>

      <div className="ws-task-tracker-grid">
        <article className="ws-task-tracker-card ws-tracker-distribution">
          <header>
            <h3>Task distribution</h3>
            <span>Status mix across your queue</span>
          </header>
          <div className="ws-tracker-distribution-body">
            {data.distribution.length > 0 ? (
              <>
                <div className="ws-tracker-donut-wrap">
                  <ResponsiveContainer height={168} width="100%">
                    <PieChart>
                      <Pie
                        data={data.distribution}
                        dataKey="value"
                        innerRadius={52}
                        nameKey="name"
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {data.distribution.map((entry) => (
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
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="ws-tracker-donut-center">
                    <strong>{data.distributionTotal}</strong>
                    <span>Total</span>
                  </div>
                </div>
                <ul className="ws-tracker-legend">
                  {data.distribution.map((row) => (
                    <li key={row.name}>
                      <span
                        className="ws-tracker-legend-dot"
                        style={{ background: row.color }}
                      />
                      <span>{row.name}</span>
                      <strong>{row.value}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="ws-tracker-empty">No tasks yet. Create one to get started.</p>
            )}
          </div>
        </article>

        <article className="ws-task-tracker-card ws-tracker-performance">
          <header>
            <h3>Performance score</h3>
            <span>Tasks completed over the last 7 days</span>
          </header>
          <div className="ws-tracker-line-wrap">
            {data.performanceSeries.some((row) => row.completed > 0) ? (
              <ResponsiveContainer height={168} width="100%">
                <LineChart data={data.performanceSeries}>
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    dataKey="completed"
                    dot={{ r: 3, fill: "#7c3aed" }}
                    name="Completed"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="ws-tracker-empty">Completion trend will appear here.</p>
            )}
          </div>
        </article>

        {showTeam ? (
          <article className="ws-task-tracker-card ws-tracker-insights">
            <header>
              <h3>Today&apos;s team insights</h3>
              <span>Workload health by member</span>
            </header>
            <div className="ws-tracker-insight-list">
              <div className="ws-tracker-insight-row tone-on-track">
                <div>
                  <strong>On track</strong>
                  <span>{data.teamInsights.onTrack.length} members</span>
                </div>
                <MemberAvatars members={data.teamInsights.onTrack} tone="on-track" />
              </div>
              <div className="ws-tracker-insight-row tone-overdue">
                <div>
                  <strong>Overdue load</strong>
                  <span>{data.teamInsights.overdue.length} members</span>
                </div>
                <MemberAvatars members={data.teamInsights.overdue} tone="overdue" />
              </div>
              <div className="ws-tracker-insight-row tone-idle">
                <div>
                  <strong>No active tasks</strong>
                  <span>{data.teamInsights.idle.length} members</span>
                </div>
                <MemberAvatars members={data.teamInsights.idle} tone="idle" />
              </div>
            </div>
          </article>
        ) : null}
      </div>

      <div className="ws-tracker-score-row">
        {(
          [
            { key: "today", label: "Today" },
            { key: "week", label: "This week" },
            { key: "month", label: "This month" },
          ] as const
        ).map((period) => {
          const score = data.periodScores[period.key];
          const tone = trendTone(score.trend);
          return (
            <article
              key={period.key}
              className={`ws-tracker-score-card tone-${tone}`}
            >
              <span>{period.label}</span>
              <strong>{score.value}</strong>
              <small>
                {formatTrend(score.trend)} vs prior period
              </small>
            </article>
          );
        })}
      </div>

      <div className="ws-tracker-progress-row">
        <article className="ws-tracker-progress-card">
          <header>
            <h4>Tasks due to be completed today</h4>
            <span>
              {data.dueToday.completed}/{data.dueToday.total || 0}
            </span>
          </header>
          <div className="ws-tracker-progress-bar">
            <span
              className="fill tone-today"
              style={{ width: `${dueTodayPct}%` }}
            />
          </div>
        </article>
        <article className="ws-tracker-progress-card">
          <header>
            <h4>Daily completed tasks target</h4>
            <span>
              {data.dailyYield.completed}/{data.dailyYield.target}
            </span>
          </header>
          <div className="ws-tracker-progress-bar">
            <span
              className="fill tone-yield"
              style={{ width: `${yieldPct}%` }}
            />
          </div>
        </article>
      </div>

      <div className="ws-tracker-approval-row">
        <Link
          className="ws-tracker-approval-card"
          href="/app/tasks?status=AWAITING_VERIFICATION#execution-queue"
        >
          <span>Verification queue</span>
          <strong>{data.approvals.verification}</strong>
        </Link>
        <Link
          className="ws-tracker-approval-card tone-requests"
          href="/app/tasks?status=REVISION_REQUESTED#execution-queue"
        >
          <span>Task requests</span>
          <strong>{data.approvals.requests}</strong>
        </Link>
      </div>

      <article className="ws-task-tracker-card ws-tracker-summary">
        <header>
          <h3>Task summary</h3>
          <span>Overdue, today, and open counts by view</span>
        </header>
        <div className="ws-tracker-summary-table-wrap">
          <table className="ws-tracker-summary-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Overdue</th>
                <th scope="col">Today</th>
                <th scope="col">Open</th>
              </tr>
            </thead>
            <tbody>
              {data.summaryRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row">
                    <Link href={row.href}>{row.label}</Link>
                  </th>
                  <td className={row.overdue > 0 ? "tone-overdue" : undefined}>
                    {row.overdue}
                  </td>
                  <td className={row.today > 0 ? "tone-today" : undefined}>
                    {row.today}
                  </td>
                  <td>{row.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
