import { redirect } from "next/navigation";
import { AiOnboardingFlow } from "@/components/saas/ai-onboarding-flow";
import { shouldSkipAiOnboarding } from "@/lib/ai-onboarding";
import { requireSession } from "@/lib/require-session";
import { prisma } from "@/lib/db";

export default async function SheetomaticAiOnboardingPage() {
  const user = await requireSession("VIEWER", { redirectTo: "/ai/app" });

  if (await shouldSkipAiOnboarding(user.organizationId)) {
    redirect("/ai/app");
  }

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    select: { name: true },
  });

  return (
    <AiOnboardingFlow defaultBusinessName={organization?.name ?? "My business"} />
  );
}
