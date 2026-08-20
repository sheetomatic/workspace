import { describe, expect, it } from "vitest";
import { buildCallNoteAckWhatsApp } from "@/lib/leads/call-note-ack";

describe("buildCallNoteAckWhatsApp", () => {
  it("includes notes for meeting done", () => {
    const body = buildCallNoteAckWhatsApp({
      clientName: "Ketan Sharma",
      organizationName: "Sheetomatic",
      callingStatus: "MEETING_DONE",
      notes: "Will discuss with elder brother",
    });
    expect(body).toContain("Hi Ketan");
    expect(body).toContain("Will discuss with elder brother");
    expect(body).toContain("Thank you for the meeting today");
    expect(body).toContain("next update");
    expect(body.toLowerCase()).not.toContain("meeting done");
    expect(body).not.toContain("acknowledge");
  });

  it("covers no answer without requiring notes", () => {
    const body = buildCallNoteAckWhatsApp({
      clientName: "Ketan",
      organizationName: "Sheetomatic",
      callingStatus: "NO_ANSWER",
      notes: null,
    });
    expect(body).toContain("couldn't connect");
  });
});
