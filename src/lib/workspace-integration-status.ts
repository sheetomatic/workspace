import { isEmailConfigured } from "@/lib/integrations/email";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

export type WorkspaceIntegrationStatus = {
  emailConfigured: boolean;
  whatsappConfigured: boolean;
};

export async function getWorkspaceIntegrationStatus(
  organizationId: string,
): Promise<WorkspaceIntegrationStatus> {
  const credentials = await resolveWorkspaceWhatsAppCredentials(organizationId);
  return {
    emailConfigured: isEmailConfigured(),
    whatsappConfigured: Boolean(
      credentials.redlavaApiKey?.trim() && credentials.redlavaPhoneId?.trim(),
    ),
  };
}
