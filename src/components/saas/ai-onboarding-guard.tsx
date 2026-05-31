"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AiOnboardingGuard({
  skipOnboarding,
  children,
}: {
  skipOnboarding: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (skipOnboarding && pathname.startsWith("/ai/app/onboarding")) {
      router.replace("/ai/app");
    }
  }, [skipOnboarding, pathname, router]);

  return children;
}
