import { describe, expect, it } from "vitest";
import {
  canUseSuspendedWorkspace,
  canUseSuspendedWorkspaceApi,
  isOrganizationOperational,
} from "@/lib/org-access";

describe("org access for HOLD / INACTIVE", () => {
  it("treats only ACTIVE as operational", () => {
    expect(isOrganizationOperational("ACTIVE")).toBe(true);
    expect(isOrganizationOperational("ONBOARDING")).toBe(false);
    expect(isOrganizationOperational("HOLD")).toBe(false);
    expect(isOrganizationOperational("INACTIVE")).toBe(false);
  });

  it("lets HOLD admins open billing, not tasks", () => {
    expect(
      canUseSuspendedWorkspace({
        status: "HOLD",
        role: "ADMIN",
        isSuperAdmin: false,
        pathname: "/app/billing",
      }),
    ).toBe(true);
    expect(
      canUseSuspendedWorkspace({
        status: "HOLD",
        role: "ADMIN",
        isSuperAdmin: false,
        pathname: "/app/tasks",
      }),
    ).toBe(false);
    expect(
      canUseSuspendedWorkspace({
        status: "HOLD",
        role: "STAFF",
        isSuperAdmin: false,
        pathname: "/app/billing",
      }),
    ).toBe(false);
  });

  it("keeps /app open so the pending screen can render", () => {
    expect(
      canUseSuspendedWorkspace({
        status: "INACTIVE",
        role: "STAFF",
        isSuperAdmin: false,
        pathname: "/app",
      }),
    ).toBe(true);
  });

  it("blocks HOLD APIs except super-admin", () => {
    expect(
      canUseSuspendedWorkspaceApi({
        status: "HOLD",
        role: "OWNER",
        isSuperAdmin: false,
        pathname: "/api/tasks/export",
      }),
    ).toBe(false);
    expect(
      canUseSuspendedWorkspaceApi({
        status: "HOLD",
        role: "OWNER",
        isSuperAdmin: true,
        pathname: "/api/tasks/export",
      }),
    ).toBe(true);
  });
});
