import { describe, expect, it } from "vitest";
import { getWhatsAppWebhookUrl } from "@/lib/whatsapp-go-live";

describe("WhatsApp webhook URL", () => {
  it("uses the Anmol Traders host instead of sheetomatic.com", () => {
    expect(getWhatsAppWebhookUrl("anmol-traders")).toBe(
      "https://anmol-traders.sheetomatic.com/api/webhooks/whatsapp",
    );
    expect(getWhatsAppWebhookUrl("anmol")).toBe(
      "https://anmol-traders.sheetomatic.com/api/webhooks/whatsapp",
    );
  });
});
