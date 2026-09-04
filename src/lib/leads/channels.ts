import type { LeadSourceChannel } from "@prisma/client";

export const LEAD_CHANNEL_LABELS: Record<LeadSourceChannel, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE_SHEETS: "Google Sheets",
  MANUAL: "Manual",
  API: "API",
  TELEGRAM: "Telegram",
  INDIAMART: "IndiaMART",
  TRADEINDIA: "TradeIndia",
  SHOPIFY: "Shopify",
  WOOCOMMERCE: "WooCommerce",
  JUSTDIAL: "Justdial",
  VOICE: "AI receptionist",
};

export const LEAD_CHANNEL_DEFAULTS: Array<{
  channel: LeadSourceChannel;
  label: string;
}> = [
  { channel: "GOOGLE_SHEETS", label: "Google Sheets intake" },
  { channel: "WHATSAPP", label: "WhatsApp Official API intake" },
  { channel: "INSTAGRAM", label: "Instagram Lead Ads" },
  { channel: "FACEBOOK", label: "Facebook Lead Ads" },
  { channel: "TELEGRAM", label: "Telegram Bot intake" },
  { channel: "INDIAMART", label: "IndiaMART Lead Manager" },
  { channel: "TRADEINDIA", label: "TradeIndia inquiries" },
  { channel: "SHOPIFY", label: "Shopify orders" },
  { channel: "WOOCOMMERCE", label: "WooCommerce orders" },
  { channel: "JUSTDIAL", label: "Justdial enquiries" },
  { channel: "VOICE", label: "AI receptionist (voice)" },
];

export const LEAD_DASHBOARD_SOURCE_FILTERS = [
  "GOOGLE_SHEETS",
  "ALL",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "TELEGRAM",
  "INDIAMART",
  "TRADEINDIA",
  "SHOPIFY",
  "WOOCOMMERCE",
  "JUSTDIAL",
  "VOICE",
  "MANUAL",
] as const;

export type LeadDashboardSourceFilter = (typeof LEAD_DASHBOARD_SOURCE_FILTERS)[number];

/** Connectors not available for setup toggle (Manual create uses createManualInboundLead). */
export const LEAD_SOURCE_COMING_SOON_CHANNELS: LeadSourceChannel[] = ["MANUAL"];

export function isLeadSourceComingSoon(channel: LeadSourceChannel) {
  return LEAD_SOURCE_COMING_SOON_CHANNELS.includes(channel);
}

/** Active intake connector for Phase 1. */
export const LEAD_SOURCE_PRIORITY_CHANNEL: LeadDashboardSourceFilter = "GOOGLE_SHEETS";

/** Maps channel to FMS lead source field value */
export function fmsSourceLabelForChannel(channel: LeadSourceChannel): string {
  switch (channel) {
    case "WHATSAPP":
      return "WhatsApp";
    case "INSTAGRAM":
      return "Instagram";
    case "FACEBOOK":
      return "Facebook";
    case "GOOGLE_SHEETS":
      return "Google Sheets";
    case "TELEGRAM":
      return "Telegram";
    case "INDIAMART":
      return "IndiaMART";
    case "TRADEINDIA":
      return "TradeIndia";
    case "SHOPIFY":
      return "Shopify";
    case "WOOCOMMERCE":
      return "WooCommerce";
    case "JUSTDIAL":
      return "Justdial";
    case "VOICE":
      return "AI receptionist";
    case "MANUAL":
      return "Walk-in";
    default:
      return "Website";
  }
}

export function parseLeadSourceChannel(
  value: string | null | undefined,
): LeadSourceChannel | null {
  const normalized = value?.trim().toUpperCase().replace(/-/g, "_");
  if (!normalized) {
    return null;
  }
  const allowed: LeadSourceChannel[] = [
    "WHATSAPP",
    "INSTAGRAM",
    "FACEBOOK",
    "GOOGLE_SHEETS",
    "MANUAL",
    "API",
    "TELEGRAM",
    "INDIAMART",
    "TRADEINDIA",
    "SHOPIFY",
    "WOOCOMMERCE",
    "JUSTDIAL",
    "VOICE",
  ];
  return allowed.includes(normalized as LeadSourceChannel)
    ? (normalized as LeadSourceChannel)
    : null;
}
