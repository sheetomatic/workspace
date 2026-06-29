import { prisma } from "@/lib/db";
import { activeAssigneeMembershipWhere } from "@/lib/checklists/assignee-validation";

/** Returns true when the user is an active member of the organization. */
export async function isActiveOrgMember(
  organizationId: string,
  userId: string,
) {
  const membership = await prisma.membership.findFirst({
    where: {
      organizationId,
      userId,
      ...activeAssigneeMembershipWhere,
    },
    select: { id: true },
  });
  return Boolean(membership);
}
