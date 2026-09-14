"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { hasMinimumRole } from "@/lib/permissions";
import { isMemberCrmSubModuleEnabled } from "@/lib/crm/crm-sub-modules";
import { prisma } from "@/lib/db";
import {
  addLeadsByCategoryToWaCampaign,
  addLeadsToWaCampaign,
  createWaCampaign,
  listApprovedCampaignTemplates,
  pauseWaCampaign,
  previewLeadsByCategoryForCampaign,
  processWaCampaignBatch,
  removeWaCampaignRecipient,
  resumeWaCampaign,
  searchCampaignLeads,
  startWaCampaignSend,
  updateWaCampaignTemplate,
} from "@/lib/crm/wa-campaigns";
import { parseVariableMap } from "@/lib/crm/wa-campaign-variables";

async function requireCampaignUser(minRole: "STAFF" | "MANAGER" = "STAFF") {
  const user = await getSessionUser();
  if (!user || !hasMinimumRole(user.role, minRole)) {
    return null;
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: user.organizationId,
      },
    },
    select: { enabledCrmSubModules: true },
  });
  if (!isMemberCrmSubModuleEnabled(membership?.enabledCrmSubModules, "campaigns")) {
    return null;
  }
  return user;
}

function revalidateCampaigns(campaignId?: string) {
  revalidatePath("/app/leads");
  revalidatePath("/app/leads/campaigns");
  if (campaignId) {
    revalidatePath(`/app/leads/campaigns/${campaignId}`);
  }
}

export async function createWaCampaignAction(formData: FormData) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "You cannot create campaigns." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const campaign = await createWaCampaign({
    organizationId: user.organizationId,
    userId: user.id,
    name,
  });
  revalidateCampaigns(campaign.id);
  return { ok: true as const, campaignId: campaign.id };
}

export async function saveWaCampaignTemplateAction(input: {
  campaignId: string;
  templateName: string;
  templateLanguage: string;
  templateCategory?: string | null;
  variableMap: Record<string, string>;
}) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "You cannot edit campaigns." };
  }
  const result = await updateWaCampaignTemplate({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    templateName: input.templateName,
    templateLanguage: input.templateLanguage,
    templateCategory: input.templateCategory,
    variableMap: parseVariableMap(input.variableMap),
  });
  if (result.ok) {
    revalidateCampaigns(input.campaignId);
  }
  return result;
}

export async function addLeadsToWaCampaignAction(input: {
  campaignId: string;
  leadIds: string[];
}) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "You cannot add contacts.", added: 0, skipped: 0 };
  }
  const result = await addLeadsToWaCampaign({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    leadIds: input.leadIds,
    userId: user.id,
  });
  if (result.ok) {
    revalidateCampaigns(input.campaignId);
  }
  return result;
}

export async function previewCategoryLeadsForCampaignAction(input: {
  campaignId: string;
  category: string;
}) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "You cannot add contacts.", count: 0, label: "" };
  }
  return previewLeadsByCategoryForCampaign({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    category: input.category,
  });
}

export async function addLeadsByCategoryToWaCampaignAction(input: {
  campaignId: string;
  category: string;
}) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "You cannot add contacts.", added: 0, skipped: 0 };
  }
  const result = await addLeadsByCategoryToWaCampaign({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    category: input.category,
    userId: user.id,
  });
  if (result.ok) {
    revalidateCampaigns(input.campaignId);
  }
  return result;
}

export async function removeWaCampaignRecipientAction(input: {
  campaignId: string;
  recipientId: string;
}) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "You cannot change this campaign." };
  }
  const result = await removeWaCampaignRecipient({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    recipientId: input.recipientId,
  });
  if (result.ok) {
    revalidateCampaigns(input.campaignId);
  }
  return result;
}

export async function searchCampaignLeadsAction(input: {
  campaignId: string;
  q: string;
}) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return [];
  }
  return searchCampaignLeads({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    q: input.q,
  });
}

export async function loadApprovedCampaignTemplatesAction() {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, templates: [], error: "Not allowed." };
  }
  return listApprovedCampaignTemplates(user.organizationId);
}

export async function startWaCampaignSendAction(input: { campaignId: string }) {
  const user = await requireCampaignUser("MANAGER");
  if (!user) {
    return { ok: false as const, error: "Manager or admin can send campaigns." };
  }
  const result = await startWaCampaignSend({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
  });
  revalidateCampaigns(input.campaignId);
  if (result.ok && !result.done && !("paused" in result && result.paused)) {
    after(async () => {
      await processWaCampaignBatch({
        organizationId: user.organizationId,
        campaignId: input.campaignId,
      });
      revalidateCampaigns(input.campaignId);
    });
  }
  return result;
}

export async function pauseWaCampaignAction(input: { campaignId: string }) {
  const user = await requireCampaignUser("MANAGER");
  if (!user) {
    return { ok: false as const, error: "Manager or admin can pause sending." };
  }
  const result = await pauseWaCampaign({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
    reason: "Paused from CRM.",
  });
  revalidateCampaigns(input.campaignId);
  return result;
}

export async function resumeWaCampaignAction(input: { campaignId: string }) {
  const user = await requireCampaignUser("MANAGER");
  if (!user) {
    return { ok: false as const, error: "Manager or admin can resume sending." };
  }
  const result = await resumeWaCampaign({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
  });
  revalidateCampaigns(input.campaignId);
  if (result.ok && !result.done && !("paused" in result && result.paused)) {
    after(async () => {
      await processWaCampaignBatch({
        organizationId: user.organizationId,
        campaignId: input.campaignId,
      });
      revalidateCampaigns(input.campaignId);
    });
  }
  return result;
}

export async function processWaCampaignBatchAction(input: { campaignId: string }) {
  const user = await requireCampaignUser("STAFF");
  if (!user) {
    return { ok: false as const, error: "Not allowed.", processed: 0, done: false };
  }
  const result = await processWaCampaignBatch({
    organizationId: user.organizationId,
    campaignId: input.campaignId,
  });
  revalidateCampaigns(input.campaignId);
  return result;
}
