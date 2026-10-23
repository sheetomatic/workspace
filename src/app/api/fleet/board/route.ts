import { NextResponse } from "next/server";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getSessionUser } from "@/lib/auth";
import { getFleetBoard } from "@/lib/fleet/board";
import { hasMinimumRole } from "@/lib/permissions";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasWorkspaceModule(user, "FLEET")) {
    return NextResponse.json({ error: "Fleet access required" }, { status: 403 });
  }
  if (!hasMinimumRole(user.role, "MANAGER")) {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }
  const board = await getFleetBoard(user.organizationId);
  return NextResponse.json(board);
}
