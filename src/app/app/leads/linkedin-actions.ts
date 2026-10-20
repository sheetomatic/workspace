"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireLinkedInUser, hasLinkedInWorkspaceAccess } from "@/lib/leads/linkedin/access";
import { getLinkedInConfig, LINKEDIN_SETTINGS_PATH, LINKEDIN_STATE_COOKIE } from "@/lib/leads/linkedin/config";
import { hashState, newOAuthState } from "@/lib/leads/linkedin/security";
import { syncLinkedInAccount } from "@/lib/leads/linkedin/sync";

export async function startLinkedInConnection() {
  const user = await requireLinkedInUser();
  const config = getLinkedInConfig();
  if (!config) return { ok: false as const, message: "Sheetomatic needs approved LinkedIn Invitations API access before accounts can connect." };
  if (!(await hasLinkedInWorkspaceAccess(user.organizationId, user.id))) {
    return { ok: false as const, message: "An active CRM workspace membership is required." };
  }
  const callback = new URL(config.redirectUri);
  const headerList = await headers();
  const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0].trim();
  let origin: URL;
  try {
    origin = new URL(`https://${host}`);
    if (origin.hostname !== callback.hostname && !origin.hostname.endsWith(`.${callback.hostname}`)) {
      throw new Error("domain");
    }
  } catch {
    return { ok: false as const, message: "Open this workspace on the configured Sheetomatic domain to connect LinkedIn." };
  }
  const count = await prisma.linkedInOAuthState.count({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });
  if (count >= 10) return { ok: false as const, message: "Please wait a few minutes before reconnecting." };
  const state = newOAuthState();
  await prisma.linkedInOAuthState.create({
    data: {
      stateHash: hashState(state), userId: user.id, organizationId: user.organizationId,
      returnUrl: new URL(LINKEDIN_SETTINGS_PATH, origin.origin).toString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  (await cookies()).set(LINKEDIN_STATE_COOKIE, state, {
    httpOnly: true, secure: true, sameSite: "lax", maxAge: 600,
    path: "/api/integrations/linkedin/callback", domain: callback.hostname,
  });
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("state", state);
  return { ok: true as const, url: url.toString() };
}

export async function disconnectLinkedInAccount(accountId: string) {
  const user = await requireLinkedInUser();
  const changed = await prisma.linkedInAccount.updateMany({
    where: { id: accountId, organizationId: user.organizationId, ownerUserId: user.id },
    data: {
      enabled: false, accessTokenEncrypted: null, accessTokenExpiresAt: null,
      lockToken: null, lockExpiresAt: null, lastSyncError: null,
    },
  });
  revalidatePath(LINKEDIN_SETTINGS_PATH);
  return changed.count
    ? { ok: true, message: "LinkedIn disconnected. Existing leads are retained." }
    : { ok: false, message: "Account not found." };
}

export async function syncMyLinkedInAccount(accountId: string) {
  const user = await requireLinkedInUser();
  const account = await prisma.linkedInAccount.findFirst({
    where: { id: accountId, organizationId: user.organizationId, ownerUserId: user.id, enabled: true },
    select: { id: true, lastSyncAt: true },
  });
  if (!account) return { ok: false, message: "Connect your LinkedIn account first." };
  if (account.lastSyncAt && account.lastSyncAt.getTime() > Date.now() - 5 * 60 * 1000) {
    return { ok: false, message: "A sync ran recently. Please wait five minutes before syncing again." };
  }
  const result = await syncLinkedInAccount(account.id, user.organizationId);
  revalidatePath(LINKEDIN_SETTINGS_PATH);
  revalidatePath("/app/leads");
  return result;
}
