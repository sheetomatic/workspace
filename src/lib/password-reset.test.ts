import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "crypto";

const { findUnique, create, deleteMany, deleteToken } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  deleteMany: vi.fn(),
  deleteToken: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique },
    verificationToken: {
      findUnique,
      create,
      deleteMany,
      delete: deleteToken,
    },
  },
}));

import {
  consumePasswordResetToken,
  createPasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/password-reset";

describe("password reset tokens", () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    deleteMany.mockReset();
    deleteToken.mockReset();
  });

  it("hashes the stored token and returns the raw token once", async () => {
    findUnique.mockResolvedValueOnce({
      id: "user-1",
      email: "owner@acme.demo",
      passwordHash: "hash",
    });
    deleteMany.mockResolvedValue({ count: 0 });
    create.mockResolvedValue({});

    const created = await createPasswordResetToken("owner@acme.demo");
    expect(created?.token).toHaveLength(64);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        identifier: "password-reset:owner@acme.demo",
        token: hashPasswordResetToken(created!.token),
      }),
    });
    expect(create.mock.calls[0]?.[0].data.token).not.toBe(created?.token);
  });

  it("consumes by hashing the inbound token", async () => {
    const raw = "a".repeat(64);
    const hashed = hashPasswordResetToken(raw);
    findUnique
      .mockResolvedValueOnce({
        identifier: "password-reset:owner@acme.demo",
        token: hashed,
        expires: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        id: "user-1",
        email: "owner@acme.demo",
      });
    deleteToken.mockResolvedValue({});

    await expect(consumePasswordResetToken(raw)).resolves.toEqual({
      id: "user-1",
      email: "owner@acme.demo",
    });
    expect(findUnique).toHaveBeenNthCalledWith(1, {
      where: { token: hashed },
    });
  });

  it("uses sha256 so the same token always looks up", () => {
    const token = "abc123";
    expect(hashPasswordResetToken(token)).toBe(
      createHash("sha256").update(token).digest("hex"),
    );
  });
});
