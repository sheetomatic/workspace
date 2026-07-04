/**
 * Add your YouTube video IDs here (the code after youtu.be/ or watch?v=).
 * Example: https://youtu.be/VIDEO_ID_HERE -> youtubeId: "VIDEO_ID_HERE"
 * Leave youtubeId empty to show a "Video slot" placeholder until you publish.
 */

export type MarketingVideo = {
  id: string;
  title: string;
  description: string;
  label: string;
  youtubeId?: string;
};

/** AI Enabled Tasks — voice/text delegation on WhatsApp */
export const aiEnabledTasksVideo: MarketingVideo = {
  id: "ai-enabled-tasks",
  label: "AI Enabled Tasks",
  title: "From voice note to assigned task in seconds",
  description:
    "Speak or type on WhatsApp. Sheetomatic creates the task, assigns the owner, and sends alerts — no spreadsheets, no chasing.",
  youtubeId: "n-bHn6kFuaA",
};

/** AI section - single supporting video */
export const aiSectionVideo: MarketingVideo = aiEnabledTasksVideo;

/** Founder / trust video */
export const founderVideo: MarketingVideo = {
  id: "founder",
  label: "Founder",
  title: "Message from Shyam Kumar Banjare",
  description:
    "How Sheetomatic applies the BCI Suite so MSMEs scale without the owner — systems, role clarity, and review discipline instead of founder firefighting.",
  youtubeId: "",
};

/** Services hero stack — YouTube demos (Sheetomatic Videos) */
export const servicesDemoVideos = {
  fms: {
    href: "https://youtu.be/bXYleWCg200",
    label: "Watch how FMS works",
  },
  emReports: {
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AEGRsuLRVQjkCpwEpTibZv_",
    label: "Executive reporting demos",
  },
  whatsapp: {
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AGRshLErzQNK5l9J_V6Nffx",
    label: "WhatsApp videos",
  },
  aiTasks: {
    href: "https://youtu.be/n-bHn6kFuaA",
    label: "Watch AI Enabled Tasks",
  },
} as const;

/** Per-offer videos (matches focusOffers ids in marketing-content.ts) */
export const offerVideos: Record<string, MarketingVideo> = {
  "ai-workspace": {
    id: "video-ai-workspace",
    label: "Workspace",
    title: "Sheetomatic Workspace walkthrough",
    description:
      "FMS, IMS, CRM, Executive Meeting, and WhatsApp AI systems — with Process Coordinator and Executive Assistant roles — in one SaaS login.",
    youtubeId: "n-bHn6kFuaA",
  },
  "whatsapp-ai": {
    id: "video-whatsapp-ai",
    label: "WhatsApp AI",
    title: "WhatsApp AI and team inbox",
    description: "Official API, AI replies, and tasks from real conversations.",
    youtubeId: "",
  },
};
