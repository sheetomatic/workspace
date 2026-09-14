/** Hard cap: 10 minutes. Requests above this are clamped, never rejected. */
export const MAX_OUTPUT_SECONDS = 600;

/** Example-class native clip when duration is omitted (Veo-class ~8s). */
export const NATIVE_CLIP_SECONDS = 8;

export const MIN_PROMPT_LENGTH = 1;

export function formatMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export function parseDurationFields(
  minutes: number | null,
  seconds: number | null,
): { ok: true; requested: number | null } | { ok: false; error: string } {
  const hasMinutes = minutes != null && Number.isFinite(minutes);
  const hasSeconds = seconds != null && Number.isFinite(seconds);
  if (!hasMinutes && !hasSeconds) {
    return { ok: true, requested: null };
  }
  const m = hasMinutes ? Math.floor(minutes) : 0;
  const s = hasSeconds ? Math.floor(seconds) : 0;
  if (m < 0 || s < 0) {
    return { ok: false, error: "Duration must be greater than 0:00, or leave it blank." };
  }
  const total = m * 60 + s;
  if (total <= 0) {
    return { ok: false, error: "Duration must be greater than 0:00, or leave it blank." };
  }
  return { ok: true, requested: total };
}

/** Body `durationSec`: omit/null → one native clip. 0 / NaN / negative → invalid. */
export function parseDurationSecInput(
  raw: unknown,
): { ok: true; requested: number | null } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, requested: null };
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) {
    return { ok: false, error: "Duration must be a number of seconds." };
  }
  if (n <= 0) {
    return { ok: false, error: "Duration must be greater than 0:00, or leave it blank." };
  }
  return { ok: true, requested: Math.floor(n) };
}

export function clampDurationSec(
  requested: number | null,
  nativeClipSec: number = NATIVE_CLIP_SECONDS,
): number {
  const native = Math.min(Math.max(1, Math.floor(nativeClipSec)), MAX_OUTPUT_SECONDS);
  if (requested == null) {
    return native;
  }
  return Math.min(Math.floor(requested), MAX_OUTPUT_SECONDS);
}

export function assertFinalDurationSec(seconds: number): number {
  const n = Math.floor(seconds);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Final video duration is missing.");
  }
  if (n > MAX_OUTPUT_SECONDS) {
    throw new Error("Final video would exceed 10:00.");
  }
  return n;
}
