import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { ingestTelemetryBatch, type SyncPointInput, type SyncSlipInput } from "@/lib/fleet/ingest";
import { hasMinimumRole } from "@/lib/permissions";

/**
 * Idempotent bulk sync for trucks that just left a dead zone.
 * Same clientEventId is stored once and does not open a second trip or alert.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  let body: { points?: SyncPointInput[]; slips?: SyncSlipInput[] };
  try {
    body = (await request.json()) as { points?: SyncPointInput[]; slips?: SyncSlipInput[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body.points)) {
    return NextResponse.json({ error: "points must be an array." }, { status: 400 });
  }

  try {
    const result = await ingestTelemetryBatch({
      organizationId: user.organizationId,
      points: body.points,
      slips: Array.isArray(body.slips) ? body.slips : [],
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
