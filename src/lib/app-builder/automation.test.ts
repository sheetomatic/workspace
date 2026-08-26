import { describe, expect, it } from "vitest";
import {
  botsForEvent,
  conditionPasses,
  interpolateTemplate,
  parseBotScript,
  parseLinkToView,
  planBotTasks,
  planBotsForRow,
  viewIdFromDeepLink,
  type AppBot,
} from "./automation";

const row = {
  Name: "Rina",
  Company: "East Infra",
  Phone: "9822222222",
  Stage: "Quote",
  Value: 240000,
  Email: "rina@example.com",
};

const quoteBot: AppBot = {
  id: "lead-quote",
  name: "Quote pack",
  enabled: true,
  table: "Leads",
  event: "adds_or_updates",
  condition: '[Stage]="Quote"',
  tasks: [
    {
      id: "wa",
      kind: "whatsapp",
      to: "[Phone]",
      body: "Hi [Name], quote for [Company]",
    },
    {
      id: "pdf",
      kind: "pdf",
      folder: "Quotes/[Company]",
      fileName: "[Name] quote.pdf",
      body: "Value [Value]",
    },
  ],
};

describe("AppSheet-style bot templates", () => {
  it("fills [Col] and <<[Col]>>", () => {
    expect(interpolateTemplate("Hi [Name] at <<[Company]>>", row)).toBe(
      "Hi Rina at East Infra",
    );
  });

  it("skips the bot when the condition is false", () => {
    expect(conditionPasses('[Stage]="Quote"', row)).toBe(true);
    expect(conditionPasses('[Stage]="Won"', row)).toBe(false);
    expect(planBotTasks({ ...quoteBot, condition: '[Stage]="Won"' }, row)).toEqual([]);
  });

  it("plans WhatsApp and a PDF in a folder", () => {
    const planned = planBotTasks(quoteBot, row);
    expect(planned[0]).toMatchObject({
      kind: "whatsapp",
      to: "9822222222",
      body: "Hi Rina, quote for East Infra",
    });
    expect(planned[1].kind).toBe("pdf");
    expect(planned[1].folder).toBe("Quotes/East Infra");
    expect(planned[1].fileName).toBe("Rina quote.pdf");
    expect(planned[1].pdfBase64).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("parses SEND_EMAIL / SEND_WA / CREATE_PDF scripts", () => {
    const planned = parseBotScript(
      `SEND_EMAIL to [Email] subject "Quote for [Name]" body "Hi [Name]"
SEND_WA to [Phone] "Call [Company]"
CREATE_PDF folder "Quotes/[Company]" file "[Name].pdf"`,
      row,
    );
    expect(planned.map((item) => item.kind)).toEqual(["email", "whatsapp", "pdf"]);
    expect(planned[0]).toMatchObject({
      to: "rina@example.com",
      subject: "Quote for Rina",
    });
  });

  it("runs only matching table + event bots", () => {
    const planned = planBotsForRow([quoteBot], "Leads", "adds", row);
    expect(planned).toHaveLength(2);
    expect(planBotsForRow([quoteBot], "Follow-ups", "adds", row)).toEqual([]);
    expect(planBotsForRow([{ ...quoteBot, enabled: false }], "Leads", "adds", row)).toEqual(
      [],
    );
  });

  it("honours Adds / Updates / Deletes toggles", () => {
    const bot: AppBot = {
      ...quoteBot,
      event: "adds",
      changes: { adds: false, updates: true, deletes: true },
    };
    expect(botsForEvent([bot], "Leads", "adds")).toEqual([]);
    expect(botsForEvent([bot], "Leads", "updates")).toHaveLength(1);
    expect(botsForEvent([bot], "Leads", "deletes")).toHaveLength(1);
  });

  it("plans a notify with <<[Col]>> and a DeepLink", () => {
    const planned = planBotTasks(
      {
        ...quoteBot,
        tasks: [
          {
            id: "n",
            kind: "notify",
            subject: "Quote | <<[Company]>>",
            body: "Hi <<[Name]>>, value [Value]",
            deepLink: 'LINKTOVIEW("Leads")',
          },
        ],
      },
      row,
    );
    expect(planned[0]).toMatchObject({
      kind: "notify",
      subject: "Quote | East Infra",
      body: "Hi Rina, value 240000",
      deepLink: 'LINKTOVIEW("Leads")',
    });
  });

  it("reads LINKTOVIEW into a screen id", () => {
    const views = [
      { id: "leads", name: "Leads" },
      { id: "home", name: "Home" },
    ];
    expect(viewIdFromDeepLink('LINKTOVIEW("Leads")', views)).toBe("leads");
    expect(viewIdFromDeepLink("home", views)).toBe("home");
    expect(parseLinkToView("")).toBeUndefined();
  });
});
