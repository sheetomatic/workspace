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

/** AI section - single supporting video */
export const aiSectionVideo: MarketingVideo = {
  id: "ai-deep-dive",
  label: "AI workflow",
  title: "Delegate work in one sentence",
  description: "Full walkthrough of AI instruction to structured operations.",
  youtubeId: "",
};

/** Founder / trust video */
export const founderVideo: MarketingVideo = {
  id: "founder",
  label: "Founder",
  title: "Message from Shyam Kumar Banjare",
  description: "How Sheetomatic helps MSMEs move from chaos to control.",
  youtubeId: "",
};

/** Services hero stack & USP � -  YouTube demos (Sheetomatic Videos) */
export const servicesDemoVideos = {
  fms: {
    href: "https://youtu.be/bXYleWCg200",
    label: "Watch how FMS works",
  },
  misDashboards: {
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AEGRsuLRVQjkCpwEpTibZv_",
    label: "Dashboard videos",
  },
  appsheet: {
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AHByfyaVxX7PvRsFI1AgKQm",
    label: "AppSheet playlist",
  },
  whatsapp: {
    href: "https://www.youtube.com/playlist?list=PLJ2nwPX6W6AGRshLErzQNK5l9J_V6Nffx",
    label: "WhatsApp videos",
  },
} as const;

/** Per-offer videos (matches focusOffers ids in marketing-content.ts) */
export const offerVideos: Record<string, MarketingVideo> = {
  "mis-payroll": {
    id: "video-mis-payroll",
    label: "Payroll MIS",
    title: "Hire MIS on Sheetomatic Payroll",
    description: "Save ESI, PF, office, and laptop costs vs direct hiring.",
    youtubeId: "",
  },
  "custom-apps": {
    id: "video-custom-apps",
    label: "Custom apps",
    title: "AppSheet + Google Sheets solution",
    description: "One custom system instead of many tools with no analysis.",
    youtubeId: "",
  },
  "pro-website": {
    id: "video-pro-website",
    label: "Website",
    title: "Professional website delivery",
    description: "Low-cost, high-trust web presence for your business.",
    youtubeId: "",
  },
};
