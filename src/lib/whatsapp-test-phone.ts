import { formatWhatsAppPhone, normalizeWhatsAppPhone } from "@/lib/phone";

/** Default test recipient for Settings ? Send test message. */
export const DEFAULT_WHATSAPP_TEST_PHONE = "919329103106";

export function resolveWhatsAppTestPhone() {
  const raw =
    process.env.WHATSAPP_TEST_PHONE?.trim() || DEFAULT_WHATSAPP_TEST_PHONE;
  return normalizeWhatsAppPhone(raw);
}

export function formatWhatsAppTestPhoneLabel() {
  const phone = resolveWhatsAppTestPhone();
  return phone ? formatWhatsAppPhone(phone) : "+919329103106";
}
