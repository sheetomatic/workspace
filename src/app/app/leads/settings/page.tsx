import { LeadsSettingsPanel } from "@/components/saas/leads-settings-panel";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { getLeadNurtureConfig } from "@/lib/leads/nurture/config";
import { isLeadNurtureSendingEnabled } from "@/lib/leads/nurture/sending-enabled";
import { getLeadSourceCardModels } from "@/lib/leads/source-settings";
import {
  resolveWorkspaceWhatsAppCredentials,
  toWhatsAppSettingsFormValues,
  getWorkspaceWhatsAppSettings,
} from "@/lib/whatsapp-settings";
import { formatWhatsAppPhone } from "@/lib/phone";
import { masCredentialsFromWorkspace } from "@/lib/integrations/whatsapp-provider";
import { isMasConfigured } from "@/lib/integrations/messageautosender";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function LeadsSettingsPage() {
  const user = await requireSession(undefined, { module: "FMS" });
  if (!hasMinimumRole(user.role, "ADMIN")) {
    redirect("/app/leads");
  }

  await ensureLeadConnections(user.organizationId);

  const [
    org,
    waSaved,
    waCredentials,
    nurtureConfig,
    nurtureSendingActive,
    leadSources,
  ] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { leadMachineApiKeyHint: true },
    }),
    getWorkspaceWhatsAppSettings(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
    getLeadNurtureConfig(user.organizationId),
    isLeadNurtureSendingEnabled(user.organizationId),
    getLeadSourceCardModels(user.organizationId),
  ]);

  const waForm = toWhatsAppSettingsFormValues(waSaved, waCredentials);
  const masCreds = masCredentialsFromWorkspace(waCredentials);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

  return (
    <LeadsSettingsPanel
      apiKeyHint={org?.leadMachineApiKeyHint ?? null}
      ingestUrl={`${siteUrl}/api/leads/ingest`}
      leadSources={leadSources}
      nurtureConfig={nurtureConfig}
      nurtureSendingActive={nurtureSendingActive}
      webBasedApi={{
        masUsername: waForm.masUsername,
        businessPhone: waForm.businessPhone
          ? formatWhatsAppPhone(waForm.businessPhone) ?? waForm.businessPhone
          : "",
        hasSavedPassword: Boolean(waSaved?.masPassword),
        hasSavedApiKey: Boolean(waSaved?.masApiKey),
        credentialsConfigured: isMasConfigured(masCreds),
        nurtureSendingActive,
      }}
    />
  );
}
