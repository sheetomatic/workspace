import { describe, expect, it } from "vitest";
import {
  appearanceToCssVars,
  mergeWorkspaceAppearance,
  parseWorkspaceAppearance,
  sanitizeCssColor,
} from "@/lib/workspace-appearance";

describe("sanitizeCssColor", () => {
  it("accepts valid hex and functional colors", () => {
    expect(sanitizeCssColor("#fff", "#000")).toBe("#fff");
    expect(sanitizeCssColor("#1565c0", "#000")).toBe("#1565c0");
    expect(sanitizeCssColor("#12345678", "#000")).toBe("#12345678");
    expect(sanitizeCssColor("rgb(1, 2, 3)", "#000")).toBe("rgb(1, 2, 3)");
    expect(sanitizeCssColor("rgba(1,2,3,0.5)", "#000")).toBe("rgba(1,2,3,0.5)");
    expect(sanitizeCssColor("hsl(200 50% 40%)", "#000")).toBe("hsl(200 50% 40%)");
  });

  it("rejects style-block breakout and other injection payloads", () => {
    const fallback = "#0d47a1";
    expect(
      sanitizeCssColor("#fff } </style><script>alert(1)</script>", fallback),
    ).toBe(fallback);
    expect(sanitizeCssColor("red; background: url(x)", fallback)).toBe(fallback);
    expect(sanitizeCssColor("expression(alert(1))", fallback)).toBe(fallback);
    expect(sanitizeCssColor("javascript:alert(1)", fallback)).toBe(fallback);
    expect(sanitizeCssColor("", fallback)).toBe(fallback);
    expect(sanitizeCssColor(undefined, fallback)).toBe(fallback);
    expect(sanitizeCssColor({ toString: () => "#fff" }, fallback)).toBe(fallback);
  });

  it("neutralizes malicious stored colors on read + render", () => {
    const parsed = parseWorkspaceAppearance({
      preset: "custom",
      primary: "#fff}</style><script>alert(1)</script>",
      sidebar: "#0d47a1",
    });
    const merged = mergeWorkspaceAppearance(parsed, "Acme");
    const css = appearanceToCssVars(merged);
    expect(css).not.toContain("<script>");
    expect(css).not.toContain("</style>");
    // Falls back to a preset color instead of the payload.
    expect(merged.primary).toBe("#2563eb");
  });
});
