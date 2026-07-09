import { LeadsSettingsPanel } from "@/components/saas/leads-settings-panel";
import {
  getGoogleSheetsServiceAccountEmail,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import { ensureLeadConnections } from "@/lib/leads/ingest";
import { listLeadConnections } from "@/lib/leads/queries";
import { isWebBasedApiUiEnabled } from "@/lib/web-based-api-ui";
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

  const [connections, org, waSaved, waCredentials] = await Promise.all([
    listLeadConnections(user.organizationId),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { leadMachineApiKeyHint: true },
    }),
    getWorkspaceWhatsAppSettings(user.organizationId),
    resolveWorkspaceWhatsAppCredentials(user.organizationId),
  ]);

  const waForm = toWhatsAppSettingsFormValues(waSaved, waCredentials);
  const masCreds = masCredentialsFromWorkspace(waCredentials);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com";

  return (
    <LeadsSettingsPanel
      apiKeyHint={org?.leadMachineApiKeyHint ?? null}
      connections={connections}
      ingestUrl={`${siteUrl}/api/leads/ingest`}
      serviceAccountEmail={getGoogleSheetsServiceAccountEmail()}
      sheetsAuthConfigured={isGoogleSheetsAuthConfigured()}
      webBasedApi={{
        masUsername: waForm.masUsername,
        businessPhone: waForm.businessPhone
          ? formatWhatsAppPhone(waForm.businessPhone) ?? waForm.businessPhone
          : "",
        hasSavedPassword: Boolean(waSaved?.masPassword),
        hasSavedApiKey: Boolean(waSaved?.masApiKey),
        credentialsConfigured: isMasConfigured(masCreds),
        webBasedApiEnabled: isWebBasedApiUiEnabled(),
      }}
    />
  );
}
