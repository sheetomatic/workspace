const MAX_CONTENT_LENGTH = 15000;
const FETCH_TIMEOUT_MS = 15000;

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function fetchWebsiteTextContent(
  rawUrl: string,
): Promise<{ ok: true; url: string; title: string; content: string } | { ok: false; message: string }> {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    return { ok: false, message: "Enter a valid website URL (https://...)." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SheetomaticBot/1.0 (+https://sheetomatic.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Could not fetch page (HTTP ${response.status}). Check the URL is public.`,
      };
    }

    const html = await response.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch?.[1]?.trim().replace(/\s+/g, " ") || new URL(url).hostname;
    const content = stripHtml(html).slice(0, MAX_CONTENT_LENGTH);

    if (content.length < 80) {
      return {
        ok: false,
        message: "Page had too little readable text. Try a different URL or paste content manually.",
      };
    }

    return { ok: true, url, title, content };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Website fetch timed out. Try again or paste content manually."
        : "Could not reach that website. Check the URL and try again.";
    return { ok: false, message };
  } finally {
    clearTimeout(timer);
  }
}
