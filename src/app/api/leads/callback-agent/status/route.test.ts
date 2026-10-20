import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ session: vi.fn(), members: vi.fn(), credentials: vi.fn(), heartbeat: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getSessionUser: mocks.session }));
vi.mock("@/lib/db", () => ({ prisma: { membership: { findMany: mocks.members }, cronHeartbeat: { findUnique: mocks.heartbeat } } }));
vi.mock("@/lib/platform", () => ({ PRIMARY_ORG_SLUG: "sheetomatic-technologies" }));
vi.mock("@/lib/whatsapp-settings", () => ({ resolveWorkspaceWhatsAppCredentials: mocks.credentials }));

describe("callback readiness access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ role: "OWNER", organizationId: "org", organizationSlug: "sheetomatic-technologies" });
    mocks.members.mockResolvedValue([{ userId: "sumit", role: "STAFF", user: { name: "Sumit Chandra" } }]);
    mocks.credentials.mockResolvedValue({ businessPhone: "919685788980", redlavaPhoneId: "id", redlavaApiKey: "must-not-leak" });
    mocks.heartbeat.mockResolvedValue(null);
  });
  it("requires login", async () => {
    mocks.session.mockResolvedValue(null); expect((await GET()).status).toBe(401);
    expect(mocks.credentials).not.toHaveBeenCalled();
  });
  it.each([
    { role: "STAFF", organizationSlug: "sheetomatic-technologies" },
    { role: "OWNER", organizationSlug: "another-tenant" },
  ])("denies other roles/tenants", async (user) => {
    mocks.session.mockResolvedValue(user); expect((await GET()).status).toBe(403);
    expect(mocks.members).not.toHaveBeenCalled();
  });
  it("returns readiness, not secrets or a false provider-verification claim", async () => {
    const response = await GET(); const text = await response.text(); const result = JSON.parse(text);
    expect(result.assigneeCandidates).toEqual([{ id: "sumit", name: "Sumit Chandra" }]);
    expect(result.senderMatchesRequestedNumber).toBe(true);
    expect(result.officialCredentialsPresent).toBe(true);
    expect(result.providerAuthorizationTested).toBe(false);
    expect(text).not.toContain("must-not-leak");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
