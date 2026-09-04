import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, findMany, compare } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: { compare },
}));

vi.mock("@/lib/db", () => ({
  withDbRetry: async (fn: (db: {
    user: { findUnique: typeof findUnique };
    organization: { findMany: typeof findMany };
    membership: { findMany: typeof findMany };
  }) => unknown) =>
    fn({
      user: { findUnique },
      organization: { findMany },
      membership: { findMany },
    }),
}));

import { resolveOrganizationsForCredentials } from "@/lib/auth-orgs";

describe("resolveOrganizationsForCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findMany.mockReset();
    compare.mockReset();
    compare.mockResolvedValue(true);
  });

  it("returns null when the password does not match", async () => {
    findUnique.mockResolvedValue({
      passwordHash: "hash",
      isSuperAdmin: false,
      memberships: [],
    });
    compare.mockResolvedValue(false);

    await expect(
      resolveOrganizationsForCredentials("owner@acme.demo", "wrong"),
    ).resolves.toBeNull();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("returns an empty list when credentials are valid but no org is active", async () => {
    findUnique.mockResolvedValue({
      passwordHash: "hash",
      isSuperAdmin: false,
      memberships: [
        {
          role: "STAFF",
          organization: { slug: "held", name: "Held", status: "HOLD" },
        },
      ],
    });

    await expect(
      resolveOrganizationsForCredentials("staff@held.demo", "ok"),
    ).resolves.toEqual([]);
  });

  it("loads only slug/name/isPrimary for a super admin", async () => {
    findUnique.mockResolvedValue({
      passwordHash: "hash",
      isSuperAdmin: true,
      memberships: [
        {
          role: "OWNER",
          organization: {
            slug: "sheetomatic-technologies",
            name: "Sheetomatic",
            status: "ACTIVE",
          },
        },
      ],
    });
    findMany.mockResolvedValue([
      { slug: "sheetomatic-technologies", name: "Sheetomatic", isPrimary: true },
      { slug: "acme", name: "Acme", isPrimary: false },
    ]);

    await expect(
      resolveOrganizationsForCredentials("founder@sheetomatic.com", "ok"),
    ).resolves.toEqual([
      {
        slug: "sheetomatic-technologies",
        name: "Sheetomatic",
        role: "SUPER_ADMIN",
        isPrimary: true,
      },
      { slug: "acme", name: "Acme", role: "SUPER_ADMIN", isPrimary: false },
    ]);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: { slug: true, name: true, isPrimary: true },
      }),
    );
  });

  it("falls back to memberships when the super-admin org list throws", async () => {
    findUnique.mockResolvedValue({
      passwordHash: "hash",
      isSuperAdmin: true,
      memberships: [
        {
          role: "OWNER",
          organization: {
            slug: "sheetomatic-technologies",
            name: "Sheetomatic",
            status: "ACTIVE",
          },
        },
      ],
    });
    findMany.mockRejectedValue(new Error("pool timeout"));

    await expect(
      resolveOrganizationsForCredentials("founder@sheetomatic.com", "ok"),
    ).resolves.toEqual([
      {
        slug: "sheetomatic-technologies",
        name: "Sheetomatic",
        role: "OWNER",
      },
    ]);
  });
});
