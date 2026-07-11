import { Suspense } from "react";
import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/saas/user-dashboard";
import { WorkspaceWidgetDashboard } from "@/components/saas/workspace-widget-dashboard";
import { prisma } from "@/lib/db";
import type { DashboardPayload } from "@/lib/dashboard-types";
import { getWidgetDashboardData } from "@/lib/dashboard/widgets";
import { requireSession } from "@/lib/require-session";
import { hasWorkspaceModule, resolveWorkspaceHomeHref } from "@/lib/workspace-modules";
import { getUserDashboard } from "@/lib/workspace-data";
import { parseWorkspaceNavPrefs } from "@/lib/workspace-nav-prefs";

function emptyDashboardForUser(role: import("@prisma/client").Role): DashboardPayload {
  return {
    metricCards: [],
    followUps: [],
    pendingPayments: [],
    taskStats: {
      pending: 0,
      inProgress: 0,
      completedToday: 0,
      overdue: 0,
    },
    charts: {
      weeklyActivity: [],
      taskBreakdown: [],
      metricBars: [],
      paymentBreakdown: [],
    },
    approvalsPending: 0,
    showApprovals: false,
    roleScope: "personal",
    roleLabel: role,
    dataSource: "database",
    spreadsheetId: null,
  };
}

function DashboardSkeleton() {
  return (
    <div
      className="saas-page ws-page-loading"
      aria-busy="true"
      aria-live="polite"
      style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 320 }}
    >
      <div
        style={{
          height: 3,
          borderRadius: 999,
          background: "linear-gradient(90deg,#0176d3,#7eb6ff,#0176d3)",
          backgroundSize: "200% 100%",
        }}
      />
      <div style={{ width: "min(280px,60%)", height: 28, borderRadius: 8, background: "#e2e8f0" }} />
      <div style={{ width: "min(420px,85%)", height: 16, borderRadius: 6, background: "#e2e8f0" }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,minmax(0,1fr))",
          gap: 12,
        }}
      >
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            style={{ height: 88, borderRadius: 10, background: "#e2e8f0" }}
          />
        ))}
      </div>
      <div style={{ height: 220, borderRadius: 12, background: "#e2e8f0" }} />
    </div>
  );
}

async function DashboardHome({
  user,
}: {
  user: Awaited<ReturnType<typeof requireSession>>;
}) {
  const displayName = user.name ?? user.email.split("@")[0];

  // BCI-style platform orgs get the widget grid; AI-CRM orgs keep the
  // classic metric-cards dashboard.
  const isWidgetHome =
    hasWorkspaceModule(user, "FMS") || hasWorkspaceModule(user, "IMS");

  const membershipPrefs = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    select: { workspacePrefs: true },
  });
  const navPrefs = parseWorkspaceNavPrefs(membershipPrefs?.workspacePrefs);

  const [dashboard, widgets, organization] = await Promise.all([
    // Widget home only needs task/payment strips — skip Sheets round-trip.
    isWidgetHome
      ? getUserDashboard(user, { skipSheets: true }).catch((error) => {
          console.error("getUserDashboard", error);
          return emptyDashboardForUser(user.role);
        })
      : getUserDashboard(user).catch((error) => {
          console.error("getUserDashboard", error);
          return emptyDashboardForUser(user.role);
        }),
    isWidgetHome
      ? getWidgetDashboardData(user, navPrefs).catch((error) => {
          console.error("getWidgetDashboardData", error);
          return null;
        })
      : Promise.resolve(null),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    }),
  ]);

  const organizationName = organization?.name ?? user.organizationName;

  if (widgets) {
    return (
      <div className="saas-page">
        <WorkspaceWidgetDashboard
          data={widgets}
          navPrefs={navPrefs}
          organizationName={organizationName}
          pendingPayments={dashboard.pendingPayments}
          taskStats={dashboard.taskStats}
          tasksEnabled={hasWorkspaceModule(user, "TASKS")}
          userName={displayName}
        />
      </div>
    );
  }

  return (
    <div className="saas-page crm-dashboard-page">
      <UserDashboard
        {...dashboard}
        organizationName={organizationName}
        userName={displayName}
        userRole={user.role}
      />
    </div>
  );
}

export default async function AppDashboardPage() {
  const user = await requireSession();
  const home = resolveWorkspaceHomeHref(user);

  // Only bounce away when home is a different route — never /app ↔ /app/cases.
  if (home !== "/app") {
    redirect(home);
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardHome user={user} />
    </Suspense>
  );
}
