import { describe, expect, it } from "vitest";
import { defaultLeadNurtureConfig } from "@/lib/leads/nurture/config";
import { buildLeadNurtureMessage } from "@/lib/leads/nurture/templates";

describe("buildLeadNurtureMessage post_call", () => {
  it("does not send CRM stage Meeting notes as the next step after a meeting", () => {
    const body = buildLeadNurtureMessage({
      event: "post_call",
      name: "Anmol",
      assigneeName: "Sumit Chandra",
      discussionSummary:
        "Changes to be done on Task Management for Anmol\n1. Tasks Reminder on Intervals\n2. Update Task Option Remove and Whatsapp keep WhatsApp Only.",
      status: "MEETING_NOTES",
      callingStatus: "MEETING_DONE",
      nextStepLabel: "Meeting notes",
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("Hi Anmol");
    expect(body).toContain("Thank you for the meeting today");
    expect(body).toContain("As discussed");
    expect(body).toContain("Tasks Reminder on Intervals");
    expect(body).toContain("share the next update");
    expect(body).not.toContain("*Next step:* Meeting notes");
  });

  it("keeps a real client next step when one is written", () => {
    const body = buildLeadNurtureMessage({
      event: "post_call",
      name: "Anmol",
      status: "MEETING_NOTES",
      nextStepLabel: "Share the task-management change list by Friday",
    });
    expect(body).toContain("Share the task-management change list by Friday");
  });
});

describe("buildLeadNurtureMessage meeting reminders", () => {
  it("asks for slots only when the meeting is not booked yet", () => {
    const body = buildLeadNurtureMessage({
      event: "stage_schedule_meeting",
      name: "Sumit",
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("2 convenient time slots");
    expect(body.toLowerCase()).not.toContain("join our meeting");
  });

  it("reminds the client to join at the scheduled time with the Meet link", () => {
    const body = buildLeadNurtureMessage({
      event: "alert_meeting_join",
      name: "Sumit",
      whenLabel: "Thu, 20 Aug 2026, 03:00 – 03:45 pm IST",
      meetUrl: "https://meet.google.com/axy-yorv-ofn",
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("Hi Sumit");
    expect(body).toContain("join our meeting at the scheduled time");
    expect(body).toContain("Thu, 20 Aug 2026");
    expect(body).toContain("https://meet.google.com/axy-yorv-ofn");
    expect(body.toLowerCase()).not.toContain("2 convenient time slots");
    expect(body.toLowerCase()).not.toContain("meeting notes");
  });
});

describe("buildLeadNurtureMessage welcome", () => {
  it("does not send General inquiry when requirement is empty", () => {
    const body = buildLeadNurtureMessage({
      event: "welcome",
      name: "Ravi",
      category: "GENERAL",
      requirement: null,
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("Hi Ravi");
    expect(body.toLowerCase()).not.toContain("general inquiry");
    expect(body).toContain("exact requirement");
  });

  it("uses the lead requirement when present", () => {
    const body = buildLeadNurtureMessage({
      event: "welcome",
      name: "Anita",
      category: "GENERAL",
      requirement: "Need FMS for order dispatch",
      nurtureConfig: defaultLeadNurtureConfig(),
    });
    expect(body).toContain("Need FMS for order dispatch");
    expect(body.toLowerCase()).not.toContain("general inquiry");
  });
});
