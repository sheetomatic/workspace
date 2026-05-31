import { isEmailConfigured } from "@/lib/integrations/email";
import { isRedlavaConfigured } from "@/lib/integrations/redlava";

export type IntegrationStatus = {
  openai: boolean;
  whatsapp: boolean;
  email: boolean;
  audio: boolean;
  whatsappProvider: "redlava" | "meta" | null;
};

function isMetaWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

export function getIntegrationStatus(): IntegrationStatus {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const redlava = isRedlavaConfigured();
  const meta = isMetaWhatsAppConfigured();

  let whatsappProvider: IntegrationStatus["whatsappProvider"] = null;
  if (redlava) {
    whatsappProvider = "redlava";
  } else if (meta) {
    whatsappProvider = "meta";
  }

  return {
    openai,
    whatsapp: redlava || meta,
    email: isEmailConfigured(),
    audio: openai,
    whatsappProvider,
  };
}
