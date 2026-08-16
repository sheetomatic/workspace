import { describe, expect, it } from "vitest";
import { lessonHasTeachingContent, toLessonEmbedUrl } from "@/lib/learn/media";

describe("toLessonEmbedUrl", () => {
  it("converts a YouTube watch link", () => {
    expect(toLessonEmbedUrl("https://www.youtube.com/watch?v=dQw4w9wgGcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9wgGcQ",
    );
  });

  it("converts a Drive file to preview", () => {
    expect(
      toLessonEmbedUrl("https://drive.google.com/file/d/abc123/view?usp=sharing"),
    ).toBe("https://drive.google.com/file/d/abc123/preview");
  });
});

describe("lessonHasTeachingContent", () => {
  it("is false when every teaching field is empty", () => {
    expect(lessonHasTeachingContent({ goal: "", bodyMd: "" })).toBe(false);
  });

  it("is true when the trainer wrote an outcome", () => {
    expect(lessonHasTeachingContent({ goal: "Build a VLOOKUP" })).toBe(true);
  });
});
