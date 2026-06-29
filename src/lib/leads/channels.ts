import type { LeadSourceChannel } from "@prisma/client";

export const LEAD_CHANNEL_LABELS: Record<LeadSourceChannel, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  GOOGLE_SHEETS: "Google Sheets",
  MANUAL: "Manual",
  API: "API",
};

export const LEAD_CHANNEL_DEFAULTS: Array<{
  channel: LeadSourceChannel;
  label: string;
}> = [
  { channel: "GOOGLE_SHEETS", label: "Google Sheets intake (Phase 1)" },
  { channel: "WHATSAPP", label: "WhatsApp Business" },
  { channel: "INSTAGRAM", label: "Instagram DMs / Lead ads" },
  { channel: "FACEBOOK", label: "Facebook / Meta Lead forms" },
];

/** Active intake connector for Phase 1. */
export const LEAD_SOURCE_PRIORITY_CHANNEL: LeadSourceChannel = "GOOGLE_SHEETS";

/** Connectors shown in UI but not yet available for setup. */
export const LEAD_SOURCE_COMING_SOON_CHANNELS: LeadSourceChannel[] = [
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "MANUAL",
];

export function isLeadSourceComingSoon(channel: LeadSourceChannel) {
  return LEAD_SOURCE_COMING_SOON_CHANNELS.includes(channel);
}

export const LEAD_DASHBOARD_SOURCE_FILTERS = [
  "GOOGLE_SHEETS",
  "ALL",
  "WHATSAPP",
  "INSTAGRAM",
  "FACEBOOK",
  "MANUAL",
] as const;

export type LeadDashboardSourceFilter = (typeof LEAD_DASHBOARD_SOURCE_FILTERS)[number];

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
  ];
  return allowed.includes(normalized as LeadSourceChannel)
    ? (normalized as LeadSourceChannel)
    : null;
}
