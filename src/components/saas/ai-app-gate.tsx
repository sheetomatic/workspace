"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAiOnboardingAnswers,
  type AiOnboardingAnswers,
} from "@/lib/ai-onboarding-storage";
import { AiDashboardPanel } from "@/components/saas/ai-dashboard-panel";

type DashboardStats = {
  organizationName: string;
  contacts: number;
  openConversations: number;
  knowledgeSources: number;
  unreadMessages: number;
  integrationsConnected: boolean;
  isLive: boolean;
};

export function AiAppHomeGate({
  stats,
  needsOnboarding,
}: {
  stats: DashboardStats;
  needsOnboarding: boolean;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<AiOnboardingAnswers | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (needsOnboarding) {
      router.replace("/ai/app/onboarding");
      return;
    }

    setAnswers(getAiOnboardingAnswers());
    setReady(true);
  }, [needsOnboarding, router]);

  if (!ready) {
    return (
      <div className="ai-setup-page">
        <div className="ai-setup-card ai-setup-loading">Loading dashboard...</div>
      </div>
    );
  }

  return <AiDashboardPanel answers={answers} stats={stats} />;
}
