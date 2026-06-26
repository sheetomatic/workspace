import { describe, expect, it } from "vitest";
import {
  resolveChecklistAssigneeForOrg,
  validateChecklistAssigneeInput,
  validateChecklistAssigneeMembership,
} from "./assignee-validation";

describe("validateChecklistAssigneeInput", () => {
  it("rejects missing assignee", () => {
    expect(validateChecklistAssigneeInput("")).toEqual({
      ok: false,
      code: "MISSING_ASSIGNEE",
      message: "Title and doer are required.",
    });
  });

  it("rejects whitespace-only assignee", () => {
    expect(validateChecklistAssigneeInput("   ")).toEqual({
      ok: false,
      code: "MISSING_ASSIGNEE",
      message: "Title and doer are required.",
    });
  });

  it("accepts valid assignee id", () => {
    expect(validateChecklistAssigneeInput("user-123")).toEqual({
      ok: true,
      assigneeUserId: "user-123",
    });
  });
});

describe("validateChecklistAssigneeMembership", () => {
  it("rejects cross-tenant assignee", () => {
    expect(validateChecklistAssigneeMembership(null)).toEqual({
      ok: false,
      code: "ASSIGNEE_NOT_IN_ORG",
      message: "Selected doer must be a member of this workspace.",
    });
  });

  it("accepts org member", () => {
    expect(validateChecklistAssigneeMembership({ id: "mem-1" }).ok).toBe(true);
  });
});

describe("resolveChecklistAssigneeForOrg", () => {
  it("rejects missing assignee without db lookup", async () => {
    const findMembership = async () => ({ id: "mem-1" });
    const result = await resolveChecklistAssigneeForOrg(
      "org-a",
      "",
      findMembership,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MISSING_ASSIGNEE");
    }
  });

  it("rejects assignee from another org", async () => {
    const findMembership = async () => null;
    const result = await resolveChecklistAssigneeForOrg(
      "org-a",
      "user-b",
      findMembership,
    );
    expect(result).toEqual({
      ok: false,
      code: "ASSIGNEE_NOT_IN_ORG",
      message: "Selected doer must be a member of this workspace.",
    });
  });

  it("accepts valid org assignee", async () => {
    const findMembership = async ({
      organizationId,
      userId,
    }: {
      organizationId: string;
      userId: string;
    }) => {
      expect(organizationId).toBe("org-a");
      expect(userId).toBe("user-a");
      return { id: "mem-1" };
    };
    const result = await resolveChecklistAssigneeForOrg(
      "org-a",
      "user-a",
      findMembership,
    );
    expect(result).toEqual({ ok: true, assigneeUserId: "user-a" });
  });
});
