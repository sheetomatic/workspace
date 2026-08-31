import { describe, expect, it } from "vitest";
import {
  fallbackSessionBotPick,
  isUsableClassRecording,
  meetCodeFromText,
  parseIstDateFromTitle,
  pickLessonForSession,
  scoreRecordingCandidate,
} from "./session-bot-match";

const lessons = [
  {
    id: "l1",
    slug: "overview",
    title: "Google Sheets session overview",
    moduleLabel: "Overview",
    summary: "How the track is structured.",
    sortOrder: 1,
  },
  {
    id: "l7",
    slug: "filter",
    title: "FILTER formula",
    moduleLabel: "Advanced",
    summary: "Live filtered lists.",
    sortOrder: 7,
  },
];

describe("isUsableClassRecording", () => {
  it("keeps live Meet class videos", () => {
    expect(
      isUsableClassRecording("qqp-wfer-fzp (2026-08-10 08:55 GMT+5:30)"),
    ).toBe(true);
  });

  it("skips sales requirement calls and Gemini notes", () => {
    expect(
      isUsableClassRecording(
        "Requirement Understanding - Sheetomatic <> Vijay - Recording",
      ),
    ).toBe(false);
    expect(
      isUsableClassRecording("Meeting started 2026/08/10 – Notes by Gemini"),
    ).toBe(false);
  });
});

describe("meet and date parsers", () => {
  it("reads a Meet code from a title or URL", () => {
    expect(meetCodeFromText("https://meet.google.com/qqp-wfer-fzp")).toBe(
      "qqp-wfer-fzp",
    );
    expect(meetCodeFromText("qqp-wfer-fzp (2026-08-18 09:00 GMT+5:30)")).toBe(
      "qqp-wfer-fzp",
    );
  });

  it("reads the IST calendar day from a Drive title", () => {
    expect(
      parseIstDateFromTitle("qqp-wfer-fzp (2026-08-18 09:00 GMT+5:30)"),
    ).toBe("2026-08-18");
    expect(parseIstDateFromTitle("Class recording 29 Aug 2026")).toBe(
      "2026-08-29",
    );
    expect(parseIstDateFromTitle("Meet 2026/08/30 morning")).toBe("2026-08-30");
  });
});

describe("scoring", () => {
  it("prefers the same-day video in the student's Meet room", () => {
    const sameDay = scoreRecordingCandidate({
      sessionDateIst: "2026-08-10",
      meetCode: "qqp-wfer-fzp",
      studentName: "Sameer Chakraborty",
      candidate: {
        id: "a",
        title: "qqp-wfer-fzp (2026-08-10 08:55 GMT+5:30)",
        url: "https://drive.google.com/file/d/a/view",
        dateIst: "2026-08-10",
        meetCode: "qqp-wfer-fzp",
      },
    });
    const otherDay = scoreRecordingCandidate({
      sessionDateIst: "2026-08-10",
      meetCode: "qqp-wfer-fzp",
      studentName: "Sameer Chakraborty",
      candidate: {
        id: "b",
        title: "qqp-wfer-fzp (2026-07-19 10:46 GMT+5:30)",
        url: "https://drive.google.com/file/d/b/view",
        dateIst: "2026-07-19",
        meetCode: "qqp-wfer-fzp",
      },
    });
    expect(sameDay).toBeGreaterThan(otherDay);
  });
});

describe("pickLessonForSession", () => {
  it("maps session number to sortOrder", () => {
    expect(pickLessonForSession(7, lessons)?.id).toBe("l7");
    expect(pickLessonForSession(1, lessons)?.id).toBe("l1");
  });
});

describe("fallbackSessionBotPick", () => {
  it("attaches same-day 29 Aug recording for session 4", () => {
    const pick = fallbackSessionBotPick({
      sessionNumber: 4,
      sessionDateIst: "2026-08-29",
      meetCode: "hza-nrzu-dsa",
      studentName: "Netai Ghosh",
      hasGroup: false,
      lessons: [
        ...lessons,
        {
          id: "l4",
          slug: "session-4",
          title: "Session 4 lesson",
          moduleLabel: "Sheets",
          summary: "Weekend class.",
          sortOrder: 4,
        },
      ],
      recordings: [
        {
          id: "rec29",
          title: "hza-nrzu-dsa (2026-08-29 08:30 GMT+5:30)",
          url: "https://drive.google.com/file/d/rec29/view",
          dateIst: "2026-08-29",
          meetCode: "hza-nrzu-dsa",
        },
      ],
    });
    expect(pick.lessonId).toBe("l4");
    expect(pick.recordingId).toBe("rec29");
  });

  it("attaches the matched recording to a group class", () => {
    const pick = fallbackSessionBotPick({
      sessionNumber: 7,
      sessionDateIst: "2026-08-10",
      meetCode: "qqp-wfer-fzp",
      studentName: "Sameer Chakraborty",
      hasGroup: true,
      lessons,
      recordings: [
        {
          id: "rec7",
          title: "qqp-wfer-fzp (2026-08-10 08:55 GMT+5:30)",
          url: "https://drive.google.com/file/d/rec7/view",
          dateIst: "2026-08-10",
          meetCode: "qqp-wfer-fzp",
        },
      ],
    });
    expect(pick.lessonId).toBe("l7");
    expect(pick.recordingId).toBe("rec7");
    expect(pick.attachToGroup).toBe(true);
  });
});
