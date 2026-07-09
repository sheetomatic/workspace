import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/saas/user-dashboard";
import { WorkspaceWidgetDashboard } from "@/components/saas/workspace-widget-dashboard";
import { prisma } from "@/lib/db";
import type { DashboardPayload } from "@/lib/dashboard-types";
import { getWidgetDashboardData } from "@/lib/dashboard/widgets";
import { requireSession } from "@/lib/require-session";
import { hasWorkspaceModule, resolveWorkspaceHomeHref } from "@/lib/workspace-modules";
import { getUserDashboard } from "@/lib/workspace-data";

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

export default async function AppDashboardPage() {
  const user = await requireSession();

  if (
    hasWorkspaceModule(user, "CASES") ||
    hasWorkspaceModule(user, "TASKS")
  ) {
    redirect(resolveWorkspaceHomeHref(user));
  }

  const displayName = user.name ?? user.email.split("@")[0];

  // BCI-style platform orgs get the widget grid; AI-CRM orgs keep the
  // classic metric-cards dashboard.
  const isWidgetHome =
    hasWorkspaceModule(user, "FMS") || hasWorkspaceModule(user, "IMS");

  const [dashboard, widgets, organization] = await Promise.all([
    getUserDashboard(user).catch((error) => {
      console.error("getUserDashboard", error);
      return emptyDashboardForUser(user.role);
    }),
    isWidgetHome
      ? getWidgetDashboardData(user).catch((error) => {
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
