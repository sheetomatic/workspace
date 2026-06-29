import { describe, expect, it, vi, beforeEach } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    membership: {
      findFirst,
    },
  },
}));

import { isActiveOrgMember } from "./assignee-org";

describe("isActiveOrgMember", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  it("returns false for missing membership", async () => {
    findFirst.mockResolvedValue(null);
    await expect(isActiveOrgMember("org-a", "user-b")).resolves.toBe(false);
  });

  it("returns true for active membership", async () => {
    findFirst.mockResolvedValue({ id: "mem-1" });
    await expect(isActiveOrgMember("org-a", "user-a")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org-a",
          userId: "user-a",
          deactivatedAt: null,
        }),
      }),
    );
  });
});
