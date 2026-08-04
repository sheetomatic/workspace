"use server";

import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { withDbRetry } from "@/lib/db";
import {
  getTeamPerformance,
  getTeamPerformanceDrilldown,
  type TeamPerfDrilldownItem,
  type TeamPerfMetricKey,
  type TeamPerformanceData,
} from "@/lib/leads/team-performance";

async function requireCrmAdmin() {
  const user = await requireSession(undefined, { module: "CRM" });
  if (!user.isSuperAdmin && !hasMinimumRole(user.role, "ADMIN")) {
    return null;
  }
  return user;
}

export async function fetchTeamPerformanceAction(
  monthKey: string,
): Promise<{ ok: true; data: TeamPerformanceData } | { ok: false; message: string }> {
  const user = await requireCrmAdmin();
  if (!user) return { ok: false, message: "Admin access required." };
  if (!/^\d{4}-\d{2}$/.test(monthKey)) {
    return { ok: false, message: "Invalid month." };
  }
  const data = await withDbRetry(() =>
    getTeamPerformance(user.organizationId, monthKey),
  );
  return { ok: true, data };
}

export async function fetchTeamPerformanceDrilldownAction(params: {
  monthKey: string;
  metric: TeamPerfMetricKey;
  userId: string | null;
}): Promise<{ ok: true; items: TeamPerfDrilldownItem[] } | { ok: false; message: string }> {
  const user = await requireCrmAdmin();
  if (!user) return { ok: false, message: "Admin access required." };
  if (!/^\d{4}-\d{2}$/.test(params.monthKey)) {
    return { ok: false, message: "Invalid month." };
  }
  const items = await withDbRetry(() =>
    getTeamPerformanceDrilldown(
      user.organizationId,
      params.monthKey,
      params.metric,
      params.userId,
    ),
  );
  return { ok: true, items };
}
