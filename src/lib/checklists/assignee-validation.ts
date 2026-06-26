export type ChecklistAssigneeErrorCode =
  | "MISSING_ASSIGNEE"
  | "ASSIGNEE_NOT_IN_ORG";

export type ChecklistAssigneeValidationResult =
  | { ok: true; assigneeUserId: string }
  | { ok: false; code: ChecklistAssigneeErrorCode; message: string };

/** Validate assignee user id from form input before org membership lookup. */
export function validateChecklistAssigneeInput(
  assigneeUserId: string | null | undefined,
): ChecklistAssigneeValidationResult {
  const trimmed = assigneeUserId?.trim() ?? "";
  if (!trimmed) {
    return {
      ok: false,
      code: "MISSING_ASSIGNEE",
      message: "Title and doer are required.",
    };
  }
  return { ok: true, assigneeUserId: trimmed };
}

/** Validate assignee membership exists for the current organization. */
export function validateChecklistAssigneeMembership(
  membership: { id: string } | null,
): ChecklistAssigneeValidationResult {
  if (!membership) {
    return {
      ok: false,
      code: "ASSIGNEE_NOT_IN_ORG",
      message: "Selected doer must be a member of this workspace.",
    };
  }
  return { ok: true, assigneeUserId: "" };
}

export async function resolveChecklistAssigneeForOrg(
  organizationId: string,
  assigneeUserId: string,
  findMembership: (args: {
    organizationId: string;
    userId: string;
  }) => Promise<{ id: string } | null>,
): Promise<ChecklistAssigneeValidationResult> {
  const input = validateChecklistAssigneeInput(assigneeUserId);
  if (!input.ok) {
    return input;
  }

  const membership = await findMembership({
    organizationId,
    userId: input.assigneeUserId,
  });

  const membershipResult = validateChecklistAssigneeMembership(membership);
  if (!membershipResult.ok) {
    return membershipResult;
  }

  return { ok: true, assigneeUserId: input.assigneeUserId };
}
