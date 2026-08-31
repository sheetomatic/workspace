import { describe, expect, it } from "vitest";
import {
  getOrgTaskPolicy,
  isIstWorkHours,
  isWhatsAppOnlyTeamMember,
  lastTaskWhatsAppAt,
  shouldSendIntervalReminder,
} from "@/lib/tasks/org-task-policy";

describe("org task policy", () => {
  it("keeps Anmol Traders as WhatsApp-only with 90-minute interval pings", () => {
    const policy = getOrgTaskPolicy("anmol-traders");
    expect(policy.whatsappOnlyTeam).toBe(true);
    expect(policy.officialWhatsAppOnly).toBe(true);
    expect(policy.intervalReminderMinutes).toBe(90);
    expect(isWhatsAppOnlyTeamMember("anmol-traders", "STAFF")).toBe(true);
    expect(isWhatsAppOnlyTeamMember("anmol-traders", "OWNER")).toBe(false);
    expect(isWhatsAppOnlyTeamMember("sheetomatic-technologies", "STAFF")).toBe(
      false,
    );
  });

  it("sends interval reminders 90 minutes after last WhatsApp, during IST work hours", () => {
    const last = new Date("2026-08-25T04:00:00.000Z"); // 9:30 AM IST
    const after90 = new Date("2026-08-25T05:35:00.000Z"); // 11:05 AM IST
    const due = new Date("2026-08-25T11:30:00.000Z"); // due today
    expect(isIstWorkHours(after90)).toBe(true);
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now: after90,
        lastWhatsAppAt: last,
        dueAt: due,
      }),
    ).toBe(true);
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now: new Date("2026-08-25T05:00:00.000Z"),
        lastWhatsAppAt: last,
        dueAt: due,
      }),
    ).toBe(false);
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now: new Date("2026-08-25T16:00:00.000Z"),
        lastWhatsAppAt: last,
        dueAt: due,
      }),
    ).toBe(false);
  });

  it("holds interval reminders until Start date", () => {
    const last = new Date("2026-08-25T04:00:00.000Z");
    const now = new Date("2026-08-25T08:05:00.000Z");
    const start = new Date("2026-09-01T03:30:00.000Z"); // 1 Sept 9 AM IST
    const due = new Date("2026-09-05T11:30:00.000Z");
    expect(
      shouldSendIntervalReminder({
        slug: "anmol-traders",
        now,
        lastWhatsAppAt: last,
        dueAt: due,
        startAt: start,
      }),
    ).toBe(false);
  });

  it("uses assignment time when no reminder has been sent yet", () => {
    const created = new Date("2026-08-25T03:58:00.000Z");
    const assigned = new Date("2026-08-25T04:00:00.000Z");
    expect(
      lastTaskWhatsAppAt({
        whatsappReminderSentAt: null,
        whatsappAssignmentSentAt: assigned,
        createdAt: created,
      }),
    ).toBe(assigned);
    expect(
      lastTaskWhatsAppAt({
        whatsappReminderSentAt: null,
        whatsappAssignmentSentAt: null,
        createdAt: created,
      }),
    ).toBe(created);
  });
});
