export type AiOnboardingAnswers = {
  businessName: string;
  industry: string;
  primaryGoal: string;
  teamSize: string;
  whatsappStatus: string;
  completedAt: string;
};

const STORAGE_KEY = "sheetomatic-ai-onboarding-v1";

export function getAiOnboardingAnswers(): AiOnboardingAnswers | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as AiOnboardingAnswers;
  } catch {
    return null;
  }
}

export function saveAiOnboardingAnswers(answers: Omit<AiOnboardingAnswers, "completedAt">) {
  const payload: AiOnboardingAnswers = {
    ...answers,
    completedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  return payload;
}

export function isAiOnboardingComplete() {
  return Boolean(getAiOnboardingAnswers()?.completedAt);
}

export function clearAiOnboardingAnswers() {
  localStorage.removeItem(STORAGE_KEY);
}
