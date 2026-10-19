import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("trusted path used by workspace access checks", () => {
  it.each(["sheetomatic.com", "workspace.sheetomatic.com", "client-demo.sheetomatic.com", "learn.sheetomatic.com"])("overwrites a forged API pathname on %s", (host) => {
    const request = new NextRequest(`https://${host}/api/fleet/board`, { headers: {
      host, "x-pathname": "/app", "x-tenant-slug": "sheetomatic-technologies", "x-learn-portal": "1",
    } });
    const response = middleware(request);
    expect(response.headers.get("x-middleware-request-x-pathname")).toBe("/api/fleet/board");
    if (host === "client-demo.sheetomatic.com") expect(response.headers.get("x-middleware-request-x-tenant-slug")).toBe("client-demo");
    else expect(response.headers.get("x-middleware-request-x-tenant-slug")).toBeNull();
  });
  it("passes the tenant page pathname to server page guards", () => {
    const host = "client-demo.sheetomatic.com";
    const request = new NextRequest(`https://${host}/app/em`, { headers: { host, cookie: "authjs.session-token=test", "x-pathname": "/app" } });
    expect(middleware(request).headers.get("x-middleware-request-x-pathname")).toBe("/app/em");
  });
});
