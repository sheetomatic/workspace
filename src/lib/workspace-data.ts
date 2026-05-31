import type { Role } from "@prisma/client";
import type { DashboardPayload } from "@/lib/dashboard-types";
import {
  buildDashboardPayload,
  loadDashboardRowsFromDatabase,
} from "@/lib/dashboard-source";
import { fetchDashboardRowsFromGoogleSheets } from "@/lib/integrations/google-sheets-dashboard";
import type { SessionUser } from "@/lib/auth";
import { roleRank } from "@/lib/permissions";
import { prisma } from "@/lib/db";

export {
  formatPendingAge,
  formatDashboardDate,
} from "@/lib/workspace-format";

function canSeeByRole(userRole: Role, required: Role) {
  return roleRank(userRole) >= roleRank(required);
}

function sheetRowsHaveData(
  rows: Awaited<ReturnType<typeof fetchDashboardRowsFromGoogleSheets>>,
) {
  if (!rows) {
    return false;
  }
  const { metricCards, followUps, pendingPayments } = rows.rows;
  return (
    metricCards.length > 0 ||
    followUps.length > 0 ||
    pendingPayments.length > 0
  );
}

export async function getUserDashboard(user: SessionUser): Promise<DashboardPayload> {
  try {
    const fromSheets = await fetchDashboardRowsFromGoogleSheets(
      user.organizationId,
    );
    if (sheetRowsHaveData(fromSheets)) {
      return buildDashboardPayload(user, fromSheets!.rows, {
        dataSource: "google_sheets",
        spreadsheetId: fromSheets!.spreadsheetId,
      });
    }
  } catch {
    // Fall back to database when Sheets is misconfigured or unreachable
  }

  const dbRows = await loadDashboardRowsFromDatabase(user.organizationId);
  return buildDashboardPayload(user, dbRows, {
    dataSource: "database",
    spreadsheetId: null,
  });
}

export async function listWorkspaceApprovals(user: SessionUser) {
  const approvals = await prisma.workspaceApproval.findMany({
    where: {
      organizationId: user.organizationId,
      status: "PENDING",
    },
    orderBy: { pendingSince: "asc" },
  });

  return approvals.filter((row) => canSeeByRole(user.role, row.minRole));
}
