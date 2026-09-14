import type { VideoClip, VideoClipStatus, VideoJob, VideoJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertFinalDurationSec,
  clampDurationSec,
  MAX_OUTPUT_SECONDS,
} from "@/lib/video/duration";
import { VIDEO_UNAVAILABLE, mapVideoServiceError } from "@/lib/video/messages";
import {
  isT2vConfigured,
  isT2vNotConfiguredError,
  resolveTextToVideoProvider,
  t2vErrorMessage,
  type TextToVideoProvider,
} from "@/lib/video/provider";
import { splitIntoClips } from "@/lib/video/split";
import { stitchClips } from "@/lib/video/stitch";
import {
  GENERATE_CLIP_TIMEOUT_MS,
  VIDEO_JOB_CLAIM_STALE_MS,
  withTimeout,
} from "@/lib/video/timeout";

const JOB_INCLUDE = {
  clips: { orderBy: { order: "asc" as const } },
} as const;

export type VideoJobWithClips = VideoJob & { clips: VideoClip[] };

export type VideoJobDto = {
  id: string;
  prompt: string;
  requestedDurationSec: number | null;
  effectiveDurationSec: number;
  status: "queued" | "running" | "succeeded" | "failed" | "not_configured";
  error: string | null;
  finalUrl: string | null;
  finalDurationSec: number | null;
  createdAt: string;
  clipDone: number;
  clipTotal: number;
};

function toUiStatus(status: VideoJobStatus): VideoJobDto["status"] {
  switch (status) {
    case "QUEUED":
      return "queued";
    case "RUNNING":
      return "running";
    case "SUCCEEDED":
      return "succeeded";
    case "FAILED":
      return "failed";
    case "NOT_CONFIGURED":
      return "not_configured";
  }
}

export function serializeVideoJob(job: VideoJobWithClips): VideoJobDto {
  const clipDone = job.clips.filter((clip) => clip.status === "SUCCEEDED").length;
  return {
    id: job.id,
    prompt: job.prompt,
    requestedDurationSec: job.requestedDurationSec,
    effectiveDurationSec: job.effectiveDurationSec,
    status: toUiStatus(job.status),
    error: job.error ? mapVideoServiceError(job.error) : null,
    finalUrl:
      job.status === "SUCCEEDED" && job.finalUrl
        ? `/api/video/jobs/${job.id}/media`
        : null,
    finalDurationSec: job.finalDurationSec,
    createdAt: job.createdAt.toISOString(),
    clipDone,
    clipTotal: job.clips.length,
  };
}

export async function listVideoJobs(organizationId: string, take = 30) {
  const jobs = await prisma.videoJob.findMany({
    where: { organizationId },
    include: JOB_INCLUDE,
    orderBy: { createdAt: "desc" },
    take,
  });
  return jobs.map(serializeVideoJob);
}

export async function getVideoJob(organizationId: string, id: string) {
  const job = await prisma.videoJob.findFirst({
    where: { id, organizationId },
    include: JOB_INCLUDE,
  });
  return job ? serializeVideoJob(job) : null;
}

export async function createVideoJob(input: {
  organizationId: string;
  userId: string;
  prompt: string;
  requestedDurationSec: number | null;
}): Promise<{ job: VideoJobDto; configured: boolean }> {
  const provider = resolveTextToVideoProvider();
  const effectiveDurationSec = clampDurationSec(
    input.requestedDurationSec,
    provider.maxClipSeconds(),
  );
  const configured = provider.isConfigured();

  if (!configured) {
    const job = await prisma.videoJob.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        prompt: input.prompt,
        requestedDurationSec: input.requestedDurationSec,
        effectiveDurationSec,
        status: "NOT_CONFIGURED",
        error: VIDEO_UNAVAILABLE,
      },
      include: JOB_INCLUDE,
    });
    return { job: serializeVideoJob(job), configured: false };
  }

  const clipDurations = splitIntoClips(
    effectiveDurationSec,
    provider.maxClipSeconds(),
  );

  const job = await prisma.videoJob.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      prompt: input.prompt,
      requestedDurationSec: input.requestedDurationSec,
      effectiveDurationSec,
      status: "QUEUED",
      clips: {
        create: clipDurations.map((durationSec, order) => ({
          order,
          durationSec,
          status: "PENDING" satisfies VideoClipStatus,
        })),
      },
    },
    include: JOB_INCLUDE,
  });

  return { job: serializeVideoJob(job), configured: true };
}

async function failJob(jobId: string, error: string) {
  await prisma.videoJob.update({
    where: { id: jobId },
    data: { status: "FAILED", error, claimedAt: null },
  });
}

async function finishStitch(job: VideoJobWithClips) {
  const succeeded = job.clips.filter((clip) => clip.status === "SUCCEEDED");
  if (succeeded.length !== job.clips.length || job.clips.length === 0) {
    return;
  }

  const stitch = stitchClips(succeeded);
  if (!stitch.ok) {
    await prisma.videoJob.update({
      where: { id: job.id },
      data: {
        status: stitch.notConfigured ? "NOT_CONFIGURED" : "FAILED",
        error: stitch.error,
        claimedAt: null,
      },
    });
    return;
  }

  let finalDurationSec: number;
  try {
    finalDurationSec = assertFinalDurationSec(stitch.durationSec);
  } catch (error) {
    await failJob(
      job.id,
      error instanceof Error ? error.message : "Final video would exceed 10:00.",
    );
    return;
  }

  await prisma.videoJob.update({
    where: { id: job.id },
    data: {
      status: "SUCCEEDED",
      error: null,
      finalUrl: stitch.finalUrl,
      finalStorageKey: stitch.finalStorageKey,
      finalDurationSec,
      claimedAt: null,
    },
  });
}

