import { prisma } from "@/lib/db";

type RateLimitResult = { allowed: boolean; retryAfterSec: number };

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = memoryBuckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

/** Serverless-safe rate limit backed by Postgres (falls back to memory in dev). */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL) {
    return checkRateLimitMemory(key, limit, windowMs);
  }

  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);

  try {
    const existing = await prisma.rateLimitBucket.findUnique({
      where: { key },
    });

    if (!existing || existing.resetAt <= now) {
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      });
      return { allowed: true, retryAfterSec: 0 };
    }

    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(
          1,
          Math.ceil((existing.resetAt.getTime() - now.getTime()) / 1000),
        ),
      };
    }

    await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    });
    return { allowed: true, retryAfterSec: 0 };
  } catch {
    return checkRateLimitMemory(key, limit, windowMs);
  }
}
