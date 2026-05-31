import type { MetricTone } from "@prisma/client";

export type PaymentUrgency = "overdue" | "due_soon" | "on_track";

export type DashboardChartColors = {
  primary: string;
  success: string;
  warning: string;
  danger: string;
  muted: string;
  series: string[];
};

export const DASHBOARD_CHART_COLORS: DashboardChartColors = {
  primary: "#1e88e5",
  success: "#16a34a",
  warning: "#ea580c",
  danger: "#dc2626",
  muted: "#94a3b8",
  series: ["#1e88e5", "#7c3aed", "#0d9488", "#f59e0b", "#ec4899", "#64748b"],
};

export function parseMetricNumericValue(value: string): number {
  const digits = value.replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function paymentUrgency(dueAt: Date, now = new Date()): PaymentUrgency {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueAt);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 7) {
    return "due_soon";
  }
  return "on_track";
}

export function urgencyLabel(urgency: PaymentUrgency) {
  switch (urgency) {
    case "overdue":
      return "Overdue";
    case "due_soon":
      return "Due soon";
    default:
      return "On track";
  }
}

export function toneToAccent(
  tone: MetricTone,
): "default" | "success" | "warning" {
  switch (tone) {
    case "SUCCESS":
      return "success";
    case "WARNING":
      return "warning";
    default:
      return "default";
  }
}

export function buildWeeklyActivitySeries(
  followUpDates: Date[],
  taskDueDates: Date[],
) {
  const days: { key: string; label: string; followUps: number; tasks: number }[] =
    [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-IN", { weekday: "short" });
    days.push({ key, label, followUps: 0, tasks: 0 });
  }

  const index = new Map(days.map((day, i) => [day.key, i]));

  for (const date of followUpDates) {
    const key = date.toISOString().slice(0, 10);
    const slot = index.get(key);
    if (slot !== undefined) {
      days[slot].followUps += 1;
    }
  }

  for (const date of taskDueDates) {
    const key = date.toISOString().slice(0, 10);
    const slot = index.get(key);
    if (slot !== undefined) {
      days[slot].tasks += 1;
    }
  }

  return days;
}

export function followUpTone(
  remarks: string | null | undefined,
): "primary" | "warning" | "danger" {
  const text = (remarks ?? "").toLowerCase();
  if (text.includes("complaint") || text.includes("urgent")) {
    return "danger";
  }
  if (text.includes("payment") || text.includes("trial")) {
    return "warning";
  }
  return "primary";
}
