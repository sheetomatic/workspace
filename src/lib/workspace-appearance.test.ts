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
    expect(merged.primary).toBe("#111113");
  });

  it("upgrades the old default-blue preset to Glide ink", () => {
    const merged = mergeWorkspaceAppearance(
      {
        preset: "default",
        primary: "#2563eb",
        sidebar: "#0d47a1",
        sidebarHover: "#1565c0",
        background: "#f1f5f9",
      },
      "Sheetomatic",
    );
    expect(merged.primary).toBe("#111113");
    expect(merged.sidebar).toBe("#111113");
    expect(merged.background).toBe("#eceef2");
  });

  it("keeps a non-default preset's colors", () => {
    const merged = mergeWorkspaceAppearance(
      {
        preset: "ocean",
        primary: "#0891b2",
        sidebar: "#082f49",
        sidebarHover: "#0e4d6e",
        background: "#ecfeff",
      },
      "Sheetomatic",
    );
    expect(merged.primary).toBe("#0891b2");
    expect(merged.sidebar).toBe("#082f49");
  });
});
