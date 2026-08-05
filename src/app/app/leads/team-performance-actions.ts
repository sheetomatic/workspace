"use server";

import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { withDbRetry } from "@/lib/db";
import {
  getTeamPerformance,
  getTeamPerformanceDrilldown,
  TEAM_PERF_PERIOD_RE,
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
  periodKey: string,
): Promise<{ ok: true; data: TeamPerformanceData } | { ok: false; message: string }> {
  const user = await requireCrmAdmin();
  if (!user) return { ok: false, message: "Admin access required." };
  if (!TEAM_PERF_PERIOD_RE.test(periodKey)) {
    return { ok: false, message: "Invalid period." };
  }
  const data = await withDbRetry(() =>
    getTeamPerformance(user.organizationId, periodKey),
  );
  return { ok: true, data };
}

export async function fetchTeamPerformanceDrilldownAction(params: {
  periodKey: string;
  metric: TeamPerfMetricKey;
  userId: string | null;
}): Promise<{ ok: true; items: TeamPerfDrilldownItem[] } | { ok: false; message: string }> {
  const user = await requireCrmAdmin();
  if (!user) return { ok: false, message: "Admin access required." };
  if (!TEAM_PERF_PERIOD_RE.test(params.periodKey)) {
    return { ok: false, message: "Invalid period." };
  }
  const items = await withDbRetry(() =>
    getTeamPerformanceDrilldown(
      user.organizationId,
      params.periodKey,
      params.metric,
      params.userId,
    ),
  );
  return { ok: true, items };
}
