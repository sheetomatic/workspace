import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseDurationSecInput } from "@/lib/video/duration";
import { createVideoJob, listVideoJobs } from "@/lib/video/jobs";
import { mapVideoServiceError, VIDEO_UNAVAILABLE } from "@/lib/video/messages";
import { isT2vConfigured } from "@/lib/video/provider";
import { checkVideoOrgQuota } from "@/lib/video/quota";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await listVideoJobs(user.organizationId);
  return NextResponse.json({
    configured: isT2vConfigured(),
    jobs,
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "STAFF")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await checkRateLimit(
    `video:${user.organizationId}:${user.id}`,
    5,
    60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const quota = await checkVideoOrgQuota(user.organizationId);
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message }, { status: 429 });
  }

  let body: { prompt?: unknown; durationSec?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown; durationSec?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return NextResponse.json(
      { error: "Describe the video you want." },
      { status: 400 },
    );
  }

  const duration = parseDurationSecInput(body.durationSec);
  if (!duration.ok) {
    return NextResponse.json({ error: duration.error }, { status: 400 });
  }

  try {
    const { job, configured } = await createVideoJob({
      organizationId: user.organizationId,
      userId: user.id,
      prompt,
      requestedDurationSec: duration.requested,
    });

    if (!configured) {
      return NextResponse.json(
        { error: VIDEO_UNAVAILABLE, job },
        { status: 503 },
      );
    }

    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Could not start the video job.";
    return NextResponse.json(
      { error: mapVideoServiceError(raw) },
      { status: 502 },
    );
  }
}
