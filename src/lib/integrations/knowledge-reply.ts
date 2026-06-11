import { formatOpenAiError } from "@/lib/integrations/openai-errors";
import { getActiveKnowledgeContext } from "@/lib/ai-knowledge-store";
import { checkRateLimit } from "@/lib/rate-limit";

const AI_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Daily cap on AI-generated WhatsApp replies per organization (cost guard). */
function aiReplyDailyOrgLimit() {
  const raw = Number(process.env.AI_REPLY_DAILY_ORG_LIMIT ?? "300");
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 300;
}

export type KnowledgeReplyResult = {
  text: string;
  confidence: number;
  sourceTitles: string[];
  handoff: boolean;
};

function formatKnowledgeBlock(
  items: Awaited<ReturnType<typeof getActiveKnowledgeContext>>,
) {
  return items
    .map((item, index) => {
      const header = `[${index + 1}] ${item.title} (${item.type})`;
      if (item.type === "FAQ" && item.question) {
        return `${header}\nQ: ${item.question}\nA: ${item.content}`;
      }
      if (item.sourceUrl) {
        return `${header}\nURL: ${item.sourceUrl}\n${item.content}`;
      }
      return `${header}\n${item.content}`;
    })
    .join("\n\n---\n\n");
}

export async function generateKnowledgeReply(params: {
  organizationId: string;
  organizationName: string;
  customerMessage: string;
  customerName?: string | null;
}): Promise<KnowledgeReplyResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      text: "Thanks for your message. Our team will reply shortly.",
      confidence: 0,
      sourceTitles: [],
      handoff: true,
    };
  }

  const rate = await checkRateLimit(
    `ai-reply:${params.organizationId}`,
    aiReplyDailyOrgLimit(),
    AI_REPLY_WINDOW_MS,
  );
  if (!rate.allowed) {
    console.warn(
      `[knowledge-reply] daily AI reply cap reached for org ${params.organizationId}`,
    );
    return {
      text: "Thanks for your message. Our team will reply shortly.",
      confidence: 0,
      sourceTitles: [],
      handoff: true,
    };
  }

  const items = await getActiveKnowledgeContext(params.organizationId);
  if (items.length === 0) {
    return {
      text: "Thanks for reaching out! A team member will get back to you shortly.",
      confidence: 0,
      sourceTitles: [],
      handoff: true,
    };
  }

  const knowledge = formatKnowledgeBlock(items);
  const customerLabel = params.customerName?.trim() || "Customer";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_KNOWLEDGE_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the WhatsApp assistant for ${params.organizationName}.

Answer customer questions using ONLY the approved knowledge base below.
Rules:
- Reply in the same language the customer used (English, Hindi, Hinglish, Tamil, etc.).
- Keep replies concise for WhatsApp (under 600 characters when possible).
- Use friendly, professional tone.
- If the answer is not in the knowledge base, set handoff true and reply that a human will follow up.
- Never invent prices, policies, or features not in the knowledge base.
- Cite source titles you used in sourceTitles array.

Output JSON:
{
  "reply": "your WhatsApp message",
  "confidence": 0.0 to 1.0,
  "sourceTitles": ["title1"],
  "handoff": false
}

Knowledge base:
${knowledge}`,
        },
        {
          role: "user",
          content: `${customerLabel}: ${params.customerMessage}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(formatOpenAiError(response.status, detail));
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OPENAI_EMPTY");
  }

  const parsed = JSON.parse(content) as {
    reply?: string;
    confidence?: number;
    sourceTitles?: string[];
    handoff?: boolean;
  };

  const text =
    typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim()
      : "Thanks for your message. Our team will reply shortly.";

  const confidence =
    typeof parsed.confidence === "number"
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

  const sourceTitles = Array.isArray(parsed.sourceTitles)
    ? parsed.sourceTitles.filter((item): item is string => typeof item === "string")
    : [];

  return {
    text,
    confidence,
    sourceTitles,
    handoff: Boolean(parsed.handoff) || confidence < 0.45,
  };
}
