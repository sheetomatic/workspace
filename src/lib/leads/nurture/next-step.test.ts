import { describe, expect, it } from "vitest";
import {
  clientFacingNurtureNextStep,
  postCallThanksLine,
} from "@/lib/leads/nurture/next-step";

describe("clientFacingNurtureNextStep", () => {
  it("does not repeat Meeting notes after the meeting is done", () => {
    expect(
      clientFacingNurtureNextStep({
        status: "MEETING_NOTES",
        callingStatus: "MEETING_DONE",
        nextStepLabel: "Meeting notes",
      }),
    ).toContain("today's meeting");
  });

  it("asks for slots only before the meeting is booked", () => {
    expect(
      clientFacingNurtureNextStep({ status: "SCHEDULE_MEETING" }),
    ).toContain("2 convenient time slots");
  });

  it("tells the client to join once the meeting is booked", () => {
    expect(
      clientFacingNurtureNextStep({ status: "DEMO_SCHEDULED" }),
    ).toContain("join the meeting at the scheduled time");
    expect(
      clientFacingNurtureNextStep({ status: "DEMO_SCHEDULED" }),
    ).not.toContain("2 convenient time slots");
  });

  it("keeps a written client action", () => {
    expect(
      clientFacingNurtureNextStep({
        status: "MEETING_NOTES",
        nextStepLabel: "Send the quotation tomorrow",
      }),
    ).toBe("Send the quotation tomorrow");
  });
});

describe("postCallThanksLine", () => {
  it("thanks for the meeting after meeting notes", () => {
    expect(
      postCallThanksLine({ status: "MEETING_NOTES" }),
    ).toBe("Thank you for the meeting today");
    expect(postCallThanksLine({ callingStatus: "CONNECTED" })).toBe(
      "Thank you for speaking with us",
    );
  });
});
