import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl, callingDisplayNumber, callingTel, officialApiWhatsAppPhone, whatsappDisplayNumber, whatsappPhone } from "@/app/site-content";
import { QUOTATION_FOOTER_CONTACT } from "@/lib/leads/quotation-content";
import { CALLBACK_SENDER_PHONE } from "@/lib/leads/callback-policy";

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? files(path) : /\.(?:tsx?|jsx?|mjs|json|html|svg|txt|md|css)$/.test(path) ? [path] : [];
  });
}

describe("public contact destinations (API sender and payment identities are separate)", () => {
  it("uses the approved number for sales WhatsApp, calls, display and quotation enquiries", () => {
    expect(whatsappPhone).toBe("919755733107");
    expect(callingTel).toBe("+919755733107");
    expect(whatsappDisplayNumber).toBe("+91 97557 33107");
    expect(callingDisplayNumber).toBe(whatsappDisplayNumber);
    const url = new URL(buildWhatsAppUrl("Demo & support?"));
    expect(url.origin + url.pathname).toBe("https://wa.me/919755733107");
    expect(url.searchParams.get("text")).toBe("Demo & support?");
    expect(QUOTATION_FOOTER_CONTACT).toContain(whatsappDisplayNumber);
  });
  it("does not change the official CRM API sender", () => {
    expect(officialApiWhatsAppPhone).toBe("919685788980");
    expect(CALLBACK_SENDER_PHONE).toBe(officialApiWhatsAppPhone);
    expect(CALLBACK_SENDER_PHONE).not.toBe(whatsappPhone);
  });
  it("scans all source and text public assets for obsolete contact numbers with narrow documented exclusions", () => {
    const oldPersonal = new RegExp("9329103106".split("").join("[\\s().-]*"));
    const oldPublicNowApi = new RegExp("9685788980".split("").join("[\\s().-]*"));
    const hits: string[] = [];
    for (const file of [...files("src"), ...files("public")]) {
      if (/\.test\.[tj]sx?$/.test(file)) continue;
      const path = relative(process.cwd(), join(process.cwd(), file));
      for (const [index, original] of readFileSync(file, "utf8").split("\n").entries()) {
        // UPI is a bank/payment identity, not a phone CTA. Never retarget money through a contact update.
        const line = original.replaceAll("9329103106@ybl", "[unchanged payment identity]");
        if (oldPersonal.test(line) && path !== "src/lib/whatsapp-test-phone.ts") hits.push(`${path}:${index + 1}: old personal contact`);
        if (!oldPublicNowApi.test(line)) continue;
        const officialDeclaration = path === "src/app/site-content.ts" && /export const officialApiWhatsApp/.test(line);
        const internalSender = ["src/lib/leads/callback-policy.ts", "src/app/api/admin/whatsapp-go-live/route.ts",
          "src/components/saas/whatsapp-settings-panel.tsx"].includes(path);
        if (!officialDeclaration && !internalSender) hits.push(`${path}:${index + 1}: obsolete public WhatsApp`);
      }
    }
    expect(hits).toEqual([]);
  });
});
