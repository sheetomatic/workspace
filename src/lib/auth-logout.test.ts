import { describe, expect, it } from "vitest";
import { logoutHref, safeLogoutCallback } from "@/lib/auth-logout";

describe("safeLogoutCallback", () => {
  it("allows same-origin paths only", () => {
    expect(safeLogoutCallback("/login?error=session")).toBe(
      "/login?error=session",
    );
    expect(safeLogoutCallback("https://evil.example/phish")).toBe("/login");
    expect(safeLogoutCallback("//evil.example")).toBe("/login");
  });
});

describe("logoutHref", () => {
  it("points at the cookie-clearing route", () => {
    expect(logoutHref("/login")).toBe(
      "/api/auth/clear-session?callbackUrl=%2Flogin",
    );
  });
});
