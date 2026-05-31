"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";

export async function completeAiOnboarding(input: {
  businessName: string;
  industry: string;
}) {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, "MANAGER")) {
    return { ok: false as const, message: "You do not have permission to finish setup." };
  }

  const businessName = input.businessName.trim();
  const industry = input.industry.trim();

  if (!businessName) {
    return { ok: false as const, message: "Business name is required." };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      name: businessName,
      ...(industry ? { industry } : {}),
      status: "ACTIVE",
    },
  });

  revalidatePath("/ai/app");
  revalidatePath("/ai/app/onboarding");

  return { ok: true as const };
}
