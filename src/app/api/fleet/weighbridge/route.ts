import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { recordWeighbridge } from "@/lib/fleet/ingest";
import { hasMinimumRole } from "@/lib/permissions";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Staff access required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    vehicleId?: string;
    kind?: "GROSS" | "TARE";
    weightKg?: number;
    recordedAt?: string;
  } | null;
  if (!body?.vehicleId || (body.kind !== "GROSS" && body.kind !== "TARE")) {
    return NextResponse.json({ error: "vehicleId and kind are required." }, { status: 400 });
  }
  const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date();
  if (Number.isNaN(recordedAt.getTime())) {
    return NextResponse.json({ error: "recordedAt is invalid." }, { status: 400 });
  }

  try {
    const trip = await recordWeighbridge({
      organizationId: user.organizationId,
      vehicleId: body.vehicleId,
      kind: body.kind,
      weightKg: Number(body.weightKg),
      recordedAt,
    });
    return NextResponse.json(trip);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weighbridge update failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
