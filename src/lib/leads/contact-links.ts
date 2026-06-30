export function leadPhoneDigits(phone: string | null | undefined) {
  return phone?.replace(/\D/g, "") ?? "";
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
  const digits = leadPhoneDigits(phone);
  if (!digits) {
    return null;
  }
  const text =
    message ??
    `Hi ${name || "there"}, thank you for reaching out to Sheetomatic.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
