import { formatOpenAiError } from "@/lib/integrations/openai-errors";

const STYLE =
  "Photorealistic documentary still, Indian SME workplace, late afternoon warm light, slight mess, real people mid-work, no logo soup, no unreadable UI screens, no grocery aisle, no mall, no stock-model smile, 4:5 portrait crop feel inside a square frame.";

export async function generateSocialImage(artDirection: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_NOT_CONFIGURED");
  }
  const prompt = `${STYLE}\n\nScene: ${artDirection.trim().slice(0, 1200)}`;

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SOCIAL_IMAGE_MODEL ?? "dall-e-3",
      prompt,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
      n: 1,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OPENAI_ERROR:${formatOpenAiError(response.status, detail)}`);
  }

  const payload = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const b64 = payload.data?.[0]?.b64_json?.trim();
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }
  const url = payload.data?.[0]?.url?.trim();
  if (url) {
    return url;
  }
  throw new Error("OPENAI_EMPTY");
}

export async function generateSocialCarouselImages(artDirections: string[]) {
  const slides: string[] = [];
  for (const direction of artDirections.slice(0, 5)) {
    slides.push(await generateSocialImage(direction));
  }
  return slides;
}
