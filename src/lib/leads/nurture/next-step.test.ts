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
