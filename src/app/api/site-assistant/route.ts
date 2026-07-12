import { NextResponse } from "next/server";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  generateSiteAssistantReply,
  type SiteAssistantMessage,
} from "@/lib/site-assistant/reply";

export const runtime = "nodejs";

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `site-assistant:${ip}`;
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(clientKey(request), 20, 60_000);
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
          "Ask Sheetomatic is temporarily unavailable. Please use Contact or WhatsApp instead.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: SiteAssistantMessage[] };
  try {
    body = (await request.json()) as { messages?: SiteAssistantMessage[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user" || !last.content?.trim()) {
    return NextResponse.json(
      { error: "Ask a short question about Sheetomatic." },
      { status: 400 },
    );
  }
  if (last.content.trim().length < 2) {
    return NextResponse.json(
      { error: "Ask a short question about Sheetomatic." },
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
    const result = await generateSiteAssistantReply(messages);
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
            "Ask Sheetomatic is temporarily unavailable. Please use Contact or WhatsApp instead.",
        },
        { status: 503 },
      );
    }
    if (raw === "INVALID_MESSAGES") {
      return NextResponse.json(
        { error: "Ask a short question about Sheetomatic." },
        { status: 400 },
      );
    }
    if (raw.startsWith("OPENAI_ERROR:")) {
      return NextResponse.json(
        {
          error:
            "Could not answer right now. Try again, or reach us on Contact / WhatsApp.",
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      {
        error:
          "Could not answer right now. Try again, or reach us on Contact / WhatsApp.",
      },
      { status: 502 },
    );
  }
}
