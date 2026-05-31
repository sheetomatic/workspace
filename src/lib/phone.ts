export function normalizeWhatsAppPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

export function formatWhatsAppPhone(phone: string | null | undefined) {
  if (!phone) {
    return "-";
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return `+${digits}`;
}
