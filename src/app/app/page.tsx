import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/saas/user-dashboard";
import { prisma } from "@/lib/db";
import type { DashboardPayload } from "@/lib/dashboard-types";
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

  let dashboard;
  try {
    dashboard = await getUserDashboard(user);
  } catch (error) {
    console.error("getUserDashboard", error);
    dashboard = emptyDashboardForUser(user.role);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true },
  });

  return (
    <div className="saas-page crm-dashboard-page">
      <UserDashboard
        {...dashboard}
        organizationName={organization?.name ?? user.organizationName}
        userName={displayName}
        userRole={user.role}
      />
    </div>
  );
}
