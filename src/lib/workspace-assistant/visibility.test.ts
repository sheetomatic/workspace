import { describe, expect, it } from "vitest";
import { shouldShowWorkspaceAssistant } from "@/lib/workspace-assistant/visibility";

describe("shouldShowWorkspaceAssistant", () => {
  it("shows Pulse on Workspace modules", () => {
    expect(
      shouldShowWorkspaceAssistant("/app/tasks", "workspace.sheetomatic.com"),
    ).toBe(true);
  });
});
