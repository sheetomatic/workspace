import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { transcribeAudioBuffer } from "@/lib/integrations/openai";
import {
  AI_SERVICE_UNAVAILABLE,
  mapOpenAiServiceError,
} from "@/lib/integrations/openai-messages";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { hasMinimumRole } from "@/lib/permissions";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = await checkRateLimit(
    `transcribe:${user.organizationId}:${user.id}`,
    20,
    60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Retry in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const status = getIntegrationStatus();
  if (!status.audio) {
    return NextResponse.json({ error: AI_SERVICE_UNAVAILABLE }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get("audio");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Missing audio recording." }, { status: 400 });
  }

  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Recording is too large." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "audio/webm";

  try {
    const text = await transcribeAudioBuffer(buffer, mimeType);
    return NextResponse.json({ text });
  } catch (error) {
    const raw =
      error instanceof Error
        ? error.message
        : "Transcription failed. Try recording again or type the task.";
    const message = mapOpenAiServiceError(raw);
    const status =
      message.includes("OPENAI_NOT_CONFIGURED") ||
      message.includes("quota") ||
      message.includes("billing")
        ? 503
        : message.includes("too short") || message.includes("No speech")
          ? 400
          : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
