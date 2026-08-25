import { formatOpenAiError } from "@/lib/integrations/openai-errors";
import {
  isBannedSocialIcp,
  socialIcpLabel,
  type SocialIcpId,
} from "@/lib/social/icp";
import type { SocialPostFormat } from "@/lib/my-space/social/types";

export type SocialStudioBrief = {
  icp: SocialIcpId | string;
  format: SocialPostFormat;
  personName: string;
  shopName: string;
  messyDetail: string;
  problem: string;
  extra?: string;
};

export type SocialSlideBrief = {
  title: string;
  artDirection: string;
};

export type GeneratedSocialCopy = {
  title: string;
  hook: string;
  caption: string;
  hashtags: string;
  artDirection: string;
  slides: SocialSlideBrief[];
};

const SYSTEM = `You are a senior Indian founder-marketer writing LinkedIn for Sheetomatic — an EM Ready owner-ops platform (FMS, IMS, Tasks, CRM, WhatsApp alerts, weekly review). You are NOT a generic ChatGPT intern.

HARD ICP only: doctors/clinics, lawyers, mobile shops, furniture, computer shops, jewellery, fashion boutiques, manufacturing, services, tour & travel, electronics shops, electronic workshops.
NEVER grocery, kirana, gift shop, general store, mall, hypermarket, or “count every biscuit” retail.

Write like a human founder recounting a real client day:
- Specific names, messy uneven paragraphs, one awkward detail that feels true.
- Line 1 = hook (tension/curiosity). Long story, not 5 punchy bullets.
- Hinglish OK. No fake metrics, no “80% done”, no brochure words (leverage, synergy, seamless, game-changer).
- Sheetomatic is the quiet system in the background — FMS/IMS/tasks/weekly EM — not a product dump.
- Soft CTA at the end. No hard sell.

For visuals: documentary Indian SME, late-afternoon light, slightly messy real shop/clinic, people mid-work. No glossy stock. No fake dashboards with unreadable UI. No grocery aisles.

Return JSON only:
{
  "title": "board title, max 8 words",
  "hook": "first line of the caption only",
  "caption": "FULL long LinkedIn story. First line = hook. Then uneven paragraphs. Soft CTA last.",
  "hashtags": "3 to 5 quiet hashtags",
  "artDirection": "one paragraph for the cover photo",
  "slides": [
    { "title": "slide label", "artDirection": "what this slide shows, camera, people, mess" }
  ]
}
If format is image, slides has exactly 1 item (the cover).
If format is carousel, slides has 5 items that tell a swipe story: hook → person/shop → what broke → the quiet system → weekly-review calm.`;

export function assertSocialBrief(brief: SocialStudioBrief) {
  const blob = [
    brief.icp,
    brief.personName,
    brief.shopName,
    brief.messyDetail,
    brief.problem,
    brief.extra ?? "",
  ].join(" ");
  if (isBannedSocialIcp(blob)) {
    return {
      ok: false as const,
      message:
        "That story targets grocery / general store. Use a clinic, lawyer, jewellery, furniture, or similar ICP shop.",
    };
  }
  if (brief.personName.trim().length < 2) {
    return { ok: false as const, message: "Give the person a real first name." };
  }
  if (brief.shopName.trim().length < 2) {
    return { ok: false as const, message: "Give the shop or clinic a name." };
  }
  if (brief.messyDetail.trim().length < 8) {
    return { ok: false as const, message: "Add one messy real detail (the thing that would not be in a brochure)." };
  }
  if (brief.problem.trim().length < 8) {
    return { ok: false as const, message: "What was going wrong before the system?" };
  }
  return { ok: true as const };
}

export async function generateSocialCopy(
  brief: SocialStudioBrief,
): Promise<GeneratedSocialCopy> {
  const check = assertSocialBrief(brief);
  if (!check.ok) {
    throw new Error(check.message);
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }

  const slideCount = brief.format === "carousel" ? 5 : 1;
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SOCIAL_MODEL ?? "gpt-4o",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: [
            `ICP: ${socialIcpLabel(brief.icp)}`,
            `Format: ${brief.format} (${slideCount} visual${slideCount === 1 ? "" : "s"})`,
            `Person: ${brief.personName.trim()}`,
            `Shop / clinic: ${brief.shopName.trim()}`,
            `Messy detail: ${brief.messyDetail.trim()}`,
            `What was broken: ${brief.problem.trim()}`,
            brief.extra?.trim() ? `Extra colour: ${brief.extra.trim()}` : "",
            "Write a post ChatGPT would not write — more specific, less tidy, more human.",
          ]
            .filter(Boolean)
            .join("\n"),
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

  let parsed: Partial<GeneratedSocialCopy>;
  try {
    parsed = JSON.parse(content) as Partial<GeneratedSocialCopy>;
  } catch {
    throw new Error("OPENAI_EMPTY");
  }

  const caption = String(parsed.caption || "").trim();
  const hook = String(parsed.hook || caption.split("\n")[0] || "").trim();
  if (!caption || caption.length < 80) {
    throw new Error("OPENAI_EMPTY");
  }
  if (isBannedSocialIcp(caption)) {
    throw new Error("AI drifted into a banned vertical. Try again with a clearer ICP shop.");
  }

  const slides = (Array.isArray(parsed.slides) ? parsed.slides : [])
    .map((slide) => ({
      title: String(slide?.title || "").trim() || "Slide",
      artDirection: String(slide?.artDirection || "").trim(),
    }))
    .filter((slide) => slide.artDirection)
    .slice(0, slideCount);

  if (slides.length === 0) {
    slides.push({
      title: "Cover",
      artDirection: String(parsed.artDirection || "").trim() || caption.slice(0, 180),
    });
  }

  return {
    title: String(parsed.title || "").trim() || `${brief.personName} at ${brief.shopName}`,
    hook,
    caption: parsed.hashtags
      ? `${caption}\n\n${String(parsed.hashtags).trim()}`
      : caption,
    hashtags: String(parsed.hashtags || "").trim(),
    artDirection: String(parsed.artDirection || slides[0]?.artDirection || "").trim(),
    slides,
  };
}
