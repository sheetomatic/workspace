import { isEmailConfigured } from "@/lib/integrations/email";
import { isRedlavaConfigured } from "@/lib/integrations/redlava";
import { isMasConfigured } from "@/lib/integrations/messageautosender";

export type IntegrationStatus = {
  openai: boolean;
  whatsapp: boolean;
  email: boolean;
  audio: boolean;
  whatsappProvider: "sheetomatic" | "messageautosender" | "meta" | null;
};

function isMetaWhatsAppConfigured() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim(),
  );
}

function platformWhatsAppProvider(): IntegrationStatus["whatsappProvider"] {
  const env = process.env.WHATSAPP_PROVIDER?.trim().toLowerCase();
  if (env === "messageautosender" && isMasConfigured()) {
    return "messageautosender";
  }
  if (isRedlavaConfigured()) {
    return "sheetomatic";
  }
  if (isMetaWhatsAppConfigured()) {
    return "meta";
  }
  if (isMasConfigured()) {
    return "messageautosender";
  }
  return null;
}

export function getIntegrationStatus(): IntegrationStatus {
  const openai = Boolean(process.env.OPENAI_API_KEY?.trim());
  const whatsappProvider = platformWhatsAppProvider();

  return {
    openai,
    whatsapp: Boolean(whatsappProvider),
    email: isEmailConfigured(),
    audio: openai,
    whatsappProvider,
  };
}
