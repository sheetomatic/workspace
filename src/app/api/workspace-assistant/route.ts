import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateWorkspaceAssistantReply,
  type WorkspaceAssistantMessage,
} from "@/lib/workspace-assistant/reply";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to Workspace to use Ask guide." },
      { status: 401 },
    );
  }

  const rate = await checkRateLimit(
    `workspace-assistant:${user.organizationId}:${user.id}`,
    30,
    60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: `Too many questions. Try again in ${rate.retryAfterSec}s.`,
      },
      { status: 429 },
    );
  }

  const status = getIntegrationStatus();
  if (!status.openai) {
    return NextResponse.json(
      {
        error:
          "Workspace help is temporarily unavailable. Try again shortly, or ask an Admin.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: WorkspaceAssistantMessage[] };
  try {
    body = (await request.json()) as { messages?: WorkspaceAssistantMessage[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content?.trim()) {
    return NextResponse.json(
      { error: "Ask a short question about using Workspace modules." },
      { status: 400 },
    );
  }
  if (last.content.trim().length < 2) {
    return NextResponse.json(
      { error: "Ask a short question about using Workspace modules." },
      { status: 400 },
    );
  }
  if (last.content.length > 1200) {
    return NextResponse.json(
      { error: "Please keep your question under 1200 characters." },
      { status: 400 },
    );
  }

  try {
    const result = await generateWorkspaceAssistantReply(messages);
    return NextResponse.json({
      reply: result.reply,
      links: result.links,
    });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Failed";
    if (raw === "OPENAI_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error:
            "Workspace help is temporarily unavailable. Try again shortly, or ask an Admin.",
        },
        { status: 503 },
      );
    }
    if (raw === "INVALID_MESSAGES") {
      return NextResponse.json(
        { error: "Ask a short question about using Workspace modules." },
        { status: 400 },
      );
    }
    if (raw.startsWith("OPENAI_ERROR:")) {
      return NextResponse.json(
        {
          error: "Could not answer right now. Try again in a moment.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        error: "Could not answer right now. Try again in a moment.",
      },
      { status: 502 },
    );
  }
}
