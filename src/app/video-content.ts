/**
 * Marketing YouTube catalog + page placements.
 * Add IDs here (youtu.be / watch?v=). Empty youtubeId shows a placeholder.
 */

export type VideoCategory =
  | "FMS"
  | "IMS"
  | "Tasks/EA"
  | "Checklists/PC"
  | "EM/MIS"
  | "AppSheet/Sheets"
  | "WhatsApp"
  | "Owner mindset"
  | "General";

export type MarketingVideo = {
  id: string;
  title: string;
  description: string;
  label: string;
  youtubeId?: string;
  category?: VideoCategory;
};

export type ChannelVideo = {
  youtubeId: string;
  title: string;
  category: VideoCategory;
  /** Prefer thumbnail link-out over embed on dense grids */
  description?: string;
  available?: boolean;
};

/** Full channel catalog from owner-provided IDs (oEmbed titles, Jul 2026). */
export const channelVideos: ChannelVideo[] = [
  {
    youtubeId: "GFas19FF3fs",
    title: "Inventory Management System in AppSheet | Google Sheets + AppSheet + Looker Studio",
    category: "IMS",
  },
  {
    youtubeId: "JNyOlDI4TwY",
    title: "How to Create Task Management System in AppSheet",
    category: "Tasks/EA",
  },
  {
    youtubeId: "SZu5X-Z34kc",
    title: "How to Create a Task Delegation System in AppSheet",
    category: "Tasks/EA",
  },
  {
    youtubeId: "UkXRQoG1mEA",
    title: "How to Build Your Own CRM in AppSheet",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "ajVRGjaOMhI",
    title: "Build Smart Inventory Management App | AppSheet with Google Sheets",
    category: "IMS",
  },
  {
    youtubeId: "S7RAcXQm1Gc",
    title: "How to Create an Automated Invoice System using AppSheet",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "hXGuRjKkMDM",
    title: "Send Product Catalogs on WhatsApp using QR Codes",
    category: "WhatsApp",
  },
  {
    youtubeId: "PM8E3mCw67Q",
    title: "How to Build FMS in Google Sheets + Google Forms | Track Delays",
    category: "FMS",
  },
  {
    youtubeId: "oOTerA_lpAo",
    title: "AppSheet Full Tutorial for Beginners | Build No-Code Apps with Google Sheets",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "QrgmCt-LIYA",
    title: "How to use Google Data Studio (Looker Studio) for beginners",
    category: "EM/MIS",
  },
  {
    youtubeId: "sjbnrQgorm8",
    title: "Google Sheets Full Course Tutorial (4+ Hours)",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "ezEqmrtIHtE",
    title: "How to create dashboard in Google Sheets | Pivot Table | Charts | Slicers",
    category: "EM/MIS",
  },
  {
    youtubeId: "UgeuufRYTlo",
    title: "Stunning Dashboard | Google Sheets Pivot Table | Charts | Slicers",
    category: "EM/MIS",
  },
  {
    youtubeId: "BUodhwB6y4I",
    title: "How to create dashboard in Google Sheets | Data Analysis",
    category: "EM/MIS",
  },
  {
    youtubeId: "LiwCTx44QJY",
    title: "How to Use XLOOKUP in Google Sheets",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "AMESo_Byd2A",
    title: "Master the QUERY Function in Google Sheets",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "6sJ74ZBCx48",
    title: "How to Use VLOOKUP in Google Sheets",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "OL2yL76OOUQ",
    title: "How to Use Geo-Fencing for Attendance Tracking in AppSheet",
    category: "Checklists/PC",
  },
  {
    youtubeId: "dXt5S_Ypi4k",
    title: "How to Create a Complaint Helpdesk with AppSheet",
    category: "Tasks/EA",
  },
  {
    youtubeId: "WibvJoVCkW8",
    title: "Build a Monthly Budget App in AppSheet",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "Tvf9YQKhqmc",
    title: "Sheetomatic video (currently unavailable on YouTube)",
    category: "General",
    available: false,
  },
  {
    youtubeId: "wOdr9JT4oM8",
    title: "How to Send Google Sheets Reminders to WhatsApp",
    category: "WhatsApp",
  },
  {
    youtubeId: "LOg7QOE8O0Q",
    title: "How to Create a Social Media Calendar in Google Sheets",
    category: "Checklists/PC",
  },
  {
    youtubeId: "fvTXUbbGxXk",
    title: "Earn Money from Home | Freelance skills & projects",
    category: "General",
  },
  {
    youtubeId: "ZQ-b3mdShc4",
    title: "Google Sheets QUERY Function for Beginners",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "BpCzXblijEk",
    title: "Field Executive Tracking App Using AppSheet",
    category: "Checklists/PC",
  },
  {
    youtubeId: "QTYbUsU6DYw",
    title: "Create a Task Management System in AppSheet",
    category: "Tasks/EA",
  },
  {
    youtubeId: "pAJMkk0taIo",
    title: "Attendance & Leave Management System in AppSheet",
    category: "Checklists/PC",
  },
  {
    youtubeId: "--mkBLLV3aE",
    title: "Create a Simple CRM for Your Business in AppSheet",
    category: "AppSheet/Sheets",
  },
  {
    youtubeId: "l2gd7ENfpww",
    title: "How to Build a Purchase Order System in AppSheet",
    category: "IMS",
  },
];

