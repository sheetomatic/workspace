import { MAX_OUTPUT_SECONDS } from "@/lib/video/duration";

/**
 * Split an effective duration into provider-legal clip lengths.
 * Sum never exceeds 10:00. Never a single unbounded model duration= for the film.
 */
export function splitIntoClips(
  effectiveDurationSec: number,
  maxClipSeconds: number,
): number[] {
  const maxClip = Math.max(1, Math.floor(maxClipSeconds));
  let remaining = Math.min(
    Math.max(0, Math.floor(effectiveDurationSec)),
    MAX_OUTPUT_SECONDS,
  );
  const clips: number[] = [];
  while (remaining > 0) {
    const next = Math.min(maxClip, remaining);
    clips.push(next);
    remaining -= next;
  }
  return clips;
}
