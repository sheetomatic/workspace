import { formatOpenAiError } from "@/lib/integrations/openai-errors";
import {
  AI_KNOWLEDGE_MAX_CONTENT_CHARS,
  AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS,
  AI_KNOWLEDGE_MIN_FAQ_QUESTION_CHARS,
  validateKnowledgeTextContent,
} from "@/lib/ai-knowledge-limits";

export type GeneratedFaq = {
  question: string;
  answer: string;
};

const DEFAULT_MAX_FAQS = 8;

function normalizeFaq(raw: unknown): GeneratedFaq | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const question =
    typeof record.question === "string" ? record.question.trim() : "";
  const answer = typeof record.answer === "string" ? record.answer.trim() : "";

  if (question.length < AI_KNOWLEDGE_MIN_FAQ_QUESTION_CHARS) {
    return null;
  }

  const answerCheck = validateKnowledgeTextContent(
    answer,
    AI_KNOWLEDGE_MIN_FAQ_ANSWER_CHARS,
  );
  if (!answerCheck.ok) {
    return null;
  }

  return { question, answer: answerCheck.text };
}

export async function generateFaqsFromTrainingContent(params: {
  content: string;
  sourceTitle: string;
  maxFaqs?: number;
}): Promise<
  { ok: true; faqs: GeneratedFaq[] } | { ok: false; message: string }
> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      message: "OpenAI is not configured. Add OPENAI_API_KEY to generate FAQs.",
    };
  }

  const content = params.content.trim().slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS);
  if (content.length < 80) {
    return {
      ok: false,
      message: "Not enough content to generate FAQs. Add more training text first.",
    };
  }

  const maxFaqs = Math.min(Math.max(params.maxFaqs ?? DEFAULT_MAX_FAQS, 3), 12);
  const model = process.env.OPENAI_KNOWLEDGE_MODEL ?? "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You create customer-facing FAQ pairs from business training content for a WhatsApp AI assistant.

Rules:
- Use ONLY facts from the provided content. Do not invent prices, policies, or features.
- Write questions the way customers ask on WhatsApp (clear, conversational).
- Answers must be complete but concise (under 500 characters when possible).
- Cover pricing, hours, services, delivery, support, policies, and contact details when present.
- Output JSON: { "faqs": [ { "question": "...", "answer": "..." } ] }
- Return between 3 and ${maxFaqs} FAQs. Skip topics not supported by the content.`,
        },
        {
          role: "user",
          content: `Source title: ${params.sourceTitle}\n\nContent:\n${content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      ok: false,
      message: formatOpenAiError(response.status, detail),
    };
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const rawContent = payload.choices?.[0]?.message?.content;
  if (!rawContent) {
    return { ok: false, message: "Could not generate FAQs. Try again." };
  }

  let parsed: { faqs?: unknown[] };
  try {
    parsed = JSON.parse(rawContent) as { faqs?: unknown[] };
  } catch {
    return { ok: false, message: "Could not parse generated FAQs. Try again." };
  }

  const faqs = (parsed.faqs ?? [])
    .map(normalizeFaq)
    .filter(Boolean) as GeneratedFaq[];

  const unique: GeneratedFaq[] = [];
  const seen = new Set<string>();
  for (const faq of faqs) {
    const key = faq.question.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(faq);
    if (unique.length >= maxFaqs) {
      break;
    }
  }

  if (unique.length === 0) {
    return {
      ok: false,
      message: "No valid FAQs could be generated from this content.",
    };
  }

  return { ok: true, faqs: unique };
}
