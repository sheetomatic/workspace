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
  { channel: "WHATSAPP", label: "WhatsApp Business" },
  { channel: "INSTAGRAM", label: "Instagram DMs / Lead ads" },
  { channel: "FACEBOOK", label: "Facebook / Meta Lead forms" },
  { channel: "GOOGLE_SHEETS", label: "Google Sheets intake" },
];

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
