import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { escalateFleetAlert } from "@/lib/fleet/board";
import { hasMinimumRole } from "@/lib/permissions";

/** Marks the alert for WhatsApp / SMS handoff and returns the message text. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { alertId?: string } | null;
  if (!body?.alertId) {
    return NextResponse.json({ error: "alertId is required." }, { status: 400 });
  }
  const alert = await escalateFleetAlert(user.organizationId, body.alertId);
  if (!alert) {
    return NextResponse.json({ error: "Alert not found." }, { status: 404 });
  }
  return NextResponse.json(alert);
}
