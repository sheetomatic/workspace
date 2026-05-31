import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import {
  listWhatsAppMembers,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";

export function getWhatsAppWebhookBaseUrl() {
  return (
    process.env.NEXTAUTH_URL?.trim().replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    "https://sheetomatic.com"
  );
}

export function getWhatsAppWebhookUrl() {
  return `${getWhatsAppWebhookBaseUrl()}/api/webhooks/whatsapp`;
}

export function getWhatsAppWebhookVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || null;
}

export type WhatsAppGoLiveStatus = {
  webhookUrl: string;
  verifyTokenConfigured: boolean;
  verifyTokenHint: string;
  credentialsReady: boolean;
  delegatorCount: number;
  webhookReceived: boolean;
  lastInboundAt: string | null;
  isLive: boolean;
  liveSince: string | null;
  businessPhone: string | null;
  phoneId: string | null;
  canGoLive: boolean;
  blockers: string[];
};

export async function getWhatsAppGoLiveStatus(
  organizationId: string,
): Promise<WhatsAppGoLiveStatus> {
  const [credentials, settings, members] = await Promise.all([
    resolveWorkspaceWhatsAppCredentials(organizationId),
    prisma.workspaceWhatsAppSettings.findUnique({
      where: { organizationId },
      select: { botLiveAt: true, lastInboundAt: true },
    }),
    listWhatsAppMembers(organizationId),
  ]);

  const delegatorCount = members.filter(
    (member) => hasMinimumRole(member.role, "MANAGER") && member.phone,
  ).length;

  const credentialsReady = Boolean(
    credentials.redlavaApiKey && credentials.redlavaPhoneId,
  );
  const verifyTokenConfigured = Boolean(getWhatsAppWebhookVerifyToken());
  const webhookReceived = Boolean(settings?.lastInboundAt);

  const blockers: string[] = [];
  if (!credentialsReady) {
    blockers.push("Save RedLava API key and Phone ID in Settings.");
  }
  if (delegatorCount === 0) {
    blockers.push("Add at least one Manager+ team WhatsApp number in Settings.");
  }
  if (!verifyTokenConfigured) {
    blockers.push(
      "Set WHATSAPP_WEBHOOK_VERIFY_TOKEN on the server (Vercel env).",
    );
  }

  return {
    webhookUrl: getWhatsAppWebhookUrl(),
    verifyTokenConfigured,
    verifyTokenHint: verifyTokenConfigured
      ? "Configured on server"
      : "Ask your developer to add WHATSAPP_WEBHOOK_VERIFY_TOKEN on Vercel",
    credentialsReady,
    delegatorCount,
    webhookReceived,
    lastInboundAt: settings?.lastInboundAt?.toISOString() ?? null,
    isLive: Boolean(settings?.botLiveAt),
    liveSince: settings?.botLiveAt?.toISOString() ?? null,
    businessPhone: credentials.businessPhone,
    phoneId: credentials.redlavaPhoneId,
    canGoLive: blockers.length === 0,
    blockers,
  };
}
