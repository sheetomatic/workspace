import type { MetricTone, Role } from "@prisma/client";
import type { PaymentUrgency } from "@/lib/dashboard-analytics";

export type DashboardMetricCard = {
  id: string;
  label: string;
  value: string;
  numericValue: number;
  tone: MetricTone;
  accent: "default" | "success" | "warning";
  actionLabel: string;
  actionHref: string | null;
};

export type DashboardFollowUpRow = {
  id: string;
  clientName: string;
  followUpAt: string;
  remarks: string | null;
  tone: "primary" | "warning" | "danger";
  timeLabel: string;
};

export type DashboardPaymentRow = {
  id: string;
  clientName: string;
  amount: string;
  amountNumeric: number;
  dueAt: string;
  urgency: PaymentUrgency;
  urgencyLabel: string;
  daysUntilDue: number;
};

export type DashboardTaskStats = {
  pending: number;
  inProgress: number;
  completedToday: number;
  overdue: number;
};

export type DashboardChartsData = {
  weeklyActivity: { label: string; followUps: number; tasks: number }[];
  taskBreakdown: { name: string; value: number; fill: string }[];
  metricBars: { name: string; value: number; fill: string }[];
  paymentBreakdown: { name: string; value: number; fill: string }[];
};

export type DashboardDataSource = "google_sheets" | "database";

export type DashboardPayload = {
  metricCards: DashboardMetricCard[];
  followUps: DashboardFollowUpRow[];
  pendingPayments: DashboardPaymentRow[];
  taskStats: DashboardTaskStats;
  charts: DashboardChartsData;
  approvalsPending: number;
  showApprovals: boolean;
  roleScope: "organization" | "personal";
  roleLabel: string;
  dataSource: DashboardDataSource;
  spreadsheetId: string | null;
};

export type DashboardViewProps = DashboardPayload & {
  userName: string;
  userRole: Role;
  organizationName: string;
};
