import { Bell, Search, Shield, Sheet } from "lucide-react";
import { DashboardChartsPanel } from "@/components/saas/dashboard-charts-panel";
import { DashboardKpiGrid } from "@/components/saas/dashboard-kpi-grid";
import { DashboardTables } from "@/components/saas/dashboard-tables";
import type { DashboardViewProps } from "@/lib/dashboard-types";

export function UserDashboard({
  metricCards,
  followUps,
  pendingPayments,
  taskStats,
  charts,
  approvalsPending,
  showApprovals,
  roleScope,
  roleLabel,
  dataSource,
  spreadsheetId,
  userName,
  organizationName,
}: DashboardViewProps) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="hs-dashboard">
      <header className="hs-dashboard-topbar">
        <div>
          <p className="hs-dashboard-eyebrow">{organizationName}</p>
          <h1>Dashboard</h1>
          <p className="hs-dashboard-sub">
            {userName} ({roleLabel})
          </p>
        </div>
        <div className="hs-dashboard-tools">
          <span className={`hs-scope-badge scope-${roleScope}`}>
            <Shield size={14} aria-hidden />
            {roleScope === "organization"
              ? "Organization view"
              : "Your assigned work"}
          </span>
          {dataSource === "google_sheets" ? (
            <a
              className="hs-scope-badge hs-sheets-badge"
              href={
                spreadsheetId
                  ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
                  : "/app/settings"
              }
              rel="noreferrer"
              target="_blank"
              title="Metrics and tables load from Google Sheets"
            >
              <Sheet size={14} aria-hidden />
              Google Sheets
            </a>
          ) : null}
          <button aria-label="Search" className="hs-icon-btn" type="button">
            <Search size={18} />
          </button>
          <button
            aria-label="Notifications"
            className="hs-icon-btn"
            type="button"
          >
            <Bell size={18} />
          </button>
          <div className="hs-topbar-user" title={roleLabel}>
            <span className="hs-avatar sm">{initials}</span>
          </div>
        </div>
      </header>

      <DashboardKpiGrid
        approvalsPending={approvalsPending}
        showApprovals={showApprovals}
        metricCards={metricCards}
        taskStats={taskStats}
      />

      <DashboardChartsPanel charts={charts} />

      <DashboardTables followUps={followUps} pendingPayments={pendingPayments} />

      <p className="hs-dashboard-foot">
        HubSpot-style reporting for Sheetomatic. Metrics, charts, and tables
        respect your <strong>{roleLabel}</strong> access
        {roleScope === "personal" ? " (personal queue only)" : ""}.
        {dataSource === "google_sheets"
          ? " KPI cards, follow-ups, and payments are loaded from Google Sheets."
          : " Connect Google Sheets in Settings to drive KPIs from your spreadsheet."}
      </p>
    </div>
  );
}
