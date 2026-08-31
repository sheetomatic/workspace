import { describe, expect, it } from "vitest";
import { isWorkspaceAppPath, isWorkspacePath } from "@/lib/subdomain";

describe("isWorkspaceAppPath", () => {
  it("matches /app and /app/*, not leftover marketing paths", () => {
    expect(isWorkspaceAppPath("/app")).toBe(true);
    expect(isWorkspaceAppPath("/app/tasks")).toBe(true);
    expect(isWorkspaceAppPath("/app-builder")).toBe(false);
    expect(isWorkspacePath("/app-builder")).toBe(false);
    expect(isWorkspacePath("/login")).toBe(true);
  });
});
