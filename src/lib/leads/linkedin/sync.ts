import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type LinkedInAccount } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getLinkedInConfig } from "./config";
import { hasLinkedInWorkspaceAccess } from "./access";
import { getAcceptedInvitations, LinkedInApiError, type AcceptedInvitation } from "./api";
import { decryptLinkedInToken } from "./security";

const HOUR = 60 * 60 * 1000;
// Become due before the next hourly cron, rather than one hour after this run finishes.
const NEXT_RUN_DELAY = 55 * 60 * 1000;
const LEASE_MS = 3 * 60 * 1000;

export function tokenContext(account: Pick<LinkedInAccount, "organizationId" | "id" | "appId">) {
  return `${account.organizationId}:${account.id}:${account.appId}`;
}

async function recordAcceptance(
  account: LinkedInAccount, lockToken: string, invitation: AcceptedInvitation, baseline: boolean,
) {
  // The receipt and lead are committed together. Retries cannot partially create a lead.
  return prisma.$transaction(async (tx) => {
    // Acquire a row lock until commit, so disconnect cannot race this receipt.
    const currentAccount = await tx.linkedInAccount.updateMany({
      where: { id: account.id, organizationId: account.organizationId, enabled: true, lockToken },
      data: { lockExpiresAt: new Date(Date.now() + LEASE_MS) },
    });
    if (!currentAccount.count) throw new Error("LinkedIn sync was paused.");
    const existing = await tx.linkedInAcceptance.findUnique({
      where: { accountId_invitationUrn: { accountId: account.id, invitationUrn: invitation.invitationUrn } },
    });
    if (existing) return false;

    const receipt = await tx.linkedInAcceptance.create({
      data: {
        accountId: account.id, invitationUrn: invitation.invitationUrn,
        memberUrn: invitation.memberUrn, baseline,
      },
    });
    if (baseline) return false;

    const identity = {
      organizationId: account.organizationId,
      linkedInAppId: account.appId,
      linkedInMemberUrn: invitation.memberUrn,
    };
    let lead = await tx.inboundLead.upsert({
      where: { organizationId_linkedInAppId_linkedInMemberUrn: identity },
      create: {
        ...identity,
        channel: "LINKEDIN",
        name: invitation.name,
        linkedInHeadline: invitation.headline,
        linkedInProfileUrl: invitation.profileUrl,
        linkedInDetectedAt: receipt.detectedAt,
        sourceDetail: "Accepted outbound LinkedIn connection",
        status: "NEW",
        assignedToId: account.ownerUserId,
        createdByUserId: account.ownerUserId,
        capturedAt: receipt.detectedAt,
      },
      update: {},
    });
    // Honour any user-initiated CRM merge, without reopening archived leads.
    const visited = new Set<string>();
    while (lead.mergedIntoId) {
      if (visited.has(lead.id) || visited.size > 20) throw new Error("Lead merge needs review.");
      visited.add(lead.id);
      const primary = await tx.inboundLead.findFirst({
        where: { id: lead.mergedIntoId, organizationId: account.organizationId },
      });
      if (!primary) throw new Error("The linked lead is no longer available.");
      lead = primary;
    }
    await tx.inboundLead.update({
      where: { id: lead.id },
      data: {
        ...(!lead.name && invitation.name ? { name: invitation.name } : {}),
        ...(!lead.linkedInHeadline && invitation.headline ? { linkedInHeadline: invitation.headline } : {}),
        ...(!lead.linkedInProfileUrl && invitation.profileUrl ? { linkedInProfileUrl: invitation.profileUrl } : {}),
      },
    });
    await tx.linkedInAcceptance.update({ where: { id: receipt.id }, data: { leadId: lead.id } });
    await tx.inboundLeadActivity.create({
      data: {
        organizationId: account.organizationId, leadId: lead.id, type: "SYNC",
        body: `LinkedIn connection accepted. Detected for ${account.displayName}.`,
        createdByUserId: account.ownerUserId,
        metadata: { source: "linkedin", accountId: account.id, invitationUrn: invitation.invitationUrn },
      },
    });
    // No FMS bridge, nurture event, outbound message, or inferred qualification.
    return true;
  }, { timeout: 15_000 });
}