export async function claimVideoJob(jobId: string, now = new Date()) {
  const staleBefore = new Date(now.getTime() - VIDEO_JOB_CLAIM_STALE_MS);
  const result = await prisma.videoJob.updateMany({
    where: {
      id: jobId,
      status: { in: ["QUEUED", "RUNNING"] },
      OR: [{ claimedAt: null }, { claimedAt: { lt: staleBefore } }],
    },
    data: { status: "RUNNING", claimedAt: now, error: null },
  });
  return result.count === 1;
}

async function claimNextClip(jobId: string, clipId: string) {
  const result = await prisma.videoClip.updateMany({
    where: { id: clipId, jobId, status: "PENDING" },
    data: { status: "PROCESSING" },
  });
  return result.count === 1;
}

async function generateNextClip(
  job: VideoJobWithClips,
  provider: TextToVideoProvider,
) {
  await prisma.videoClip.updateMany({
    where: { jobId: job.id, status: "PROCESSING" },
    data: { status: "PENDING" },
  });

  const next = [...job.clips]
    .filter((clip) => clip.status === "PENDING" || clip.status === "PROCESSING")
    .sort((a, b) => a.order - b.order)[0];
  if (!next) {
    const refreshed = await prisma.videoJob.findFirst({
      where: { id: job.id },
      include: JOB_INCLUDE,
    });
    if (refreshed) {
      await finishStitch(refreshed);
    }
    return;
  }

  const claimedClip = await claimNextClip(job.id, next.id);
  if (!claimedClip) {
    return;
  }

  const succeededSoFar = job.clips
    .filter((clip) => clip.status === "SUCCEEDED")
    .reduce((sum, clip) => sum + clip.durationSec, 0);
  const remainingCap = MAX_OUTPUT_SECONDS - succeededSoFar;
  if (remainingCap <= 0) {
    await prisma.videoClip.update({
      where: { id: next.id },
      data: { status: "FAILED" },
    });
    await failJob(job.id, "Final video would exceed 10:00.");
    return;
  }

  try {
    const generated = await withTimeout(
      provider.generateClip({
        prompt: job.prompt,
        durationSec: Math.min(next.durationSec, remainingCap),
        jobId: job.id,
        clipIndex: next.order,
      }),
      GENERATE_CLIP_TIMEOUT_MS,
    );
    if (generated.durationSec > remainingCap) {
      await prisma.videoClip.update({
        where: { id: next.id },
        data: { status: "FAILED" },
      });
      await failJob(job.id, "Final video would exceed 10:00.");
      return;
    }

    const durationSec = Math.min(
      generated.durationSec,
      next.durationSec,
      remainingCap,
    );

    await prisma.videoClip.update({
      where: { id: next.id },
      data: {
        status: "SUCCEEDED",
        providerClipId: generated.providerClipId,
        providerUrl: generated.url,
        durationSec,
      },
    });

    const refreshed = await prisma.videoJob.findFirst({
      where: { id: job.id },
      include: JOB_INCLUDE,
    });
    if (refreshed) {
      const stillOpen = refreshed.clips.some(
        (clip) => clip.status === "PENDING" || clip.status === "PROCESSING",
      );
      if (!stillOpen) {
        await finishStitch(refreshed);
      }
    }
  } catch (error) {
    await prisma.videoClip.update({
      where: { id: next.id },
      data: { status: "FAILED" },
    });
    if (isT2vNotConfiguredError(error)) {
      await prisma.videoJob.update({
        where: { id: job.id },
        data: {
          status: "NOT_CONFIGURED",
          error: VIDEO_UNAVAILABLE,
          claimedAt: null,
        },
      });
      return;
    }
    await failJob(job.id, t2vErrorMessage(error));
  }
}

/** One clip per claimed job per tick — stays inside the 60s serverless budget. */
export async function processVideoJobs(batch = 3) {
  const jobs = await prisma.videoJob.findMany({
    where: { status: { in: ["QUEUED", "RUNNING"] } },
    include: JOB_INCLUDE,
    orderBy: { createdAt: "asc" },
    take: batch,
  });

  let processed = 0;
  for (const job of jobs) {
    if (!isT2vConfigured()) {
      await prisma.videoJob.updateMany({
        where: { id: job.id, status: { in: ["QUEUED", "RUNNING"] } },
        data: {
          status: "NOT_CONFIGURED",
          error: VIDEO_UNAVAILABLE,
          claimedAt: null,
        },
      });
      processed += 1;
      continue;
    }

    const claimed = await claimVideoJob(job.id);
    if (!claimed) {
      continue;
    }

    const provider = resolveTextToVideoProvider();
    await generateNextClip(job, provider);
    await prisma.videoJob.updateMany({
      where: { id: job.id, status: "RUNNING" },
      data: { claimedAt: null },
    });
    processed += 1;
  }

  return { processed, jobs: jobs.length };
}
