import { NextResponse } from "next/server";
import { hasWorkspaceModule } from "@/lib/workspace-modules";
import { getSessionUser } from "@/lib/auth";
import { seedFleetDemo } from "@/lib/fleet/demo-seed";
import { hasMinimumRole } from "@/lib/permissions";

export async function POST() {
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
  const result = await seedFleetDemo(user.organizationId);
  return NextResponse.json(result);
}
