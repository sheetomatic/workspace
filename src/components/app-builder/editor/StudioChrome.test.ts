import { describe, expect, it } from "vitest";
import { editorToSection } from "./StudioChrome";

describe("studio nav sections", () => {
  it("folds studio editors into four Apple-style links", () => {
    expect(editorToSection("layout")).toBe("app");
    expect(editorToSection("data")).toBe("data");
    expect(editorToSection("bots")).toBe("automate");
    expect(editorToSection("intelligence")).toBe("automate");
    expect(editorToSection("users")).toBe("people");
    expect(editorToSection("security")).toBe("people");
    expect(editorToSection("settings")).toBe("people");
  });
});
