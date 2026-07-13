import { describe, expect, it } from "vitest";
import { isWhatsAppGreeting } from "@/lib/whatsapp-bot/normalize-command";
import {
  mapCustomerTextShortcut,
  WA_CUSTOMER_MENU,
} from "@/lib/whatsapp-bot/knowledge-menu";

describe("customer WhatsApp greeting shortcuts", () => {
  it("treats hi/hello as greetings", () => {
    expect(isWhatsAppGreeting("HI")).toBe(true);
    expect(isWhatsAppGreeting("hello there")).toBe(true);
    expect(isWhatsAppGreeting("Good morning")).toBe(true);
  });

  it("does not map greetings to browse-topics (dedicated Hi reply path)", () => {
    expect(mapCustomerTextShortcut("hi")).toBeNull();
    expect(mapCustomerTextShortcut("Hello")).toBeNull();
    expect(mapCustomerTextShortcut("hey")).toBeNull();
    expect(mapCustomerTextShortcut("namaste")).toBeNull();
  });

  it("maps menu/start/help/topics to browse topics", () => {
    expect(mapCustomerTextShortcut("menu")).toBe(WA_CUSTOMER_MENU.BROWSE_TOPICS);
    expect(mapCustomerTextShortcut("start")).toBe(WA_CUSTOMER_MENU.BROWSE_TOPICS);
    expect(mapCustomerTextShortcut("help")).toBe(WA_CUSTOMER_MENU.BROWSE_TOPICS);
    expect(mapCustomerTextShortcut("topics")).toBe(WA_CUSTOMER_MENU.BROWSE_TOPICS);
  });
});
