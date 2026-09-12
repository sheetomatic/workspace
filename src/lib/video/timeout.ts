/** Stay inside the Vercel cron maxDuration of 60s. */
export const GENERATE_CLIP_TIMEOUT_MS = 45_000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message = "Video generation timed out.",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/** Stale lease so a crashed tick can be retried. Must be < 60s function budget. */
export const VIDEO_JOB_CLAIM_STALE_MS = 50_000;
