export function normalizeWhatsAppPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length < 10) {
    return null;
  }

  // 0 + 10-digit Indian mobile (e.g. 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Duplicate country code from inputs like +91 91xxxxxxxxxx
  if (digits.startsWith("9191") && digits.length > 12) {
    digits = digits.slice(2);
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
