export function leadPhoneDigits(phone: string | null | undefined) {
  return phone?.replace(/\D/g, "") ?? "";
}

/**
 * Digits for wa.me links: strips formatting and leading zeros, and prefixes
 * `91` to bare 10-digit Indian mobiles (starting 6-9) — wa.me requires a
 * country code.
 */
export function whatsAppPhoneDigits(phone: string | null | undefined) {
  const digits = leadPhoneDigits(phone).replace(/^0+/, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }
  return digits;
}

export function leadTelHref(phone: string | null | undefined) {
  const digits = leadPhoneDigits(phone);
  return digits ? `tel:${digits}` : null;
}

export function leadWhatsAppHref(
  phone: string | null | undefined,
  name: string | null | undefined,
  message?: string,
) {
  const digits = whatsAppPhoneDigits(phone);
  if (!digits) {
    return null;
  }
  const text =
    message ??
    `Hi ${name || "there"}, thank you for reaching out to Sheetomatic.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
