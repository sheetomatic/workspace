import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { getVideoJob } from "@/lib/video/jobs";
import { isT2vConfigured } from "@/lib/video/provider";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await getVideoJob(user.organizationId, id);
  if (!job) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ configured: isT2vConfigured(), job });
}
