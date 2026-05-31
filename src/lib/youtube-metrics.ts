const YOUTUBE_FALLBACK_SUBSCRIBERS = 36000;
const YOUTUBE_FALLBACK_TOTAL_VIEWS = 2500000;
const YOUTUBE_FALLBACK_VIDEO_COUNT = 500;
const PROJECT_BASE_COUNT = 200;
const PROJECT_BASE_DATE = new Date("2026-05-25T00:00:00+05:30");
const EXPERIENCE_START_DATE = new Date("2011-01-01T00:00:00+05:30");
const DAYS_PER_PROJECT_INCREMENT = 10;
const PROJECT_INCREMENT = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type MarketingMetrics = {
  youtubeTotalViews: string;
  youtubeVideoCount: string;
  youtubeSubscribers: string;
  projectsDelivered: string;
  experienceYears: number;
};

type YouTubeChannelsResponse = {
  items?: Array<{
    statistics?: {
      subscriberCount?: string;
      videoCount?: string;
      viewCount?: string;
    };
  }>;
};

function formatCompactPlus(value: number) {
  if (value >= 1000000) {
    const millions = value / 1000000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M+`;
  }
  if (value >= 1000) {
    return `${Math.floor(value / 1000)}K+`;
  }
  return `${value}+`;
}

function formatNumberPlus(value: number) {
  return `${new Intl.NumberFormat("en-IN").format(value)}+`;
}

function getFullYearsSince(startDate: Date, asOf = new Date()) {
  let years = asOf.getFullYear() - startDate.getFullYear();
  const hasAnniversaryPassed =
    asOf.getMonth() > startDate.getMonth() ||
    (asOf.getMonth() === startDate.getMonth() &&
      asOf.getDate() >= startDate.getDate());
  if (!hasAnniversaryPassed) {
    years -= 1;
  }
  return Math.max(0, years);
}

function getProjectCount(asOf = new Date()) {
  const elapsedDays = Math.max(
    0,
    Math.floor((asOf.getTime() - PROJECT_BASE_DATE.getTime()) / MS_PER_DAY),
  );
  const projectIncrements =
    Math.floor(elapsedDays / DAYS_PER_PROJECT_INCREMENT) * PROJECT_INCREMENT;
  return PROJECT_BASE_COUNT + projectIncrements;
}

async function getYouTubeStats() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return {
      subscriberCount: YOUTUBE_FALLBACK_SUBSCRIBERS,
      totalViews: YOUTUBE_FALLBACK_TOTAL_VIEWS,
      videoCount: YOUTUBE_FALLBACK_VIDEO_COUNT,
    };
  }

  const params = new URLSearchParams({ key: apiKey, part: "statistics" });
  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  const channelHandle = process.env.YOUTUBE_CHANNEL_HANDLE ?? "Sheetomatic";

  if (channelId) {
    params.set("id", channelId);
  } else {
    params.set(
      "forHandle",
      channelHandle.startsWith("@") ? channelHandle : `@${channelHandle}`,
    );
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params.toString()}`,
      { next: { revalidate: 86400 } },
    );
    if (!response.ok) {
      throw new Error("YouTube API error");
    }
    const data = (await response.json()) as YouTubeChannelsResponse;
    const statistics = data.items?.[0]?.statistics;
    const subscriberCount = Number(statistics?.subscriberCount);
    const totalViews = Number(statistics?.viewCount);
    const videoCount = Number(statistics?.videoCount);
    return {
      subscriberCount:
        Number.isFinite(subscriberCount) && subscriberCount > 0
          ? subscriberCount
          : YOUTUBE_FALLBACK_SUBSCRIBERS,
      totalViews:
        Number.isFinite(totalViews) && totalViews > 0
          ? totalViews
          : YOUTUBE_FALLBACK_TOTAL_VIEWS,
      videoCount:
        Number.isFinite(videoCount) && videoCount > 0
          ? videoCount
          : YOUTUBE_FALLBACK_VIDEO_COUNT,
    };
  } catch {
    return {
      subscriberCount: YOUTUBE_FALLBACK_SUBSCRIBERS,
      totalViews: YOUTUBE_FALLBACK_TOTAL_VIEWS,
      videoCount: YOUTUBE_FALLBACK_VIDEO_COUNT,
    };
  }
}

export async function getMarketingMetrics(): Promise<MarketingMetrics> {
  const youtubeStats = await getYouTubeStats();
  return {
    youtubeTotalViews: formatCompactPlus(youtubeStats.totalViews),
    youtubeVideoCount: formatNumberPlus(youtubeStats.videoCount),
    youtubeSubscribers: formatCompactPlus(youtubeStats.subscriberCount),
    projectsDelivered: `${getProjectCount()}+`,
    experienceYears: getFullYearsSince(EXPERIENCE_START_DATE),
  };
}
