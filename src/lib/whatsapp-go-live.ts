import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { formatWhatsAppPhone, whatsAppPhonesEqual } from "@/lib/phone";
import { isLeadCaptureFormConfigured } from "@/lib/lead-capture-google-form";
import {
  listWhatsAppMembers,
  resolveWorkspaceWhatsAppCredentials,
} from "@/lib/whatsapp-settings";
import { isWhatsAppProviderConfigured } from "@/lib/integrations/whatsapp-provider";
import { getMasPhoneConnectionStatus } from "@/lib/integrations/messageautosender";

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

/** RedLava callback URL with verify token (use when Meta signature is unavailable). */
export function getWhatsAppWebhookUrlWithToken() {
  const token = getWhatsAppWebhookVerifyToken();
  const base = getWhatsAppWebhookUrl();
  if (!token) {
    return base;
  }
  return `${base}?token=${encodeURIComponent(token)}`;
}

export function getWhatsAppWebhookVerifyToken() {
  return process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim() || null;
}

export type WhatsAppGoLiveStatus = {
  webhookUrl: string;
  webhookUrlWithToken: string;
  verifyTokenConfigured: boolean;
  verifyTokenHint: string;
  credentialsReady: boolean;
  whatsappProvider: "sheetomatic" | "messageautosender";
  delegatorCount: number;
  webhookReceived: boolean;
  lastInboundAt: string | null;
  isLive: boolean;
  liveSince: string | null;
  businessPhone: string | null;
  phoneId: string | null;
  leadFormConfigured: boolean;
  canGoLive: boolean;
  blockers: string[];
};

export async function getWhatsAppGoLiveStatus(
  organizationId: string,
): Promise<WhatsAppGoLiveStatus> {
  const [credentials, settings, members, organization, leadFormConfigured] =
    await Promise.all([
    resolveWorkspaceWhatsAppCredentials(organizationId),
    prisma.workspaceWhatsAppSettings.findUnique({
      where: { organizationId },
      select: { botLiveAt: true, lastInboundAt: true },
    }),
    listWhatsAppMembers(organizationId),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { status: true },
    }),
    isLeadCaptureFormConfigured(organizationId),
  ]);

  const delegatorCount = members.filter(
    (member) => hasMinimumRole(member.role, "MANAGER") && member.phone,
  ).length;

  const teamUsesBusinessLine = members.some(
    (member) =>
      member.phone &&
      credentials.businessPhone &&
      whatsAppPhonesEqual(member.phone, credentials.businessPhone),
  );

  const credentialsReady = isWhatsAppProviderConfigured(credentials);
  const verifyTokenConfigured = Boolean(getWhatsAppWebhookVerifyToken());
  const webhookReceived = Boolean(settings?.lastInboundAt);

  let phoneLinked = true;
  if (credentials.whatsappProvider === "messageautosender") {
    if (credentials.masUsername && credentials.masPassword && credentials.masApiKey) {
      const masStatus = await getMasPhoneConnectionStatus({
        username: credentials.masUsername,
        password: credentials.masPassword,
        apiKey: credentials.masApiKey,
      });
      phoneLinked = masStatus.ok ? masStatus.status.connected : false;
    } else {
      phoneLinked = false;
    }
  }

  const blockers: string[] = [];
  if (organization?.status !== "ACTIVE") {
    blockers.push(
      "Workspace must be activated by Sheetomatic before going live.",
    );
  }
  if (!credentialsReady) {
    blockers.push("Save provider credentials in Settings.");
  }
  if (credentials.whatsappProvider === "messageautosender" && !phoneLinked) {
    blockers.push("Link your WhatsApp with QR or OTP in Settings.");
  }
  if (delegatorCount === 0) {
    blockers.push("Add at least one Manager+ team WhatsApp number in Settings.");
  }
  if (
    credentials.whatsappProvider !== "messageautosender" &&
    teamUsesBusinessLine
  ) {
    blockers.push(
      `Team WhatsApp must be a personal mobile — not the business line (${formatWhatsAppPhone(credentials.businessPhone)}). Meta cannot API-message your own business number.`,
    );
  }
  if (!verifyTokenConfigured) {
    blockers.push(
      "Set WHATSAPP_WEBHOOK_VERIFY_TOKEN on the server (Vercel env).",
    );
  }
  if (!webhookReceived) {
    blockers.push(
      "Register the webhook URL with your provider and send a test message — waiting for first inbound webhook.",
    );
  }
  if (!leadFormConfigured) {
    blockers.push(
      "Add your lead capture Google Form in Settings → Workspace links (type Google Form).",
    );
  }

  return {
    webhookUrl: getWhatsAppWebhookUrl(),
    webhookUrlWithToken: getWhatsAppWebhookUrlWithToken(),
    verifyTokenConfigured,
    verifyTokenHint: verifyTokenConfigured
      ? "Configured on server"
      : "Ask your developer to add WHATSAPP_WEBHOOK_VERIFY_TOKEN on Vercel",
    credentialsReady,
    whatsappProvider: credentials.whatsappProvider,
    delegatorCount,
    webhookReceived,
    lastInboundAt: settings?.lastInboundAt?.toISOString() ?? null,
    isLive: Boolean(settings?.botLiveAt),
    liveSince: settings?.botLiveAt?.toISOString() ?? null,
    businessPhone: credentials.businessPhone,
    phoneId: credentials.redlavaPhoneId,
    leadFormConfigured,
    canGoLive: blockers.length === 0,
    blockers,
  };
}
