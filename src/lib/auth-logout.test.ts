import { NextResponse } from "next/server";
import { afterEach, describe, expect, it } from "vitest";
import {
  applySignedOutCookies,
  logoutHref,
  safeLogoutCallback,
} from "@/lib/auth-logout";

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

describe("applySignedOutCookies", () => {
  const previousDomain = process.env.AUTH_COOKIE_DOMAIN;

  afterEach(() => {
    if (previousDomain === undefined) {
      delete process.env.AUTH_COOKIE_DOMAIN;
    } else {
      process.env.AUTH_COOKIE_DOMAIN = previousDomain;
    }
  });

  it("expires host and domain session cookies", () => {
    process.env.AUTH_COOKIE_DOMAIN = ".sheetomatic.com";
    const response = NextResponse.redirect("https://anmol-traders.sheetomatic.com/login");
    applySignedOutCookies(response);
    const cookies = response.headers.getSetCookie();
    expect(
      cookies.some(
        (cookie) =>
          cookie.startsWith("authjs.session-token=") &&
          !cookie.includes("Domain="),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (cookie) =>
          cookie.startsWith("__Secure-authjs.session-token=") &&
          cookie.includes("Domain=.sheetomatic.com") &&
          cookie.includes("Secure"),
      ),
    ).toBe(true);
  });
});
