export const whatsappPhone = "919329103106";

export const whatsappDisplayNumber = "+91 93291 03106";

export const whatsappTel = "+919329103106";

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export const whatsappUrl = buildWhatsAppUrl(
  "Hi Sheetomatic, I want to automate my business workflow.",
);

export const consultationUrl = "https://calendar.app.google/MVmguFeQZpMNDTFo9";

export const graphyStoreUrl = "https://sheetomatic.graphy.com/s/store";

/** YouTube channel: Sheetomatic Videos */
export const youtubeChannelUrl = "https://www.youtube.com/@Sheetomatic";

export const youtubeChannelName = "Sheetomatic Videos";

export const siteBrand = {
  name: "Sheetomatic",
  tagline: "BCI Suite",
  headerTagline: "BCI Suite",
  descriptor: "Business Control & Intelligence",
  /** Icon-only mark for headers, sidebars, and app tiles */
  iconSrc: "/images/sheetomatic-icon.svg",
  /** White icon for dark backgrounds (login, footer) */
  iconLightSrc: "/images/sheetomatic-icon-light.svg",
  /** Full lockup for exports and standalone brand use */
  logoSrc: "/images/sheetomatic-logo.svg",
  logoAlt: "Sheetomatic logo",
  footerDescription:
    "Sheetomatic Workspace and Sheetomatic AI — BCI Suite: Business Control & Intelligence for system-driven MSMEs. FMS, IMS, Full Kitting, Process Coordinator, Executive Assistant, and Review Rhythm in one operating system.",
  footerBottomLine: "Sheetomatic · sheetomatic.com",
};

export const finalCtaContent = {
  kicker: "Start on WhatsApp",
  title: "Build a business that scales without you.",
  text: "BCI Suite brings FMS, IMS, Full Kitting, Process Coordinator, Executive Assistant, and Review Rhythm into one operating system. One conversation to replace spreadsheet firefighting with owner clarity.",
  buttonLabel: "WhatsApp",
};

export const services = [
  {
    title: "Sheetomatic Workspace",
    text: "Finance, inventory, checklists, tasks, and leadership visibility — in one place.",
  },
  {
    title: "FMS",
    text: "Flow monitoring from enquiry to closure — stage owners, proofs, and stall alerts built in.",
  },
  {
    title: "IMS",
    text: "Inventory that stays accurate. No shadow spreadsheets. Stock you can trust.",
  },
  {
    title: "Checklist module",
    text: "Recurring SOPs on mobile - Process Coordinator role scores completion, photos, and exceptions via the PC portal.",
  },
  {
    title: "Tasks module",
    text: "Every task assigned, tracked, and scored - Executive Assistant role monitors follow-through via the EA portal.",
  },
  {
    title: "Executive Meeting (Weekly)",
    text: "Monday board ready automatically. Exceptions only — no all-nighter MIS prep.",
  },
  {
    title: "Sheetomatic AI",
    text: "WhatsApp API plus AI — follow-ups, updates, and answers where your team already works.",
  },
];

export const whatsappPageHero = {
  eyebrow: "WhatsApp API Solutions",
  title: "Official WhatsApp API for campaigns, inbox, and automation",
  lead:
    "Bulk templates, team inbox, AI chatbots, and deep integration with Sheetomatic Workspace — CRM, Tally, Busy, and your operating stack.",
};