export function channelVideoById(youtubeId: string): ChannelVideo | undefined {
  return channelVideos.find((v) => v.youtubeId === youtubeId);
}

export function youtubeWatchUrl(youtubeId: string) {
  return `https://youtu.be/${youtubeId}`;
}

export function youtubeThumbUrl(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
}

function toMarketingVideo(
  youtubeId: string,
  overrides: Partial<MarketingVideo> & Pick<MarketingVideo, "id" | "label">,
): MarketingVideo {
  const meta = channelVideoById(youtubeId);
  return {
    id: overrides.id,
    label: overrides.label,
    title: overrides.title ?? meta?.title ?? "Sheetomatic Videos",
    description: overrides.description ?? "",
    youtubeId,
    category: overrides.category ?? meta?.category,
  };
}

/** Homepage / tasks strip — task delegation for owners */
export const aiEnabledTasksVideo: MarketingVideo = toMarketingVideo("SZu5X-Z34kc", {
  id: "ai-enabled-tasks",
  label: "Tasks / EA",
  title: "Task delegation system owners can run from AppSheet",
  description:
    "Assign work, track status, and stop chasing updates on WhatsApp — the EA module pattern in action.",
});

export const aiSectionVideo: MarketingVideo = aiEnabledTasksVideo;

/** Founder / trust video — slot reserved */
export const founderVideo: MarketingVideo = {
  id: "founder",
  label: "Founder",
  title: "Message from Shyam Kumar Banjare",
  description:
    "How Sheetomatic applies the BCI Suite so MSMEs scale without the owner — systems, role clarity, and review discipline instead of founder firefighting.",
  youtubeId: "",
};

/** Services hero stack — YouTube demos */
export const servicesDemoVideos = {
  fms: {
    href: youtubeWatchUrl("PM8E3mCw67Q"),
    label: "Watch how FMS works",
  },
  emReports: {
    href: youtubeWatchUrl("QrgmCt-LIYA"),
    label: "Executive reporting demos",
  },
  whatsapp: {
    href: youtubeWatchUrl("wOdr9JT4oM8"),
    label: "WhatsApp reminders from Sheets",
  },
  aiTasks: {
    href: youtubeWatchUrl("SZu5X-Z34kc"),
    label: "Watch task delegation",
  },
} as const;

/** Per-offer videos (matches focusOffers ids in marketing-content.ts) */
export const offerVideos: Record<string, MarketingVideo> = {
  "ai-workspace": toMarketingVideo("PM8E3mCw67Q", {
    id: "video-ai-workspace",
    label: "FMS",
    title: "Build FMS in Sheets — track delays stage by stage",
    description:
      "See planned vs actual, owners, and delay tracking — the Flow Monitoring habit MSME owners need before EM.",
  }),
  "whatsapp-ai": toMarketingVideo("wOdr9JT4oM8", {
    id: "video-whatsapp-ai",
    label: "WhatsApp",
    title: "Send Google Sheets reminders to WhatsApp",
    description:
      "Internal ops nudges from your system — due dates and follow-ups where the team already works.",
  }),
};

