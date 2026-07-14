import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getOrCreateHrSettings } from "@/lib/hr/hr-store";
import { isHrSubModuleEnabled } from "@/lib/hr/hr-sub-modules";
import {
  listMyDayTrail,
  listTodayPings,
  postFieldLocationPing,
} from "@/lib/hr/field-pings";

/**
 * POST /api/hr/field/ping — STAFF+ self GPS ping (min 30s interval).
 * Body JSON: { geoLat, geoLng, accuracyM?, batteryPct?, isMockLocation? }
 *
 * GET /api/hr/field/ping — managers: today's org pings; staff: own day trail.
 * Query: ?mine=1 | ?date=YYYY-MM-DD (trail for self)
 */
async function hasFieldTrackingAccess(organizationId: string) {
  const settings = await getOrCreateHrSettings(organizationId);
  return isHrSubModuleEnabled(settings.enabledHrSubModules, "field");
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }
  if (!hasWorkspaceModule(user, "HR")) {
    return NextResponse.json({ error: "HR access required" }, { status: 403 });
  }
  if (!(await hasFieldTrackingAccess(user.organizationId))) {
    return NextResponse.json(
      { error: "Field tracking is disabled" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const geoLat = Number(body.geoLat);
  const geoLng = Number(body.geoLng);
  const accuracyM = body.accuracyM != null ? Number(body.accuracyM) : null;
  const batteryPct = body.batteryPct != null ? Number(body.batteryPct) : null;
  const isMockLocation =
    body.isMockLocation === true
      ? true
      : body.isMockLocation === false
        ? false
        : null;

  try {
    const ping = await postFieldLocationPing({
      organizationId: user.organizationId,
      userId: user.id,
      geoLat,
      geoLng,
      accuracyM,
      batteryPct,
      isMockLocation,
    });
    return NextResponse.json({
      ping: {
        id: ping.id,
        geoLat: ping.geoLat,
        geoLng: ping.geoLng,
        recordedAt: ping.recordedAt.toISOString(),
        accuracyM: ping.accuracyM,
        batteryPct: ping.batteryPct,
        isMockLocation: ping.isMockLocation,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not post location ping.";
    const status = message.toLowerCase().includes("rate limited") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasWorkspaceModule(user, "HR")) {
    return NextResponse.json({ error: "HR access required" }, { status: 403 });
  }
  if (!(await hasFieldTrackingAccess(user.organizationId))) {
    return NextResponse.json(
      { error: "Field tracking is disabled" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const mine = url.searchParams.get("mine") === "1";
  const dateRaw = url.searchParams.get("date");
  const date = dateRaw ? new Date(`${dateRaw}T12:00:00.000Z`) : undefined;

  if (mine || !hasMinimumRole(user.role, "MANAGER")) {
    const trail = await listMyDayTrail(user.organizationId, user.id, date);
    return NextResponse.json({
      pings: trail.map((p) => ({
        id: p.id,
        userId: p.userId,
        geoLat: p.geoLat,
        geoLng: p.geoLng,
        recordedAt: p.recordedAt.toISOString(),
        accuracyM: p.accuracyM,
        batteryPct: p.batteryPct,
        isMockLocation: p.isMockLocation,
      })),
    });
  }

  const pings = await listTodayPings(user.organizationId);
  return NextResponse.json({
    pings: pings.map((p) => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name,
      userEmail: p.user.email,
      geoLat: p.geoLat,
      geoLng: p.geoLng,
      recordedAt: p.recordedAt.toISOString(),
      accuracyM: p.accuracyM,
      batteryPct: p.batteryPct,
      isMockLocation: p.isMockLocation,
    })),
  });
}
