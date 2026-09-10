import { NATIVE_CLIP_SECONDS } from "@/lib/video/duration";
import { generateVeoClip, veoApiKey } from "@/lib/video/veo-client";

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

class VeoAdapter implements TextToVideoProvider {
  id = "veo";

  isConfigured() {
    return Boolean(veoApiKey());
  }

  maxClipSeconds() {
    return NATIVE_CLIP_SECONDS;
  }

  generateClip(input: GenerateClipInput): Promise<GeneratedClip> {
    if (!this.isConfigured()) {
      throw new Error(T2V_NOT_CONFIGURED);
    }
    return generateVeoClip({
      prompt: input.prompt,
      durationSec: input.durationSec,
    });
  }
}

/**
 * Live adapter only if a Veo / Gemini / Google generative-video key is already present.
 * OPENAI_API_KEY is not a T2V key. Do not add VEO_* / GEMINI_* as required in .env.example.
 */
export function resolveTextToVideoProvider(): TextToVideoProvider {
  if (veoApiKey()) {
    return new VeoAdapter();
  }
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
