import { NATIVE_CLIP_SECONDS } from "@/lib/video/duration";

export const T2V_NOT_CONFIGURED = "T2V_NOT_CONFIGURED";
export const T2V_ERROR_PREFIX = "T2V_ERROR:";

export type GenerateClipInput = {
  prompt: string;
  durationSec: number;
  jobId: string;
  clipIndex: number;
};

export type GeneratedClip = {
  providerClipId: string;
  url: string | null;
  durationSec: number;
};

export type ConcatClipsInput = {
  prompt: string;
  clipUrls: string[];
  durationSec: number;
};

/**
 * Pluggable text-to-video port.
 * Example-class providers (docs only until a key already exists in env): Veo, Runway.
 * Do not construct those adapters unless their key is already present.
 * OPENAI_API_KEY is not a T2V key — never call DALL-E or chat/completions as video.
 */
export interface TextToVideoProvider {
  id: string;
  isConfigured(): boolean;
  maxClipSeconds(): number;
  generateClip(input: GenerateClipInput): Promise<GeneratedClip>;
  concatClips?(input: ConcatClipsInput): Promise<{
    url: string;
    durationSec: number;
  }>;
}

class UnconfiguredT2vProvider implements TextToVideoProvider {
  id = "unconfigured";

  isConfigured() {
    return false;
  }

  maxClipSeconds() {
    return NATIVE_CLIP_SECONDS;
  }

  async generateClip(): Promise<GeneratedClip> {
    throw new Error(T2V_NOT_CONFIGURED);
  }
}

const unconfigured = new UnconfiguredT2vProvider();

/**
 * Live adapter only if an env var already present in this environment selects one.
 * Today none do: .env.example has no RUNWAY_* / VEO_* / video-vendor key.
 * Do not add those keys as required.
 */
export function resolveTextToVideoProvider(): TextToVideoProvider {
  // Example-class (not committed; do not require these keys):
  // if (process.env.VEO_API_KEY?.trim()) return new VeoAdapter()
  // if (process.env.RUNWAY_API_KEY?.trim()) return new RunwayAdapter()
  return unconfigured;
}

export function isT2vConfigured(): boolean {
  return resolveTextToVideoProvider().isConfigured();
}

export function isT2vNotConfiguredError(error: unknown): boolean {
  return error instanceof Error && error.message === T2V_NOT_CONFIGURED;
}

export function t2vErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Video generation failed.";
  }
  if (error.message.startsWith(T2V_ERROR_PREFIX)) {
    return error.message.slice(T2V_ERROR_PREFIX.length).trim() || "Video generation failed.";
  }
  return error.message;
}
