import { describe, expect, it } from "vitest";
import { resolveFmsHomeHref } from "@/lib/workspace-modules";

describe("resolveFmsHomeHref", () => {
  it("sends managers to live pipelines", () => {
    expect(resolveFmsHomeHref({ role: "MANAGER" })).toBe("/app/fms/lines");
    expect(resolveFmsHomeHref({ role: "ADMIN" })).toBe("/app/fms/lines");
  });

  it("sends staff to their queue", () => {
    expect(resolveFmsHomeHref({ role: "STAFF" })).toBe("/app/fms/my-stops");
    expect(resolveFmsHomeHref({ role: "VIEWER" })).toBe("/app/fms/my-stops");
  });
});
