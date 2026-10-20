import { describe, expect, it } from "vitest";
import { callbackSchedule, callbackAcknowledgement, callbackAgentConfig, isCallbackWorkingTime } from "./callback-policy";
import { buildWhatsAppUrl, callingPhone, whatsappPhone } from "@/app/site-content";

describe("IST callback policy", () => {
  it.each([
    ["2026-10-20T09:00:00+05:30", "2026-10-20T09:15:00+05:30"],
    ["2026-10-20T11:13:00+05:30", "2026-10-20T11:28:00+05:30"],
    ["2026-10-20T08:59:00+05:30", "2026-10-20T09:15:00+05:30"],
    ["2026-10-20T18:45:00+05:30", "2026-10-20T19:00:00+05:30"],
    ["2026-10-20T18:45:01+05:30", "2026-10-21T09:15:00+05:30"],
    ["2026-10-20T19:00:00+05:30", "2026-10-21T09:15:00+05:30"],
    ["2026-10-24T19:00:00+05:30", "2026-10-26T09:15:00+05:30"],
    ["2026-10-25T10:00:00+05:30", "2026-10-26T09:15:00+05:30"],
    ["2026-10-31T23:59:00+05:30", "2026-11-02T09:15:00+05:30"],
  ])("%s => %s", (input, expected) => {
    expect(callbackSchedule(new Date(input)).dueAt.toISOString()).toBe(new Date(expected).toISOString());
  });
  it("states an actual deadline, Sunday closure and assignee", () => {
    const text = callbackAcknowledgement("Sumit Chandra", new Date("2026-10-26T09:15:00+05:30"));
    expect(text).toContain("Sumit Chandra"); expect(text).toContain("Monday");
    expect(text).toContain("9:15"); expect(text).toContain("Sunday closed");
  });
  it("does not escalate outside working hours", () => {
    expect(isCallbackWorkingTime(new Date("2026-10-25T12:00:00+05:30"))).toBe(false);
    expect(isCallbackWorkingTime(new Date("2026-10-20T19:00:00+05:30"))).toBe(false);
    expect(isCallbackWorkingTime(new Date("2026-10-20T09:00:00+05:30"))).toBe(true);
  });
  it("requires explicit enablement, identities and activation date", () => {
    expect(callbackAgentConfig({})).toBeNull();
    expect(callbackAgentConfig({ CRM_CALLBACK_ENABLED: "true" })).toBeNull();
    expect(callbackAgentConfig({ CRM_CALLBACK_ENABLED: "true", CRM_CALLBACK_ORGANIZATION_ID: "o",
      CRM_CALLBACK_ASSIGNEE_ID: "s", CRM_CALLBACK_OWNER_ID: "a", CRM_CALLBACK_ENABLED_SINCE: "2026-10-20T00:00:00Z" })).not.toBeNull();
  });
  it("routes website WhatsApp links to official inbox without changing voice calls", () => {
    expect(whatsappPhone).toBe("919685788980");
    expect(new URL(buildWhatsAppUrl("Demo please")).pathname).toBe("/919685788980");
    expect(callingPhone).toBe("919755733107");
  });
});