/** Homepage proof clips (visual, not a text wall) */
export const homeProofVideos: MarketingVideo[] = [
  toMarketingVideo("PM8E3mCw67Q", {
    id: "home-fms",
    label: "FMS",
    description: "Flow monitoring with delay tracking — owner control without chasing.",
  }),
  toMarketingVideo("GFas19FF3fs", {
    id: "home-ims",
    label: "IMS",
    description: "Inventory in AppSheet + Sheets + Looker — stock truth for EM.",
  }),
  toMarketingVideo("ezEqmrtIHtE", {
    id: "home-mis",
    label: "EM / MIS",
    description: "Owner dashboards from Sheets — pivot, charts, slicers.",
  }),
];

/** Featured embeds on /courses */
export const coursesFeaturedVideos: MarketingVideo[] = [
  toMarketingVideo("oOTerA_lpAo", {
    id: "courses-appsheet",
    label: "AppSheet",
    description: "No-code apps from Google Sheets — foundation of the owner program.",
  }),
  toMarketingVideo("PM8E3mCw67Q", {
    id: "courses-fms",
    label: "FMS",
    description: "Build Flow Monitoring with stage delays — core of weekly EM.",
  }),
  toMarketingVideo("QrgmCt-LIYA", {
    id: "courses-looker",
    label: "EM / MIS",
    description: "Looker Studio for beginners — executive boards owners can read.",
  }),
];

/** Thumbnail grid on Courses — strong picks by category (link out, not 30 embeds) */
export const coursesLibraryVideos: ChannelVideo[] = channelVideos.filter(
  (v) =>
    v.available !== false &&
    [
      "JNyOlDI4TwY",
      "ajVRGjaOMhI",
      "pAJMkk0taIo",
      "UkXRQoG1mEA",
      "l2gd7ENfpww",
      "wOdr9JT4oM8",
      "sjbnrQgorm8",
      "BpCzXblijEk",
      "UgeuufRYTlo",
      "hXGuRjKkMDM",
      "SZu5X-Z34kc",
      "OL2yL76OOUQ",
    ].includes(v.youtubeId),
);

/** Service detail page embeds by slug */
export const serviceDetailVideos: Partial<
  Record<
    | "flow"
    | "inventory"
    | "checklist"
    | "tasks"
    | "mis"
    | "whatsapp-ai"
    | "crm"
    | "hr"
    | "automation",
    MarketingVideo
  >
> = {
  flow: toMarketingVideo("PM8E3mCw67Q", {
    id: "service-flow",
    label: "FMS",
    description: "Stage owners, proofs, and delay tracking from enquiry to closure.",
  }),
  inventory: toMarketingVideo("GFas19FF3fs", {
    id: "service-inventory",
    label: "IMS",
    description: "Stock in/out and balances in AppSheet — inventory exceptions for EM.",
  }),
  checklist: toMarketingVideo("pAJMkk0taIo", {
    id: "service-checklist",
    label: "PC / Process",
    description: "Attendance & leave as a process checklist discipline — owners, exceptions, proof.",
  }),
  tasks: toMarketingVideo("SZu5X-Z34kc", {
    id: "service-tasks",
    label: "Tasks / EA",
    description: "Task delegation with clear owners and status — EA module pattern.",
  }),
  mis: toMarketingVideo("QrgmCt-LIYA", {
    id: "service-mis",
    label: "EM / MIS",
    description: "Looker Studio for executive reporting — Monday board without MIS prep hire.",
  }),
  "whatsapp-ai": toMarketingVideo("hXGuRjKkMDM", {
    id: "service-whatsapp",
    label: "WhatsApp",
    description: "Product catalogs on WhatsApp via QR — ops where customers and teams already are.",
  }),
  crm: toMarketingVideo("UkXRQoG1mEA", {
    id: "service-crm",
    label: "CRM",
    description: "Build a simple CRM in AppSheet connected to Google Sheets.",
  }),
  hr: toMarketingVideo("OL2yL76OOUQ", {
    id: "service-hr",
    label: "HR",
    description: "Geo-fenced attendance tracking for field and plant teams.",
  }),
};

/** Compact band on /services hub */
export const servicesHubVideos: MarketingVideo[] = [
  toMarketingVideo("PM8E3mCw67Q", {
    id: "hub-fms",
    label: "FMS",
    description: "Flow monitoring with delay tracking.",
  }),
  toMarketingVideo("ajVRGjaOMhI", {
    id: "hub-ims",
    label: "IMS",
    description: "Smart inventory app on AppSheet.",
  }),
  toMarketingVideo("BUodhwB6y4I", {
    id: "hub-mis",
    label: "EM / MIS",
    description: "Owner dashboards from Google Sheets.",
  }),
];
