import { afterEach, describe, expect, it } from "vitest";
import {
  assertFinalDurationSec,
  clampDurationSec,
  formatMmSs,
  MAX_OUTPUT_SECONDS,
  parseDurationFields,
  parseDurationSecInput,
} from "@/lib/video/duration";
import { isT2vConfigured, resolveTextToVideoProvider } from "@/lib/video/provider";
import { splitIntoClips } from "@/lib/video/split";
import { stitchClips } from "@/lib/video/stitch";
import {
  GENERATE_CLIP_TIMEOUT_MS,
  VIDEO_JOB_CLAIM_STALE_MS,
  withTimeout,
} from "@/lib/video/timeout";

describe("video duration clamp", () => {
  it("clamps 7200s to 10:00", () => {
    expect(clampDurationSec(7200)).toBe(MAX_OUTPUT_SECONDS);
    expect(formatMmSs(MAX_OUTPUT_SECONDS)).toBe("10:00");
  });

  it("uses one native clip when duration is omitted", () => {
    expect(clampDurationSec(null, 8)).toBe(8);
  });

  it("does not reject over-cap as invalid — parse stays ok", () => {
    expect(parseDurationSecInput(7200)).toEqual({ ok: true, requested: 7200 });
    expect(clampDurationSec(7200)).toBe(600);
  });

  it("rejects empty-equivalent zero duration", () => {
    expect(parseDurationSecInput(0).ok).toBe(false);
    expect(parseDurationFields(0, 0).ok).toBe(false);
    expect(parseDurationFields(null, null)).toEqual({ ok: true, requested: null });
  });

  it("fails if a final would exceed 10:00", () => {
    expect(() => assertFinalDurationSec(601)).toThrow(/10:00/);
    expect(assertFinalDurationSec(600)).toBe(600);
  });
});

describe("video clip split", () => {
  it("splits 10:00 into 75 Veo-class 8s clips", () => {
    const clips = splitIntoClips(600, 8);
    expect(clips).toHaveLength(75);
    expect(clips.every((sec) => sec === 8)).toBe(true);
    expect(clips.reduce((sum, sec) => sum + sec, 0)).toBe(600);
  });

  it("omitted duration is one clip", () => {
    expect(splitIntoClips(8, 8)).toEqual([8]);
  });
});

describe("pluggable T2V", () => {
  const originalOpenAi = process.env.OPENAI_API_KEY;

  afterEach(() => {
    if (originalOpenAi == null) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalOpenAi;
    }
  });

  it("is unconfigured without a T2V key, even if OpenAI is set", () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isT2vConfigured()).toBe(false);
    expect(resolveTextToVideoProvider().id).toBe("unconfigured");
  });

  it("does not invent Veo or Runway clients", () => {
    const provider = resolveTextToVideoProvider();
    expect(provider.id).not.toMatch(/veo|runway/i);
  });
});

describe("generateClip timeout", () => {
  it("rejects after the budget", async () => {
    await expect(
      withTimeout(new Promise(() => undefined), 20, "Video generation timed out."),
    ).rejects.toThrow("Video generation timed out.");
  });

  it("keeps claim and clip timeout inside the 60s cron budget", () => {
    expect(GENERATE_CLIP_TIMEOUT_MS).toBeLessThan(60_000);
    expect(VIDEO_JOB_CLAIM_STALE_MS).toBeLessThan(60_000);
  });
});

describe("stitch cap", () => {
  it("uses a single provider URL when there is one clip", () => {
    const result = stitchClips([
      { order: 0, durationSec: 8, providerUrl: "https://example.com/clip.mp4" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.finalUrl).toBe("https://example.com/clip.mp4");
      expect(result.durationSec).toBe(8);
    }
  });

  it("refuses a concat over 10:00", () => {
    const result = stitchClips([
      { order: 0, durationSec: 400, providerUrl: "https://a" },
      { order: 1, durationSec: 201, providerUrl: "https://b" },
    ]);
    expect(result.ok).toBe(false);
  });

  it("does not pretend a local mux exists without blob persist", () => {
    const result = stitchClips([
      { order: 0, durationSec: 8, providerUrl: "https://a" },
      { order: 1, durationSec: 8, providerUrl: "https://b" },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.notConfigured).toBe(true);
    }
  });
});
