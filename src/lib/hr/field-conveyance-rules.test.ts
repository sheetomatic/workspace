import { describe, expect, it } from "vitest";
import {
  canProcessFieldConveyancePayment,
  canReadFieldConveyanceAttachment,
  canResubmitFieldConveyance,
  canReviewFieldConveyance,
  canTransitionFieldConveyance,
  fieldConveyanceScope,
  hasRequiredConveyanceProofs,
  isFieldDirectorRole,
} from "@/lib/hr/field-conveyance-rules";

const pending = {
  claimantUserId: "staff-1",
  status: "PENDING" as const,
  reviewedByUserId: null,
};

describe("field conveyance authorization and state transitions", () => {
  it("scopes claims to the session organization and optionally the claimant", () => {
    expect(fieldConveyanceScope("org-a")).toEqual({ organizationId: "org-a" });
    expect(fieldConveyanceScope("org-a", "staff-1")).toEqual({
      organizationId: "org-a",
      claimantUserId: "staff-1",
    });
  });

  it("allows manager approval, blocks staff and self-approval", () => {
    expect(
      canReviewFieldConveyance(
        { userId: "manager-1", role: "MANAGER", department: "OPERATIONS" },
        pending,
      ),
    ).toBe(true);
    expect(
      canReviewFieldConveyance(
        { userId: "staff-2", role: "STAFF", department: "ACCOUNTS" },
        pending,
      ),
    ).toBe(false);
    expect(
      canReviewFieldConveyance(
        { userId: "staff-1", role: "OWNER", department: null },
        pending,
      ),
    ).toBe(false);
  });

  it("maps Director to existing admin/owner roles rather than designation text", () => {
    expect(isFieldDirectorRole("ADMIN")).toBe(true);
    expect(isFieldDirectorRole("OWNER")).toBe(true);
    expect(isFieldDirectorRole("MANAGER")).toBe(false);
    expect(isFieldDirectorRole("STAFF")).toBe(false);
  });

  it("restricts payment recording to Accounts or workspace leadership after approval", () => {
    const approved = { ...pending, status: "APPROVED" as const, reviewedByUserId: "manager-1" };
    expect(
      canProcessFieldConveyancePayment(
        { userId: "accounts-1", role: "STAFF", department: "ACCOUNTS" },
        approved,
      ),
    ).toBe(true);
    expect(
      canProcessFieldConveyancePayment(
        { userId: "viewer-1", role: "VIEWER", department: "ACCOUNTS" },
        approved,
      ),
    ).toBe(false);
    expect(
      canProcessFieldConveyancePayment(
        { userId: "manager-1", role: "MANAGER", department: "ACCOUNTS" },
        approved,
      ),
    ).toBe(false);
    expect(
      canProcessFieldConveyancePayment(
        { userId: "accounts-1", role: "STAFF", department: "ACCOUNTS" },
        { ...approved, status: "PAID" },
      ),
    ).toBe(false);
  });

  it("limits Accounts attachment access to approved claims while keeping claimant and Manager access", () => {
    const accounts = { userId: "accounts-1", role: "STAFF" as const, department: "ACCOUNTS" };
    expect(canReadFieldConveyanceAttachment(accounts, pending)).toBe(false);
    expect(canReadFieldConveyanceAttachment(accounts, { ...pending, status: "APPROVED" })).toBe(true);
    expect(canReadFieldConveyanceAttachment(accounts, { ...pending, status: "PAID" })).toBe(true);
    expect(
      canReadFieldConveyanceAttachment(
        { userId: "staff-1", role: "STAFF", department: "SALES" },
        pending,
      ),
    ).toBe(true);
    expect(
      canReadFieldConveyanceAttachment(
        { userId: "manager-1", role: "MANAGER", department: "OPERATIONS" },
        pending,
      ),
    ).toBe(true);
  });

  it("requires journey proof and bill, and allows only rejected claims to be resubmitted by their owner", () => {
    expect(hasRequiredConveyanceProofs([{ kind: "BILL" }])).toBe(false);
    expect(
      hasRequiredConveyanceProofs([
        { kind: "JOURNEY_PROOF" },
        { kind: "BILL" },
      ]),
    ).toBe(true);
    expect(
      canResubmitFieldConveyance(
        { userId: "staff-1", role: "STAFF", department: "SALES" },
        { ...pending, status: "REJECTED" },
      ),
    ).toBe(true);
    expect(
      canResubmitFieldConveyance(
        { userId: "staff-2", role: "STAFF", department: "SALES" },
        { ...pending, status: "REJECTED" },
      ),
    ).toBe(false);
  });

  it("prevents duplicate decisions and duplicate payment transitions", () => {
    expect(canTransitionFieldConveyance("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionFieldConveyance("REJECTED", "PENDING")).toBe(true);
    expect(canTransitionFieldConveyance("APPROVED", "PAID")).toBe(true);
    expect(canTransitionFieldConveyance("PAID", "PAID")).toBe(false);
    expect(canTransitionFieldConveyance("APPROVED", "REJECTED")).toBe(false);
  });
});
