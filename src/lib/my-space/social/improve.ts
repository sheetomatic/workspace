import { formatOpenAiError } from "@/lib/integrations/openai-errors";
import type { SocialPost } from "@/lib/my-space/social/types";

export type ImprovedSocialPost = {
  title: string;
  caption: string;
  creativeNotes: string;
};

/**
 * Rewrite LinkedIn caption/title from reviewer feedback.
 * Creative image is not regenerated here — notes returned for Sam if art must change.
 */
export async function improveSocialPostWithAi(params: {
  post: SocialPost;
  feedback: string;
}): Promise<ImprovedSocialPost> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const feedback = params.feedback.trim();
  if (!feedback) {
    throw new Error("Feedback required");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TASK_MODEL ?? "gpt-4o-mini",
      temperature: 0.55,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You edit LinkedIn posts for Sheetomatic (AI-Powered Business Automation).
HARD ICP: Doctors, lawyers, mobile shops, furniture, computer shops, jewellery, fashion boutiques, manufacturing, services, tour & travel, electronics shops, electronic workshops.
NEVER write grocery/kirana/gift shop/general store/mall stories.
Style: human-written long stories (not short AI punch lists). Line 1 must be a scroll-stopping HOOK. Hinglish OK. Uneven paragraphs OK. No fake metrics. Soft CTA at end.
Return JSON only:
{
  "title": "short board title (max 8 words)",
  "caption": "FULL long LinkedIn story caption, hook on first line, hashtags + soft CTA",
  "creativeNotes": "1-2 sentences if image should change; else empty string"
}
Apply reviewer feedback. Do not invent client results or ₹ figures unless already in the draft.`,
        },
        {
          role: "user",
          content: [
            `Pillar: ${params.post.pillar}`,
            `Format: ${params.post.format}`,
            `Slot: ${params.post.day} ${params.post.date} ${params.post.time}`,
            params.post.storyHook
              ? `Story context: ${params.post.storyHook}`
              : "Story context: Target ICP MSME (jewellery / clinic / boutique / manufacturing / services) — never grocery.",
            `Current title: ${params.post.title}`,
            `Current caption:\n${params.post.caption}`,
            `Reviewer feedback:\n${feedback}`,
            "Keep a long human story. First line = hook. Sheetomatic is the quiet system fix, not a brochure.",
          ].join("\n\n"),
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OPENAI_ERROR:${formatOpenAiError(response.status, detail)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OPENAI_EMPTY");
  }

  let parsed: Partial<ImprovedSocialPost>;
  try {
    parsed = JSON.parse(content) as Partial<ImprovedSocialPost>;
  } catch {
    throw new Error("OPENAI_EMPTY");
  }

  const title = String(parsed.title || "").trim() || params.post.title;
  const caption = String(parsed.caption || "").trim();
  if (!caption) {
    throw new Error("OPENAI_EMPTY");
  }

  return {
    title,
    caption,
    creativeNotes: String(parsed.creativeNotes || "").trim(),
  };
}
