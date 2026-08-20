import { describe, expect, it } from "vitest";
import {
  getOrgTaskPolicy,
  isIstWorkHours,
  isWhatsAppOnlyTeamMember,
  shouldSendIntervalReminder,
} from "@/lib/tasks/org-task-policy";

describe("org task policy", () => {
  it("keeps Anmol Traders as WhatsApp-only with 4-hour interval pings", () => {
    const policy = getOrgTaskPolicy("anmol-traders");
    expect(policy.whatsappOnlyTeam).toBe(true);
    expect(policy.officialWhatsAppOnly).toBe(true);
    expect(policy.intervalReminderHours).toBe(4);
    expect(isWhatsAppOnlyTeamMember("anmol-traders", "STAFF")).toBe(true);
    expect(isWhatsAppOnlyTeamMember("anmol-traders", "OWNER")).toBe(false);
    expect(isWhatsAppOnlyTeamMember("sheetomatic-technologies", "STAFF")).toBe(
      false,
    );
  });

  it("sends interval reminders only after the gap and during IST work hours", () => {
    const dueAt = new Date("2026-08-20T04:00:00.000Z");
    const last = new Date("2026-08-20T06:00:00.000Z");
    const workNow = new Date("2026-08-20T10:30:00.000Z");
    expect(isIstWorkHours(workNow)).toBe(true);
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now: workNow,
        dueAt,
        lastWhatsAppReminderAt: last,
      }),
    ).toBe(true);
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now: new Date("2026-08-20T16:00:00.000Z"),
        dueAt,
        lastWhatsAppReminderAt: last,
      }),
    ).toBe(false);
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now: workNow,
        dueAt,
        lastWhatsAppReminderAt: new Date("2026-08-20T09:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
