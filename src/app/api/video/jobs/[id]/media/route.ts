import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { downloadVeoFile, isVeoFileUri } from "@/lib/video/veo-client";

/**
 * Tenant-scoped playback/download. Never findUnique({ id }) alone.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await prisma.videoJob.findFirst({
    where: { id, organizationId: user.organizationId },
    select: {
      status: true,
      finalUrl: true,
      finalDurationSec: true,
    },
  });

  if (!job || job.status !== "SUCCEEDED" || !job.finalUrl) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (job.finalDurationSec != null && job.finalDurationSec > 600) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (isVeoFileUri(job.finalUrl)) {
    try {
      const file = await downloadVeoFile(job.finalUrl);
      if (!file.body || file.status >= 400) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return new NextResponse(file.body, {
        status: 200,
        headers: {
          "Content-Type": file.contentType,
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  return NextResponse.redirect(job.finalUrl, 302);
}
