import { formatOpenAiError } from "@/lib/integrations/openai-errors";
import { SITE_ASSISTANT_SYSTEM_PROMPT } from "@/lib/site-assistant/knowledge";

export type SiteAssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

export type SiteAssistantLink = {
  label: string;
  href: string;
};

export type SiteAssistantReply = {
  reply: string;
  links: SiteAssistantLink[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

const MAX_HISTORY = 8;
const MAX_CONTENT_CHARS = 1200;

function sanitizeHistory(messages: SiteAssistantMessage[]): SiteAssistantMessage[] {
  return messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({
      role: m.role,
      content: m.content.trim().slice(0, MAX_CONTENT_CHARS),
    }));
}

function parseLinks(raw: unknown): SiteAssistantLink[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: SiteAssistantLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const href = String((item as { href?: unknown }).href ?? "").trim();
    if (!label || !href) continue;
    if (
      !(
        href.startsWith("/") ||
        href.startsWith("https://workspace.") ||
        href.startsWith("https://wa.me/") ||
        href.startsWith("https://calendar.") ||
        href.startsWith("https://sheetomatic.")
      )
    ) {
      continue;
    }
    out.push({ label: label.slice(0, 60), href: href.slice(0, 300) });
    if (out.length >= 4) break;
  }
  return out;
}

export async function generateSiteAssistantReply(
  messages: SiteAssistantMessage[],
): Promise<SiteAssistantReply> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const history = sanitizeHistory(messages);
  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    throw new Error("INVALID_MESSAGES");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TASK_MODEL ?? "gpt-4o-mini",
      temperature: 0.35,
      max_tokens: 500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SITE_ASSISTANT_SYSTEM_PROMPT },
        ...history,
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OPENAI_ERROR:${formatOpenAiError(response.status, detail)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OPENAI_EMPTY");
  }

  let parsed: { reply?: unknown; links?: unknown };
  try {
    parsed = JSON.parse(content) as { reply?: unknown; links?: unknown };
  } catch {
    throw new Error("OPENAI_EMPTY");
  }

  const reply =
    typeof parsed.reply === "string" ? parsed.reply.trim() : content.trim();
  if (!reply) {
    throw new Error("OPENAI_EMPTY");
  }

  return {
    reply: reply.slice(0, 2500),
    links: parseLinks(parsed.links),
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
  };
}
