import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmMeetingsCalendar, type CrmCalendarMeeting } from "./crm-meetings-calendar";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/app/app/leads/actions", () => ({ saveCrmMeetingDetailsAction: vi.fn(), sendCrmMeetingReminderAction: vi.fn() }));

const booking: CrmCalendarMeeting = {
  id: "google-fixture", leadId: null, name: "Test booking", phone: "", whenLabel: "20 Oct, 10:00 am",
  ymd: "2026-10-20", typeLabel: "Google booking", assignee: "", meetUrl: "https://meet.google.com/test",
  notes: "Google Calendar booking", isToday: true, completed: false, source: "GOOGLE_CALENDAR",
  calendarUrl: "https://calendar.google.com/calendar/event?eid=test",
};
afterEach(() => vi.useRealTimers());
describe("Calendar booking rows render as read-only CRM meeting entries", () => {
  it("shows the Google source/meeting link without a lead link or CRM reminder", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-20T04:00:00Z"));
    const html = renderToStaticMarkup(createElement(CrmMeetingsCalendar, { meetings: [booking], canManage: true, view: "today" }));
    expect(html).toContain("Test booking"); expect(html).toContain("Google booking");
    expect(html).toContain("https://calendar.google.com/calendar/event?eid=test");
    expect(html).toContain("https://meet.google.com/test");
    expect(html).not.toContain("/app/leads?leadId="); expect(html).not.toContain("Remind");
  });
  it("keeps cancelled bookings out of the Today view but available in Cancelled", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-20T04:00:00Z"));
    const cancelled = { ...booking, cancelled: true, typeLabel: "Cancelled", meetUrl: null };
    const today = renderToStaticMarkup(createElement(CrmMeetingsCalendar, { meetings: [cancelled], canManage: true, view: "today" }));
    const history = renderToStaticMarkup(createElement(CrmMeetingsCalendar, { meetings: [cancelled], canManage: true, view: "cancelled" }));
    expect(today).not.toContain("Test booking"); expect(history).toContain("Test booking");
    expect(history).not.toContain("https://meet.google.com/test"); expect(history).not.toContain("Remind");
  });
  it("retains existing CRM lead/reminder actions for manual meetings", () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-20T04:00:00Z"));
    const manual = { ...booking, source: "CRM" as const, leadId: "lead-fixture", calendarUrl: null };
    const html = renderToStaticMarkup(createElement(CrmMeetingsCalendar, { meetings: [manual], canManage: true, view: "today" }));
    expect(html).toContain("/app/leads?leadId=lead-fixture"); expect(html).toContain("Remind");
  });
});
