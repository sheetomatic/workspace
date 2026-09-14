import { spawnSync } from "node:child_process";
import { assertFinalDurationSec, MAX_OUTPUT_SECONDS } from "@/lib/video/duration";

export type StitchClip = {
  order: number;
  durationSec: number;
  providerUrl: string | null;
};

export type StitchResult =
  | { ok: true; finalUrl: string | null; finalStorageKey: string | null; durationSec: number }
  | { ok: false; notConfigured: boolean; error: string };

export function ffmpegBinary(): string | null {
  const fromEnv = process.env.FFMPEG_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  try {
    const which = spawnSync("which", ["ffmpeg"], { encoding: "utf8" });
    if (which.status === 0) {
      const path = which.stdout.trim();
      return path || null;
    }
  } catch {
    return null;
  }
  return null;
}

/** v1: no S3/R2/BLOB in .env.example — do not require a missing object-store key. */
export function isDurableBlobConfigured(): boolean {
  return false;
}

export function plannedDurationSec(clips: StitchClip[]): number {
  return clips.reduce((sum, clip) => sum + clip.durationSec, 0);
}

export function stitchClips(clips: StitchClip[]): StitchResult {
  const ordered = [...clips].sort((a, b) => a.order - b.order);
  if (ordered.length === 0) {
    return { ok: false, notConfigured: false, error: "No clips to stitch." };
  }

  let durationSec: number;
  try {
    durationSec = assertFinalDurationSec(plannedDurationSec(ordered));
  } catch (error) {
    return {
      ok: false,
      notConfigured: false,
      error: error instanceof Error ? error.message : "Final video would exceed 10:00.",
    };
  }

  if (durationSec > MAX_OUTPUT_SECONDS) {
    return { ok: false, notConfigured: false, error: "Final video would exceed 10:00." };
  }

  const urls = ordered.map((clip) => clip.providerUrl).filter((url): url is string => Boolean(url));

  if (ordered.length === 1 && urls[0]) {
    return {
      ok: true,
      finalUrl: urls[0],
      finalStorageKey: null,
      durationSec,
    };
  }

  if (ffmpegBinary() && isDurableBlobConfigured()) {
    return {
      ok: false,
      notConfigured: true,
      error: "Video storage is not configured on this workspace.",
    };
  }

  return {
    ok: false,
    notConfigured: true,
    error: "Video stitching is not configured on this workspace.",
  };
}
