import { isEmailConfigured } from "@/lib/integrations/email";
import { getIntegrationStatus } from "@/lib/integrations/status";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export type WorkspaceIntegrationStatus = {
  emailConfigured: boolean;
  whatsappConfigured: boolean;
  openaiConfigured: boolean;
};

export async function getWorkspaceIntegrationStatus(
  organizationId: string,
): Promise<WorkspaceIntegrationStatus> {
  const credentials = await resolveWorkspaceWhatsAppCredentials(organizationId);
  const platform = getIntegrationStatus();
  return {
    emailConfigured: isEmailConfigured(),
    whatsappConfigured: Boolean(
      credentials.redlavaApiKey?.trim() && credentials.redlavaPhoneId?.trim(),
    ),
    openaiConfigured: platform.openai,
  };
}
