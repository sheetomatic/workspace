export type WhatsAppSettingsFormValues = {
  businessPhone: string;
  whatsappProvider: "sheetomatic" | "messageautosender";
  redlavaApiKey: string;
  redlavaPhoneId: string;
  masUsername: string;
  masPassword: string;
  masApiKey: string;
};

export function maskSecret(value: string | null | undefined) {
  if (!value?.trim()) {
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return "********";
  }
  return `${"*".repeat(Math.min(trimmed.length - 4, 16))}${trimmed.slice(-4)}`;
}

export function parseWhatsAppProviderField(
  value: FormDataEntryValue | null,
): "sheetomatic" | "messageautosender" {
  const raw = value?.toString().trim().toLowerCase();
  return raw === "messageautosender" ? "messageautosender" : "sheetomatic";
}

export function whatsAppProviderLabel(
  provider: WhatsAppSettingsFormValues["whatsappProvider"],
) {
  return provider === "messageautosender" ? "Web Based API" : "Official API";
}
