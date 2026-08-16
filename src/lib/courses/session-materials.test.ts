import { describe, expect, it } from "vitest";
import {
  materialHref,
  normalizeTrainingContentUrl,
} from "@/lib/courses/session-materials";

describe("normalizeTrainingContentUrl", () => {
  it("accepts a Drive recording link", () => {
    expect(
      normalizeTrainingContentUrl(
        "https://drive.google.com/file/d/abc123/view?usp=sharing",
      ),
    ).toBe("https://drive.google.com/file/d/abc123/view?usp=sharing");
  });

  it("rejects a non-https value", () => {
    expect(normalizeTrainingContentUrl("ftp://files.example.com/a")).toBeNull();
  });
});

describe("materialHref", () => {
  it("uses the stored url when present", () => {
    expect(
      materialHref({ id: "m1", url: "https://youtu.be/abc" }),
    ).toBe("https://youtu.be/abc");
  });

  it("falls back to the download route for uploaded files", () => {
    expect(materialHref({ id: "m1", url: null })).toBe(
      "/api/learn/materials/m1",
    );
  });
});
