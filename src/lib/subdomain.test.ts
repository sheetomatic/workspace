import { describe, expect, it } from "vitest";
import {
  isAppBuilderAuthIntent,
  isAppBuilderStudioPath,
  isWorkspaceAppPath,
  isWorkspacePath,
} from "@/lib/subdomain";

describe("isWorkspaceAppPath", () => {
  it("matches /app and /app/*, not marketing /app-builder", () => {
    expect(isWorkspaceAppPath("/app")).toBe(true);
    expect(isWorkspaceAppPath("/app/app-builder")).toBe(true);
    expect(isWorkspaceAppPath("/app-builder")).toBe(false);
    expect(isWorkspacePath("/app-builder")).toBe(false);
    expect(isWorkspacePath("/login")).toBe(true);
  });
});

describe("isAppBuilderAuthIntent", () => {
  it("keeps App Builder on workspace, not a tenant login", () => {
    expect(isAppBuilderStudioPath("/app/app-builder")).toBe(true);
    expect(isAppBuilderStudioPath("/app-builder")).toBe(false);
    const params = new URLSearchParams(
      "product=app-builder&callbackUrl=%2Fapp%2Fapp-builder",
    );
    expect(isAppBuilderAuthIntent("/login", params)).toBe(true);
    expect(isAppBuilderAuthIntent("/login", new URLSearchParams())).toBe(false);
  });
});
