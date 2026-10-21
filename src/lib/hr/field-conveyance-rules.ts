export type FieldConveyanceStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";
export type FieldConveyanceRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

export type FieldConveyanceActor = {
  userId: string;
  role: FieldConveyanceRole;
  department: string | null;
};

export type FieldConveyanceClaimSummary = {
  claimantUserId: string;
  status: FieldConveyanceStatus;
  reviewedByUserId: string | null;
};

export function canReviewFieldConveyance(
  actor: FieldConveyanceActor,
  claim: FieldConveyanceClaimSummary,
) {
  const hasApproverRole = ["MANAGER", "ADMIN", "OWNER"].includes(actor.role);
  return hasApproverRole && actor.userId !== claim.claimantUserId && claim.status === "PENDING";
}

/** Directors are represented by the existing ADMIN/OWNER roles; designation text grants no access. */
export function isFieldDirectorRole(role: FieldConveyanceRole) {
  return role === "ADMIN" || role === "OWNER";
}

export function canProcessFieldConveyancePayment(
  actor: FieldConveyanceActor,
  claim: FieldConveyanceClaimSummary,
) {
  const hasAccountsRole =
    isFieldDirectorRole(actor.role) ||
    (actor.department === "ACCOUNTS" && actor.role !== "VIEWER");
  return (
    hasAccountsRole &&
    claim.status === "APPROVED" &&
    actor.userId !== claim.claimantUserId &&
    actor.userId !== claim.reviewedByUserId
  );
}

export function canReadFieldConveyanceAttachment(
  actor: FieldConveyanceActor,
  claim: { claimantUserId: string; status: FieldConveyanceStatus },
) {
  if (actor.userId === claim.claimantUserId) return true;
  if (["MANAGER", "ADMIN", "OWNER"].includes(actor.role)) return true;
  return (
    (isFieldDirectorRole(actor.role) ||
      (actor.department === "ACCOUNTS" && actor.role !== "VIEWER")) &&
    (claim.status === "APPROVED" || claim.status === "PAID")
  );
}

export function canResubmitFieldConveyance(
  actor: FieldConveyanceActor,
  claim: FieldConveyanceClaimSummary,
) {
  return actor.userId === claim.claimantUserId && claim.status === "REJECTED";
}

export function hasRequiredConveyanceProofs(
  attachments: { kind: "JOURNEY_PROOF" | "BILL" }[],
) {
  return (
    attachments.some((attachment) => attachment.kind === "JOURNEY_PROOF") &&
    attachments.some((attachment) => attachment.kind === "BILL")
  );
}

/** Every query uses the session organization; optional claimant scoping is additive. */
export function fieldConveyanceScope(organizationId: string, userId?: string) {
  return { organizationId, ...(userId ? { claimantUserId: userId } : {}) };
}

export function canTransitionFieldConveyance(
  from: FieldConveyanceStatus,
  to: FieldConveyanceStatus,
) {
  return (
    (from === "PENDING" && (to === "APPROVED" || to === "REJECTED")) ||
    (from === "REJECTED" && to === "PENDING") ||
    (from === "APPROVED" && to === "PAID")
  );
}
