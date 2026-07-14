import { describe, expect, it } from "vitest";
import {
  phonesMatch,
  selectFormResponseForPhone,
  type ParsedFormResponse,
} from "@/lib/integrations/google-form-responses-sheet";

function row(
  partial: Partial<ParsedFormResponse> & { name: string },
): ParsedFormResponse {
  return {
    allValues: [],
    ...partial,
  };
}

describe("phonesMatch", () => {
  it("matches last-10 digits across formats", () => {
    expect(phonesMatch("919343488623", "+91 93434 88623")).toBe(true);
    expect(phonesMatch("9343488623", "919343488623")).toBe(true);
  });

  it("rejects short or unrelated numbers", () => {
    expect(phonesMatch("12345", "67890")).toBe(false);
    expect(phonesMatch("919343488623", "919329103106")).toBe(false);
  });
});

describe("selectFormResponseForPhone", () => {
  const digeshwar = row({
    name: "Digeshwar",
    phone: "919343488623",
    timestamp: "2026-07-14T12:00:00.000Z",
  });
  const sushma = row({
    name: "Sushma",
    phone: "919876543210",
    timestamp: "2026-07-14T12:05:00.000Z",
    allValues: ["Sushma", "919343488623", "note"],
  });

  it("matches phone column only — ignores phone buried in allValues", () => {
    const picked = selectFormResponseForPhone(
      [sushma, digeshwar],
      "919343488623",
    );
    expect(picked?.name).toBe("Digeshwar");
  });

  it("returns null when only allValues had a coincidental phone", () => {
    const picked = selectFormResponseForPhone([sushma], "919343488623");
    expect(picked).toBeNull();
  });

  it("requires parseable recent timestamp when since is set", () => {
    const since = new Date("2026-07-14T06:00:00.000Z");
    const noTs = row({ name: "Digeshwar", phone: "919343488623" });
    expect(
      selectFormResponseForPhone([noTs], "919343488623", { since }),
    ).toBeNull();

    const recent = row({
      name: "Digeshwar",
      phone: "919343488623",
      timestamp: "2026-07-14T14:00:00.000Z",
    });
    expect(
      selectFormResponseForPhone([recent], "919343488623", { since })?.name,
    ).toBe("Digeshwar");
  });

  it("does not fall back to an older/unrelated row when since has no match", () => {
    const since = new Date("2026-07-14T10:00:00.000Z");
    const old = row({
      name: "Sushma",
      phone: "919343488623",
      timestamp: "2026-07-13T08:00:00.000Z",
    });
    expect(selectFormResponseForPhone([old], "919343488623", { since })).toBeNull();
  });
});
