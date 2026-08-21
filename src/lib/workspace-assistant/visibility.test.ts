import { describe, expect, it } from "vitest";
import { shouldShowWorkspaceAssistant } from "@/lib/workspace-assistant/visibility";

describe("shouldShowWorkspaceAssistant", () => {
  it("hides Pulse on App Builder studio", () => {
    expect(
      shouldShowWorkspaceAssistant(
        "/app/app-builder",
        "workspace.sheetomatic.com",
      ),
    ).toBe(false);
  });

  it("still shows Pulse on Workspace modules", () => {
    expect(
      shouldShowWorkspaceAssistant("/app/tasks", "workspace.sheetomatic.com"),
    ).toBe(true);
  });
});
