"use server";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { canManageSuperAdmins } from "@/lib/platform";

export async function loadInvoiceForViewer(invoiceId: string) {
  const user = await getSessionUser();
  if (!user) return null;

  const invoice = await prisma.subscriptionInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: { orderBy: { paidAt: "asc" } },
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          billing: true,
          organizationPlan: { select: { renewalAt: true } },
        },
      },
    },
  });
  if (!invoice) return null;

  const ownOrg =
    invoice.organizationId === user.organizationId &&
    hasMinimumRole(user.role, "ADMIN");
  const platform = canManageSuperAdmins(user, user.organizationSlug);
  if (!ownOrg && !platform) return null;
  return invoice;
}
