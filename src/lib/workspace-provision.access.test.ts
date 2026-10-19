import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrg: vi.fn(), createUser: vi.fn(), createMember: vi.fn(),
  findUser: vi.fn(), findOrg: vi.fn(), updateOrg: vi.fn(),
  apply: vi.fn(), billing: vi.fn(), welcome: vi.fn(), access: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: {
  organization: { create: mocks.createOrg, findUnique: mocks.findOrg, update: mocks.updateOrg },
  user: { findUnique: mocks.findUser, create: mocks.createUser },
  membership: { findUnique: async () => null, create: mocks.createMember },
} }));
vi.mock("@/lib/org-slug", () => ({ createUniqueOrganizationSlug: async () => "client-demo" }));
vi.mock("bcryptjs", () => ({ default: { hash: async () => "test-password-hash" } }));
vi.mock("@/lib/organization-plan", () => ({ applyOrganizationEntitlements: mocks.apply }));
vi.mock("@/lib/billing/invoices", () => ({ ensureOrganizationBilling: mocks.billing, ensureOnboardingTasks: async () => {}, markOnboardingTask: async () => {} }));
vi.mock("@/lib/integrations/email", () => ({ sendTeamWelcomeEmail: mocks.welcome, sendTeamWorkspaceAccessEmail: mocks.access, emailStatusMessage: () => "Prepared" }));
import { provisionClientWorkspace, manageClientWorkspace } from "@/lib/workspace-provision";

const input = { businessName: "Test Client", ownerName: "Client Owner", ownerEmail: "owner@example.test", invitedByName: "Operator", bundle: "business_enterprise", demoTrial: true, selectedModules: ["CRM"], selectedSuiteParts: ["fms"], maxMembers: 3, maxFmsTemplates: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createOrg.mockResolvedValue({ id: "new", name: "Test Client", slug: "client-demo" });
  mocks.findUser.mockResolvedValue(null);
  mocks.createUser.mockResolvedValue({ id: "new-owner" });
  mocks.welcome.mockResolvedValue({ sent: true });
  mocks.access.mockResolvedValue({ sent: true });
});

describe("trial provisioning preserves selected access", () => {
  it.each([false, true])("saves only CRM for an existing-user=%s trial", async (existing) => {
    if (existing) mocks.findUser.mockResolvedValue({ id: "existing" });
    expect((await provisionClientWorkspace(input)).ok).toBe(true);
    expect(mocks.createOrg.mock.calls[0][0].data).toMatchObject({ plan: "BUSINESS_ENTERPRISE", planStatus: "TRIAL", allowedModules: ["CRM"], allowedSuiteParts: [] });
    expect(mocks.apply.mock.calls[0][1]).toMatchObject({ allowedModules: ["CRM"], status: "TRIAL" });
    const member = existing ? mocks.createMember.mock.calls[0][0].data : mocks.createUser.mock.calls[0][0].data.memberships.create;
    expect(member.modules).toEqual(["CRM"]);
    expect(member.enabledBciSubModules).toEqual([]);
    expect(mocks.billing).not.toHaveBeenCalled();
  });

  it("does not fall back to a bundle when all modules are unchecked", async () => {
    expect((await provisionClientWorkspace({ ...input, selectedModules: [] })).ok).toBe(true);
    expect(mocks.createOrg.mock.calls[0][0].data.allowedModules).toEqual([]);
    expect(mocks.createUser.mock.calls[0][0].data.memberships.create.modules).toEqual([]);
  });

  it("rejects out-of-plan grants before creating anything", async () => {
    expect((await provisionClientWorkspace({ ...input, selectedModules: ["FLEET"] })).ok).toBe(false);
    expect(mocks.createOrg).not.toHaveBeenCalled();
    expect(mocks.welcome).not.toHaveBeenCalled();
  });

  it("converts a trial without adding the rest of the plan", async () => {
    mocks.findOrg.mockResolvedValue({ id: "new", name: "Test Client", slug: "client-demo", isPrimary: false, status: "ACTIVE", plan: "BUSINESS_ENTERPRISE", product: "WORKSPACE", allowedModules: ["CRM"], maxMembers: 3, maxFmsTemplates: 0, planStatus: "TRIAL", organizationPlan: { status: "TRIAL", trialEndsAt: new Date() } });
    expect((await manageClientWorkspace({ workspaceId: "new", intent: "convert_demo" })).ok).toBe(true);
    expect(mocks.apply.mock.calls[0][1]).toMatchObject({ allowedModules: ["CRM"], status: "ACTIVE", trialEndsAt: null });
  });
});
