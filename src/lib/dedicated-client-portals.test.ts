import { describe, expect, it } from "vitest";
import {
  getDedicatedClientPortal,
  isLegalCasesOrganization,
  isTasksDedicatedPortal,
} from "@/lib/dedicated-client-portals";

describe("dedicated client portals", () => {
  it("keeps Hingorani as the legal portal", () => {
    expect(isLegalCasesOrganization("hingorani")).toBe(true);
    expect(isTasksDedicatedPortal("hingorani")).toBe(false);
  });

  it("registers Anmol Traders as a separate Tasks portal", () => {
    const portal = getDedicatedClientPortal("anmol-traders");
    expect(portal?.kind).toBe("tasks");
    expect(portal?.homePath).toBe("/app/tasks");
    expect(portal?.allowedModules).toEqual(["TASKS"]);
    expect(isLegalCasesOrganization("anmol-traders")).toBe(false);
    expect(isTasksDedicatedPortal("anmol-traders")).toBe(true);
  });

  it("treats the short Anmol slug as the same Tasks portal", () => {
    expect(getDedicatedClientPortal("anmol")?.slug).toBe("anmol-traders");
    expect(isTasksDedicatedPortal("anmol")).toBe(true);
  });
});