export async function syncLinkedInAccount(
  accountId: string, organizationId: string, deadline = Date.now() + 150_000,
) {
  const config = getLinkedInConfig();
  if (!config) return { ok: false, message: "Official LinkedIn access is not configured." };
  let account = await prisma.linkedInAccount.findFirst({
    where: { id: accountId, organizationId, enabled: true },
  });
  if (!account) return { ok: false, message: "This LinkedIn account is not active." };
  if (account.appId !== config.clientId ||
      !(await hasLinkedInWorkspaceAccess(account.organizationId, account.ownerUserId))) {
    await prisma.linkedInAccount.updateMany({
      where: { id: account.id, organizationId },
      data: { enabled: false, accessTokenEncrypted: null, lastSyncError: "Workspace or application access changed. Reconnect when access is restored." },
    });
    return { ok: false, message: "Workspace or application access changed." };
  }
  const now = new Date();
  const lockToken = randomUUID();
  const claimed = await prisma.linkedInAccount.updateMany({
    where: { id: account.id, organizationId, enabled: true,
      OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lt: now } }] },
    data: { lockToken, lockExpiresAt: new Date(now.getTime() + LEASE_MS) },
  });
  if (!claimed.count) return { ok: false, message: "A LinkedIn sync is already running." };
  let recorded = 0;
  let skipped = 0;
  try {
    // Another run may have finished between the initial read and lease claim.
    const claimedAccount = await prisma.linkedInAccount.findFirst({
      where: { id: account.id, organizationId, enabled: true, lockToken },
    });
    if (!claimedAccount) throw new Error("LinkedIn sync was paused.");
    account = claimedAccount;
    if (!account.accessTokenEncrypted || !account.accessTokenExpiresAt ||
        account.accessTokenExpiresAt.getTime() <= Date.now() + 60_000) throw new LinkedInApiError(401);
    let token: string;
    try {
      token = decryptLinkedInToken(account.accessTokenEncrypted, tokenContext(account), config);
    } catch {
      throw new LinkedInApiError(401);
    }
    let start = account.scanStart;
    let complete = false;
    // Bounded work per invocation. The persisted cursor continues the next run.
    // Full repeated sweeps avoid missing old invitations accepted after their creation date.
    scan: for (let pageNumber = 0; pageNumber < 3; pageNumber += 1) {
      if (Date.now() >= deadline - 20_000) break;
      const page = await getAcceptedInvitations(token, config, start);
      if (!(await hasLinkedInWorkspaceAccess(account.organizationId, account.ownerUserId))) {
        throw new LinkedInApiError(403);
      }
      skipped += page.skipped;
      for (const invitation of page.accepted) {
        // Leave this page's cursor unchanged if we yield; receipts make replay safe.
        if (Date.now() >= deadline - 20_000) break scan;
        try {
          if (await recordAcceptance(account, lockToken, invitation, !account.baselineCompletedAt)) recorded += 1;
        } catch (error) {
          // A second sender account can match the same member concurrently.
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            if (await recordAcceptance(account, lockToken, invitation, !account.baselineCompletedAt)) recorded += 1;
          } else throw error;
        }
      }
      complete = page.complete;
      start = complete ? 0 : page.nextStart;
      const progress = await prisma.linkedInAccount.updateMany({
        where: { id: account.id, organizationId, enabled: true, lockToken },
        data: {
          scanStart: start,
          ...(complete && !account.baselineCompletedAt ? { baselineCompletedAt: new Date() } : {}),
          lockExpiresAt: new Date(Date.now() + LEASE_MS),
        },
      });
      if (!progress.count) throw new Error("LinkedIn sync was paused.");
      if (complete) break;
    }
    await prisma.linkedInAccount.updateMany({
      where: { id: account.id, organizationId, lockToken },
      data: {
        lastSyncAt: new Date(), nextSyncAt: new Date(Date.now() + NEXT_RUN_DELAY),
        lastSyncError: skipped ? `${skipped} invitation records lacked a supported member identity and were skipped.` : null,
        lockToken: null, lockExpiresAt: null,
      },
    });
    return {
      ok: true,
      message: !account.baselineCompletedAt
        ? complete ? "Initial history scan complete. Monitoring new acceptances." : "Initial history scan is continuing."
        : `${recorded} accepted connections added to your lead history.${complete ? "" : " More pages will sync automatically."}`,
    };
  } catch (error) {
    const message = error instanceof LinkedInApiError ? error.message : "LinkedIn sync could not finish. It will retry automatically.";
    const reconnect = error instanceof LinkedInApiError && [401, 403].includes(error.status);
    await prisma.linkedInAccount.updateMany({
      where: { id: account.id, organizationId, lockToken },
      data: {
        lastSyncError: message, nextSyncAt: new Date(Date.now() + HOUR),
        lockToken: null, lockExpiresAt: null,
        ...(reconnect ? { enabled: false, accessTokenEncrypted: null } : {}),
      },
    });
    return { ok: false, message };
  }
}

export async function runLinkedInSyncQueue() {
  if (!getLinkedInConfig()) return { configured: false, processed: 0 };
  await prisma.linkedInOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  const accounts = await prisma.linkedInAccount.findMany({
    where: {
      enabled: true, nextSyncAt: { lte: new Date() },
      OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lt: new Date() } }],
    },
    orderBy: { nextSyncAt: "asc" }, take: 25,
    select: { id: true, organizationId: true },
  });
  const started = Date.now();
  let processed = 0;
  for (const account of accounts) {
    if (Date.now() - started > 210_000) break;
    await syncLinkedInAccount(account.id, account.organizationId,
      Math.min(Date.now() + 150_000, started + 240_000));
    processed += 1;
  }
  return { configured: true, processed };
}
