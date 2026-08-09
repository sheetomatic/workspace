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
          content: `You are Sheetomatic's LinkedIn content editor for Indian MSME owners.
Brand: sheetomatic — AI-Powered Business Automation (FMS, IMS, CRM, Leads, Reporting).
Tone: clear, practical, Hinglish OK when it fits, no fluff, no fake metrics.
Return JSON only:
{
  "title": "short post title for the schedule board (max 8 words)",
  "caption": "full LinkedIn caption ready to post, keep hashtags, keep a clear CTA (comment keyword or soft CTA)",
  "creativeNotes": "1-2 sentences if the creative image should change; else empty string"
}
Apply the reviewer's feedback. Keep Sheetomatic on-brand. Do not invent client results.`,
        },
        {
          role: "user",
          content: [
            `Pillar: ${params.post.pillar}`,
            `Format: ${params.post.format}`,
            `Slot: ${params.post.day} ${params.post.date} ${params.post.time}`,
            params.post.storyHook
              ? `Story context: ${params.post.storyHook}`
              : "Story context: Relatable Indian shop MSME (~₹10k+/day sales).",
            `Current title: ${params.post.title}`,
            `Current caption:\n${params.post.caption}`,
            `Reviewer feedback:\n${feedback}`,
            "Keep Hinglish story tone when the original is Hinglish. Keep Sheetomatic as the system fix, not a hard sell paragraph.",
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
