import {
  bciStarterOnboardingPreset,
  bciWithTasksOnboardingPreset,
  appBuilderOnboardingPreset,
  client50OnboardingPreset,
  crmOnboardingPreset,
  hrmsOnboardingPreset,
  planOnboardingPreset,
  tasksAddonOnboardingPreset,
  type ClientOnboardingPreset,
} from "@/lib/org-onboarding";
import { ORG_PLAN_LABELS } from "@/lib/org-plan-presets";
import {
  isActivationBundleKey,
  formatAllowedModules,
} from "@/lib/workspace-activation-bundles.shared";

export {
  ACTIVATION_BUNDLE_KEYS,
  ACTIVATION_BUNDLE_OPTIONS,
  DEFAULT_ACTIVATION_BUNDLE,
  activationBundleLabel,
  formatAllowedModules,
  isActivationBundleKey,
  type ActivationBundleKey,
  type ActivationBundleOption,
} from "@/lib/workspace-activation-bundles.shared";

export function resolveActivationPreset(bundle: string): ClientOnboardingPreset {
  if (!isActivationBundleKey(bundle)) {
    return bciStarterOnboardingPreset();
  }

  switch (bundle) {
    case "tasks_addon":
      return tasksAddonOnboardingPreset();
    case "bci_with_tasks":
      return bciWithTasksOnboardingPreset();
    case "bci_growth":
      return planOnboardingPreset("BCI_GROWTH");
    case "client_50":
      return client50OnboardingPreset();
    case "app_builder":
      return appBuilderOnboardingPreset();
    case "hrms":
      return hrmsOnboardingPreset();
    case "crm":
      return crmOnboardingPreset();
    case "bci_starter":
    default:
      return bciStarterOnboardingPreset();
  }
}

export function activationSummaryMessage(preset: ClientOnboardingPreset): string {
  const planLabel = ORG_PLAN_LABELS[preset.plan];
  const modules = formatAllowedModules(preset.allowedModules);
  return `${preset.product} workspace · ${planLabel} - ${modules} (max ${preset.maxMembers} users)`;
}
