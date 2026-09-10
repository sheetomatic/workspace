import { NATIVE_CLIP_SECONDS } from "@/lib/video/duration";

const T2V_NOT_CONFIGURED = "T2V_NOT_CONFIGURED";
const T2V_ERROR_PREFIX = "T2V_ERROR:";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "veo-3.1-generate-preview";
const POLL_INTERVAL_MS = 5_000;

/** Veo 3.1 legal clip lengths (seconds). */
const LEGAL_DURATIONS = [4, 6, 8] as const;

export function veoApiKey(): string | null {
  const key = (
    process.env.VEO_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  );
  return key || null;
}

export function isVeoFileUri(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === "generativelanguage.googleapis.com";
  } catch {
    return false;
  }
}

export function snapVeoDurationSeconds(requested: number): (typeof LEGAL_DURATIONS)[number] {
  const n = Math.max(1, Math.floor(requested));
  if (n <= 4) return 4;
  if (n <= 6) return 6;
  return 8;
}

function veoModel(): string {
  return process.env.VEO_MODEL?.trim() || DEFAULT_MODEL;
}

function fail(message: string): never {
  throw new Error(`${T2V_ERROR_PREFIX}${message}`);
}

function googleErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const error = (payload as { error?: { message?: unknown } }).error;
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message.trim();
  }
  const opError = (payload as { error?: { message?: unknown } }).error;
  if (typeof opError?.message === "string" && opError.message.trim()) {
    return opError.message.trim();
  }
  return fallback;
}

async function geminiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const key = veoApiKey();
  if (!key) {
    throw new Error(T2V_NOT_CONFIGURED);
  }
  const url = path.startsWith("http") ? path : `${GEMINI_BASE}/${path.replace(/^\//, "")}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      "x-goog-api-key": key,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = null;
    }
  }
  if (!response.ok) {
    fail(googleErrorMessage(json, `Veo request failed (${response.status}).`));
  }
  return json;
}

function sampleVideoUri(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const response = (payload as {
    response?: {
      generateVideoResponse?: {
        generatedSamples?: Array<{ video?: { uri?: string } }>;
        raiMediaFilteredReasons?: string[];
      };
      generatedVideos?: Array<{ video?: { uri?: string } }>;
    };
  }).response;
  const reasons = response?.generateVideoResponse?.raiMediaFilteredReasons;
  if (Array.isArray(reasons) && reasons.length > 0) {
    fail("The provider could not generate that prompt. Try a different description.");
  }
  const uri =
    response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
    response?.generatedVideos?.[0]?.video?.uri ||
    null;
  return typeof uri === "string" && uri.trim() ? uri.trim() : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateVeoClip(input: {
  prompt: string;
  durationSec: number;
}): Promise<{ providerClipId: string; url: string; durationSec: number }> {
  const key = veoApiKey();
  if (!key) {
    throw new Error(T2V_NOT_CONFIGURED);
  }

  const durationSec = snapVeoDurationSeconds(input.durationSec || NATIVE_CLIP_SECONDS);
  const model = veoModel();
  const started = (await geminiFetch(`models/${model}:predictLongRunning`, {
    method: "POST",
    body: JSON.stringify({
      instances: [{ prompt: input.prompt }],
      parameters: {
        aspectRatio: "16:9",
        durationSeconds: durationSec,
        sampleCount: 1,
      },
    }),
  })) as { name?: string; done?: boolean; error?: { message?: string } };

  const operationName = typeof started.name === "string" ? started.name.trim() : "";
  if (!operationName) {
    fail("Veo did not return an operation id.");
  }

  let current: unknown = started;
  while (true) {
    const done = Boolean((current as { done?: boolean }).done);
    if (done) {
      const opError = (current as { error?: { message?: string } }).error;
      if (opError?.message) {
        fail(opError.message);
      }
      const url = sampleVideoUri(current);
      if (!url) {
        fail("Veo finished without a video URI.");
      }
      return { providerClipId: operationName, url, durationSec };
    }
    await sleep(POLL_INTERVAL_MS);
    current = await geminiFetch(operationName);
  }
}

export async function downloadVeoFile(url: string): Promise<{
  body: ReadableStream<Uint8Array> | null;
  contentType: string;
  status: number;
}> {
  const key = veoApiKey();
  if (!key) {
    throw new Error(T2V_NOT_CONFIGURED);
  }
  const response = await fetch(url, {
    headers: { "x-goog-api-key": key },
    redirect: "follow",
  });
  return {
    body: response.body,
    contentType: response.headers.get("content-type") || "video/mp4",
    status: response.status,
  };
}
