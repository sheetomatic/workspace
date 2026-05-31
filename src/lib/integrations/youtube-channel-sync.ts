import { AI_KNOWLEDGE_MAX_CONTENT_CHARS } from "@/lib/ai-knowledge-limits";

export type YoutubeVideoEntry = {
  title: string;
  url: string;
  publishedAt?: string;
};

export type YoutubeChannelSyncResult =
  | {
      ok: true;
      channelId: string;
      channelTitle: string;
      channelUrl: string;
      content: string;
    }
  | { ok: false; message: string };

function normalizeChannelInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (!url.hostname.includes("youtube.com") && !url.hostname.includes("youtu.be")) {
      if (trimmed.startsWith("@")) {
        return `https://www.youtube.com/${trimmed}`;
      }
      return `https://www.youtube.com/@${trimmed.replace(/^@/, "")}`;
    }
    return url.toString();
  } catch {
    if (trimmed.startsWith("@")) {
      return `https://www.youtube.com/${trimmed}`;
    }
    if (trimmed.startsWith("UC") && trimmed.length >= 20) {
      return `https://www.youtube.com/channel/${trimmed}`;
    }
    return null;
  }
}

function parseHandleFromUrl(url: string) {
  const match = url.match(/youtube\.com\/@([^/?#]+)/i);
  return match?.[1] ? `@${decodeURIComponent(match[1])}` : null;
}

function parseChannelIdFromUrl(url: string) {
  const match = url.match(/youtube\.com\/channel\/(UC[\w-]+)/i);
  return match?.[1] ?? null;
}

async function resolveChannelIdFromPage(channelUrl: string) {
  const response = await fetch(channelUrl, {
    headers: {
      "User-Agent": "SheetomaticBot/1.0 (+https://sheetomatic.com)",
      Accept: "text/html",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  const externalId = html.match(/"externalId":"(UC[\w-]+)"/)?.[1];
  if (externalId) {
    return externalId;
  }
  const channelId = html.match(/"channelId":"(UC[\w-]+)"/)?.[1];
  return channelId ?? null;
}

async function resolveChannelId(
  channelUrl: string,
  apiKey?: string | null,
): Promise<{ channelId: string; channelTitle: string } | null> {
  const fromUrl = parseChannelIdFromUrl(channelUrl);
  if (fromUrl) {
    return { channelId: fromUrl, channelTitle: "YouTube Channel" };
  }

  const handle = parseHandleFromUrl(channelUrl);

  if (apiKey) {
    const params = new URLSearchParams({
      key: apiKey,
      part: "snippet",
    });
    if (handle) {
      params.set("forHandle", handle);
    } else if (fromUrl) {
      params.set("id", fromUrl);
    } else {
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
      { signal: AbortSignal.timeout(12000) },
    );
    if (response.ok) {
      const data = (await response.json()) as {
        items?: Array<{ id?: string; snippet?: { title?: string } }>;
      };
      const item = data.items?.[0];
      if (item?.id) {
        return {
          channelId: item.id,
          channelTitle: item.snippet?.title?.trim() || "YouTube Channel",
        };
      }
    }
  }

  const scrapedId = await resolveChannelIdFromPage(channelUrl);
  if (!scrapedId) {
    return null;
  }

  return { channelId: scrapedId, channelTitle: handle?.replace("@", "") ?? "YouTube Channel" };
}

async function fetchVideosViaApi(channelId: string, apiKey: string) {
  const channelResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?${new URLSearchParams({
      key: apiKey,
      part: "contentDetails,snippet",
      id: channelId,
    }).toString()}`,
    { signal: AbortSignal.timeout(12000) },
  );

  if (!channelResponse.ok) {
    return null;
  }

  const channelData = (await channelResponse.json()) as {
    items?: Array<{
      snippet?: { title?: string };
      contentDetails?: { relatedPlaylists?: { uploads?: string } };
    }>;
  };
  const channelItem = channelData.items?.[0];
  const uploadsPlaylistId = channelItem?.contentDetails?.relatedPlaylists?.uploads;
  const channelTitle = channelItem?.snippet?.title?.trim() || "YouTube Channel";

  if (!uploadsPlaylistId) {
    return { channelTitle, videos: [] as YoutubeVideoEntry[] };
  }

  const playlistResponse = await fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?${new URLSearchParams({
      key: apiKey,
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: "15",
    }).toString()}`,
    { signal: AbortSignal.timeout(12000) },
  );

  if (!playlistResponse.ok) {
    return { channelTitle, videos: [] as YoutubeVideoEntry[] };
  }

  const playlistData = (await playlistResponse.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        resourceId?: { videoId?: string };
        publishedAt?: string;
      };
    }>;
  };

  const videos =
    playlistData.items
      ?.map((item) => {
        const videoId = item.snippet?.resourceId?.videoId;
        const title = item.snippet?.title?.trim();
        if (!videoId || !title || title === "Private video" || title === "Deleted video") {
          return null;
        }
        return {
          title,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          publishedAt: item.snippet?.publishedAt,
        };
      })
      .filter(Boolean) as YoutubeVideoEntry[] ?? [];

  return { channelTitle, videos };
}

async function fetchVideosViaRss(channelId: string) {
  const response = await fetch(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
    { signal: AbortSignal.timeout(12000) },
  );

  if (!response.ok) {
    return [] as YoutubeVideoEntry[];
  }

  const xml = await response.text();
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

  return entries
    .map((match) => {
      const entry = match[1];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
      const url = entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1]?.trim();
      const publishedAt = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim();
      if (!title || !url) {
        return null;
      }
      return { title, url, publishedAt };
    })
    .filter(Boolean)
    .slice(0, 15) as YoutubeVideoEntry[];
}

export function formatYoutubeChannelKnowledgeContent(params: {
  channelTitle: string;
  channelUrl: string;
  videos: YoutubeVideoEntry[];
}) {
  const lines = [
    `YouTube channel: ${params.channelTitle}`,
    `Channel URL: ${params.channelUrl}`,
    "",
    "Recent videos (share these links when customers ask for tutorials or video resources):",
  ];

  params.videos.forEach((video, index) => {
    lines.push(`${index + 1}. ${video.title}`);
    lines.push(`   ${video.url}`);
  });

  if (params.videos.length === 0) {
    lines.push("No public videos found yet. Share the channel URL above.");
  }

  return lines.join("\n").slice(0, AI_KNOWLEDGE_MAX_CONTENT_CHARS);
}

export async function syncYoutubeChannelContent(
  rawUrl: string,
): Promise<YoutubeChannelSyncResult> {
  const channelUrl = normalizeChannelInput(rawUrl);
  if (!channelUrl) {
    return {
      ok: false,
      message: "Enter a valid YouTube channel URL or @handle.",
    };
  }

  const apiKey = process.env.YOUTUBE_API_KEY?.trim() || null;
  const resolved = await resolveChannelId(channelUrl, apiKey);
  if (!resolved) {
    return {
      ok: false,
      message:
        "Could not resolve that YouTube channel. Use a full URL like https://www.youtube.com/@Sheetomatic",
    };
  }

  let channelTitle = resolved.channelTitle;
  let videos: YoutubeVideoEntry[] = [];

  if (apiKey) {
    const apiResult = await fetchVideosViaApi(resolved.channelId, apiKey);
    if (apiResult) {
      channelTitle = apiResult.channelTitle;
      videos = apiResult.videos;
    }
  }

  if (videos.length === 0) {
    videos = await fetchVideosViaRss(resolved.channelId);
  }

  const canonicalUrl =
    parseHandleFromUrl(channelUrl) != null
      ? channelUrl
      : `https://www.youtube.com/channel/${resolved.channelId}`;

  return {
    ok: true,
    channelId: resolved.channelId,
    channelTitle,
    channelUrl: canonicalUrl,
    content: formatYoutubeChannelKnowledgeContent({
      channelTitle,
      channelUrl: canonicalUrl,
      videos,
    }),
  };
}
