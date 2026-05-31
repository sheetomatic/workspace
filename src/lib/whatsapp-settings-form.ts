export type WhatsAppSettingsFormValues = {
  businessPhone: string;
  redlavaApiKey: string;
  redlavaPhoneId: string;
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
