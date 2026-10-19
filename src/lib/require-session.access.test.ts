import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth";

const context = vi.hoisted(() => ({ user: null as SessionUser | null, pathname: "/app" }));
vi.mock("@/lib/auth", () => ({ getSessionUser: async () => context.user }));
vi.mock("@/lib/tenant-host", () => ({ getRequestPathname: async () => context.pathname }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`redirect:${to}`); } }));
import { requireSession } from "@/lib/require-session";

beforeEach(() => {
  context.user = { id: "u", email: "test@example.test", name: "Client", role: "OWNER", organizationId: "org", organizationSlug: "client", organizationName: "Client", organizationStatus: "ACTIVE", modules: ["CRM"], enabledBciSubModules: [], isSuperAdmin: false, isDepartmentHead: false, staffCode: null };
});

describe("server module guards", () => {
  it.each(["/app/fleet", "/app/em", "/app/fms/scores", "/app/checklists", "/app/pc/today", "/app/tasks"])("denies direct access to %s", async (path) => {
    context.pathname = path;
    await expect(requireSession()).rejects.toThrow("redirect:/app");
  });
  it("allows Suite EM without standalone Reports", async () => {
    context.pathname = "/app/em";
    context.user!.modules = ["FMS"];
    context.user!.enabledBciSubModules = ["em"];
    await expect(requireSession(undefined, { module: "REPORTS" })).resolves.toBe(context.user);
    context.pathname = "/app/reports";
    await expect(requireSession(undefined, { module: "REPORTS" })).rejects.toThrow();
  });
  it("allows only the selected task capability", async () => {
    context.pathname = "/app/tasks";
    context.user!.modules = ["FMS"];
    context.user!.enabledBciSubModules = ["taskDelegation"];
    await expect(requireSession(undefined, { module: "TASKS" })).resolves.toBe(context.user);
  });
  it("checks an action's explicit Suite permission independently of the page URL", async () => {
    context.pathname = "/app";
    context.user!.modules = ["FMS"];
    await expect(requireSession(undefined, { suitePart: "pc" })).rejects.toThrow();
  });
});
