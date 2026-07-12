/**
 * Marketing YouTube catalog + page placements.
 * Add IDs here (youtu.be / watch?v=). Empty youtubeId shows a placeholder.
 * Rule: when multiple videos share a topic, prefer the newest published.
 * Channel: @sheetomatic (UCVwyRDGxu0967mnYnGNNnLQ) — RSS + oEmbed Jul 2026.
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

/** Full channel catalog — newest first within recent uploads, then legacy catalog. */
export const channelVideos: ChannelVideo[] = [
  // --- Latest uploads (RSS Jul 2026) ---
  {
    youtubeId: "acTJOocmuZM",
    title:
      "AI Enabled Flow Monitoring System (FMS) for MSMEs | AI FMS: Dashboard for PC & EA | BCI",
    category: "FMS",
  },
  {
    youtubeId: "n-bHn6kFuaA",
    title:
      "Assign Tasks Automatically Using AI + WhatsApp | Employees Can Update Tasks Directly from WhatsApp",
    category: "WhatsApp",
  },
  {
    youtubeId: "fyOHfU9F8jo",
    title:
      "Build a Payment & Follow-up Dashboard in Google Sheets | Step-by-Step Automation Guide",
    category: "EM/MIS",
  },
  {
    youtubeId: "fc4pR7oppZc",
    title: "Add Chart Filter in Data Studio | Interactive Dashboard Tutorial | Easy Guide",
    category: "EM/MIS",
  },
  {
    youtubeId: "CYq7JpqZ7mo",
    title: "Auto Data Refresh in Data Studio | No Manual Update | Live Dashboard Guide",
    category: "EM/MIS",
  },
  {
    youtubeId: "Po9fnDvGBeY",
    title:
      "Add Custom Fields in Looker Studio | Create Calculated Fields (Step-by-Step Hindi)",
    category: "EM/MIS",
  },
  {
    youtubeId: "bXYleWCg200",
    title:
      "How to Build FMS System in AppSheet | Stop Manual Work | Without Script & Formula",
    category: "FMS",
  },
  {
    youtubeId: "JL0WqfO3LdA",
    title: "Edit Charts in Looker Studio | Customize Dashboard Like a Pro (Hindi)",
    category: "EM/MIS",
  },
  {
    youtubeId: "F31UoU94CoU",
    title: "Raw Data to Smart Dashboard | Google Sheets / Looker Studio (Hindi)",
    category: "EM/MIS",
  },
  {
    youtubeId: "Z8deRw4ywgU",
    title: "Build Your Own Task Manager | Google Sheets + AppSheet (No Coding)",
    category: "Tasks/EA",
  },
  {
    youtubeId: "pnlC4YoBz2Y",
    title: "Make Your Configuration Template | Google Form + AppSheet Automation (Hindi)",
    category: "Checklists/PC",
  },
  {
    youtubeId: "6Udyudnbddc",
    title: "Track Your Income & Expense Easily | AppSheet + Google Sheets Tutorial (Hindi)",
    category: "AppSheet/Sheets",
  },
  // --- Legacy catalog ---
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

/**
 * Homepage Tasks strip — WhatsApp→Tasks (same topic as Core Offers WhatsApp card;
 * Home page omits this section to keep a clean dual pair in Focus Offers).
 */
export const aiEnabledTasksVideo: MarketingVideo = toMarketingVideo("n-bHn6kFuaA", {
  id: "ai-enabled-tasks",
  label: "WhatsApp → Tasks",
  title: "Assign tasks with AI + WhatsApp — team updates from chat",
  description:
    "Delegate work and let employees update status from WhatsApp — syncs to Sheets, owner sees exceptions.",
  category: "WhatsApp",
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

/** Services hero stack — YouTube demos (latest per topic) */
export const servicesDemoVideos = {
  fms: {
    href: youtubeWatchUrl("acTJOocmuZM"),
    label: "Watch how AI FMS works",
  },
  emReports: {
    href: youtubeWatchUrl("fyOHfU9F8jo"),
    label: "Payment & follow-up dashboards",
  },
  whatsapp: {
    href: youtubeWatchUrl("n-bHn6kFuaA"),
    label: "WhatsApp → Tasks automation",
  },
  aiTasks: {
    href: youtubeWatchUrl("Z8deRw4ywgU"),
    label: "Watch task manager build",
  },
} as const;

/**
 * Per-offer videos (matches focusOffers ids) — Home’s primary dual pair:
 * FMS + WhatsApp→Tasks (newest published for each topic).
 */
export const offerVideos: Record<string, MarketingVideo> = {
  "ai-workspace": toMarketingVideo("acTJOocmuZM", {
    id: "video-ai-workspace",
    label: "FMS",
    title: "AI-enabled FMS — PC & EA dashboards for MSMEs",
    description:
      "Live ops board, delay alerts, and PC/EA panels — Flow Monitoring without chasing updates before EM.",
  }),
  "whatsapp-ai": toMarketingVideo("n-bHn6kFuaA", {
    id: "video-whatsapp-ai",
    label: "WhatsApp → Tasks",
    title: "Assign tasks with AI + WhatsApp — updates from chat",
    description:
      "Employees update work from WhatsApp; data syncs to Sheets — conversations become owned tasks.",
  }),
};

/**
 * Homepage proof clips — supporting systems only (no FMS / WhatsApp→Tasks;
 * those live once in Core Offers).
 */
export const homeProofVideos: MarketingVideo[] = [
  toMarketingVideo("GFas19FF3fs", {
    id: "home-ims",
    label: "IMS",
    description: "Inventory in AppSheet + Sheets + Looker — stock truth for EM.",
  }),
  toMarketingVideo("fyOHfU9F8jo", {
    id: "home-mis",
    label: "EM / MIS",
    description: "Payment & follow-up dashboard — collections without spreadsheet chaos.",
  }),
  toMarketingVideo("Z8deRw4ywgU", {
    id: "home-tasks",
    label: "Tasks / EA",
    description: "Task manager in Sheets + AppSheet — owners and status without coding.",
  }),
];

/** Featured embeds on /courses */
export const coursesFeaturedVideos: MarketingVideo[] = [
  toMarketingVideo("oOTerA_lpAo", {
    id: "courses-appsheet",
    label: "AppSheet",
    description: "No-code apps from Google Sheets — forms, views, and staff UX.",
  }),
  toMarketingVideo("acTJOocmuZM", {
    id: "courses-sheets",
    label: "Google Sheets",
    description: "Clean backends, owners, and stage tracking — system thinking in Sheets.",
  }),
  toMarketingVideo("F31UoU94CoU", {
    id: "courses-looker",
    label: "Looker Studio",
    description: "Raw data to smart dashboard — management boards owners can read.",
  }),
];

/** Thumbnail grid on Courses — strong picks by category (link out, not 30 embeds) */
export const coursesLibraryVideos: ChannelVideo[] = channelVideos.filter(
  (v) =>
    v.available !== false &&
    [
      "acTJOocmuZM",
      "n-bHn6kFuaA",
      "Z8deRw4ywgU",
      "ajVRGjaOMhI",
      "pAJMkk0taIo",
      "UkXRQoG1mEA",
      "l2gd7ENfpww",
      "fyOHfU9F8jo",
      "sjbnrQgorm8",
      "BpCzXblijEk",
      "bXYleWCg200",
      "hXGuRjKkMDM",
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
  flow: toMarketingVideo("acTJOocmuZM", {
    id: "service-flow",
    label: "FMS",
    description: "AI FMS with PC & EA dashboards — stage owners, proofs, and delay alerts.",
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
  tasks: toMarketingVideo("Z8deRw4ywgU", {
    id: "service-tasks",
    label: "Tasks / EA",
    description: "Task manager with clear owners and status — Sheets + AppSheet, no coding.",
  }),
  mis: toMarketingVideo("fyOHfU9F8jo", {
    id: "service-mis",
    label: "EM / MIS",
    description: "Payment & follow-up dashboard — Monday board without MIS prep hire.",
  }),
  "whatsapp-ai": toMarketingVideo("n-bHn6kFuaA", {
    id: "service-whatsapp",
    label: "WhatsApp → Tasks",
    description: "Assign and update tasks from WhatsApp — ops where the team already works.",
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
  toMarketingVideo("acTJOocmuZM", {
    id: "hub-fms",
    label: "FMS",
    description: "AI-enabled flow monitoring with PC & EA panels.",
  }),
  toMarketingVideo("ajVRGjaOMhI", {
    id: "hub-ims",
    label: "IMS",
    description: "Smart inventory app on AppSheet.",
  }),
  toMarketingVideo("fyOHfU9F8jo", {
    id: "hub-mis",
    label: "EM / MIS",
    description: "Payment & follow-up dashboards from Google Sheets.",
  }),
];
