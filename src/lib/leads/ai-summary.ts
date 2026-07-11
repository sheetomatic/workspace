import { formatOpenAiError } from "@/lib/integrations/openai-errors";

export type LeadAiSummaryInput = {
  name: string | null;
  company: string | null;
  phone: string | null;
  email: string | null;
  requirement: string | null;
  discussionNotes: string | null;
  meetingNotes: string | null;
  category: string | null;
  status: string;
  pipeValue: string | number | null;
  quotationValue: string | number | null;
  temperature: string | null;
  score: number | null;
  sourceDetail: string | null;
  campaign: string | null;
};

export type LeadAiSummaryResult = {
  summary: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
};

/**
 * Short qualification blurb: need, budget signals, next action.
 * Uses gpt-4o-mini; throws OPENAI_NOT_CONFIGURED / OPENAI_ERROR / OPENAI_EMPTY.
 */
export async function generateLeadQualificationSummary(
  lead: LeadAiSummaryInput,
): Promise<LeadAiSummaryResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const context = [
    `Name: ${lead.name ?? "—"}`,
    `Company: ${lead.company ?? "—"}`,
    `Phone: ${lead.phone ?? "—"}`,
    `Email: ${lead.email ?? "—"}`,
    `Status: ${lead.status}`,
    `Category: ${lead.category ?? "—"}`,
    `Score/temp: ${lead.score ?? "—"} / ${lead.temperature ?? "—"}`,
    `Pipe value: ${lead.pipeValue ?? "—"}`,
    `Quoted: ${lead.quotationValue ?? "—"}`,
    `Source: ${lead.sourceDetail ?? "—"}`,
    `Campaign: ${lead.campaign ?? "—"}`,
    `Requirement: ${lead.requirement ?? "—"}`,
    `Discussion: ${lead.discussionNotes ?? "—"}`,
    `Meeting notes: ${lead.meetingNotes ?? "—"}`,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TASK_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You qualify B2B sales leads for Indian SME owners (FMS/ops software).
Return JSON only with keys:
- need (1 short sentence: what they want)
- budget (1 short sentence: budget signals or "unclear")
- nextAction (1 short concrete next step for the salesperson)
- summary (2–3 sentences combining the above for a CRM drawer)

Write in clear English. Be honest when data is thin. Do not invent company facts.`,
        },
        { role: "user", content: context },
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

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OPENAI_EMPTY");
  }

  let summary = content.trim();
  try {
    const parsed = JSON.parse(content) as {
      summary?: string;
      need?: string;
      budget?: string;
      nextAction?: string;
    };
    if (parsed.summary?.trim()) {
      summary = parsed.summary.trim();
    } else {
      const parts = [parsed.need, parsed.budget, parsed.nextAction]
        .map((p) => p?.trim())
        .filter(Boolean);
      if (parts.length) {
        summary = parts.join(" ");
      }
    }
  } catch {
    // keep raw content
  }

  return {
    summary,
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      completionTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0,
    },
  };
}
