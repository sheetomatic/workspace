import { describe, expect, it } from "vitest";
import {
  buildGroupLoginShareText,
  buildStudentLoginShareText,
  normalizeGroupJoinUrl,
  studentLearnLoginUrl,
} from "@/lib/learn/group-class";

const origin = "https://learn.sheetomatic.com";

describe("normalizeGroupJoinUrl", () => {
  it("accepts a Google Meet link and strips trailing punctuation", () => {
    expect(normalizeGroupJoinUrl("https://meet.google.com/abc-defg-hij.")).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
  });

  it("accepts a pasted sentence that contains a join URL", () => {
    expect(
      normalizeGroupJoinUrl("Join here https://meet.google.com/xyz-abcd-efg thanks"),
    ).toBe("https://meet.google.com/xyz-abcd-efg");
  });

  it("rejects non-https or empty values", () => {
    expect(normalizeGroupJoinUrl("")).toBeNull();
    expect(normalizeGroupJoinUrl("meet.google.com/abc-defg-hij")).toBe(
      "https://meet.google.com/abc-defg-hij",
    );
    expect(normalizeGroupJoinUrl("http://evil.example/join")).toBeNull();
  });
});

describe("student login share text", () => {
  it("copies email, WhatsApp, and token link — no password", () => {
    const text = buildStudentLoginShareText({
      name: "Samir",
      email: "samir@example.com",
      phone: "9876543210",
      bookingToken: "tok_samir",
      origin,
    });
    expect(text).toContain("Sheetomatic Learn — student login");
    expect(text).toContain("Name: Samir");
    expect(text).toContain("Email: samir@example.com");
    expect(text).toContain("WhatsApp: 9876543210");
    expect(text).toContain(
      "Open: https://learn.sheetomatic.com/learn/login?token=tok_samir",
    );
    expect(text).toContain(
      "Or learn.sheetomatic.com/learn/login with email + WhatsApp number.",
    );
    expect(text.toLowerCase()).not.toContain("password");
  });

  it("includes the group Meet URL when set", () => {
    const text = buildStudentLoginShareText({
      name: "Hilal",
      email: "hilal@example.com",
      phone: "9123456780",
      bookingToken: "tok_hilal",
      groupMeetUrl: "https://meet.google.com/grp-meet-url",
      groupLabel: "Tuesday evening",
      origin,
    });
    expect(text).toContain(
      "Join group class (Tuesday evening): https://meet.google.com/grp-meet-url",
    );
  });

  it("builds a multi-student paste with one group link", () => {
    const text = buildGroupLoginShareText([
      {
        name: "Samir",
        email: "samir@example.com",
        phone: "9876543210",
        bookingToken: "tok_samir",
        groupMeetUrl: "https://meet.google.com/grp-meet-url",
        groupLabel: "Group A",
        origin,
      },
      {
        name: "Hilal",
        email: "hilal@example.com",
        phone: "9123456780",
        bookingToken: "tok_hilal",
        groupMeetUrl: "https://meet.google.com/grp-meet-url",
        groupLabel: "Group A",
        origin,
      },
    ]);
    expect(text).toContain("Sheetomatic Learn — group class logins");
    expect(text).toContain("Group: Group A");
    expect(text.match(/Join group class:/g)?.length).toBe(1);
    expect(text).toContain("Name: Samir");
    expect(text).toContain("Name: Hilal");
    expect(studentLearnLoginUrl("tok_x", origin)).toBe(
      "https://learn.sheetomatic.com/learn/login?token=tok_x",
    );
  });
});
