"use server";

import { AI_APP_MIN_ROLE } from "@/lib/ai-auth-links";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import {
  getRedlavaCampaignMessageInsight,
  getRedlavaCampaignUploadResults,
  listRedlavaCampaignDetails,
  listRedlavaCampaignMessages,
  listRedlavaCsvCampaigns,
  type RedlavaCsvCampaign,
} from "@/lib/integrations/redlava-campaigns";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";

async function requireCampaignAccess() {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, AI_APP_MIN_ROLE)) {
    return null;
  }

  const credentials = await resolveWorkspaceWhatsAppCredentials(user.organizationId);
  if (!credentials.redlavaApiKey) {
    return null;
  }

  return {
    user,
    credentials: {
      apiKey: credentials.redlavaApiKey,
      phoneId: credentials.redlavaPhoneId,
    },
  };
}

export async function loadCampaignListAction(): Promise<{
  ok: boolean;
  campaigns: RedlavaCsvCampaign[];
  error?: string;
}> {
  const access = await requireCampaignAccess();
  if (!access) {
    return { ok: false, campaigns: [], error: "WhatsApp is not connected." };
  }

  const result = await listRedlavaCsvCampaigns(access.credentials);
  if (!result.ok) {
    return {
      ok: false,
      campaigns: [],
      error: result.error ?? "Could not load campaigns from RedLava.",
    };
  }

  return { ok: true, campaigns: result.campaigns };
}

export async function loadCampaignInsightsAction(input: {
  campaignId: string;
  fileUploadId: string;
}) {
  const access = await requireCampaignAccess();
  if (!access) {
    return { ok: false as const, error: "WhatsApp is not connected." };
  }

  const [uploadResults, insight] = await Promise.all([
    getRedlavaCampaignUploadResults(input.campaignId, access.credentials),
    getRedlavaCampaignMessageInsight(input.campaignId, access.credentials),
  ]);

  if (!uploadResults.ok) {
    return {
      ok: false as const,
      error: uploadResults.error ?? "Could not load upload results.",
    };
  }
  if (!insight.ok) {
    return {
      ok: false as const,
      error: insight.error ?? "Could not load delivery insights.",
    };
  }

  return {
    ok: true as const,
    uploadResults: uploadResults.uploadResults,
    insight: insight.insight,
  };
}

export async function loadCampaignDetailsAction(input: {
  fileUploadId: string;
  page: number;
  pageSize?: number;
}) {
  const access = await requireCampaignAccess();
  if (!access) {
    return { ok: false as const, error: "WhatsApp is not connected." };
  }

  const pageSize = input.pageSize ?? 25;
  const result = await listRedlavaCampaignDetails(
    input.fileUploadId,
    access.credentials,
    { current: input.page, pageSize },
  );

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error ?? "Could not load campaign rows.",
    };
  }

  return {
    ok: true as const,
    rows: result.rows,
    total: result.total,
    page: input.page,
    pageSize,
  };
}

export async function loadCampaignMessagesAction(input: {
  campaignId: string;
  page: number;
  pageSize?: number;
}) {
  const access = await requireCampaignAccess();
  if (!access) {
    return { ok: false as const, error: "WhatsApp is not connected." };
  }

  const pageSize = input.pageSize ?? 25;
  const result = await listRedlavaCampaignMessages(
    input.campaignId,
    access.credentials,
    { current: input.page, pageSize },
  );

  if (!result.ok) {
    return {
      ok: false as const,
      error: result.error ?? "Could not load message report.",
    };
  }

  return {
    ok: true as const,
    rows: result.rows,
    total: result.total,
    page: input.page,
    pageSize,
  };
}
