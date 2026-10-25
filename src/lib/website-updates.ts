import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { sendPlainEmail } from "@/lib/integrations/email";
import { updatesConsentVersion } from "./website-updates-input";
export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Atomic, database-backed and fail-closed. Only this feature's expired buckets are removed. */
export async function allowUpdatesRequest(key: string, limit: number) {
  const now = new Date(), reset = new Date(now.getTime() + 86400000);
  const rows = await prisma.$queryRaw<{ count: number }[]>`INSERT INTO "RateLimitBucket" (key, count, "resetAt", "updatedAt") VALUES (${`updates:${key}`}, 1, ${reset}, ${now}) ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1 ELSE "RateLimitBucket".count + 1 END, "resetAt" = CASE WHEN "RateLimitBucket"."resetAt" <= ${now} THEN ${reset} ELSE "RateLimitBucket"."resetAt" END, "updatedAt" = ${now} RETURNING count`;
  return rows[0].count <= limit;
}

export async function requestWebsiteUpdates(input: { email: string; name?: string }, send = sendPlainEmail) {
  const now = new Date();
  await prisma.websiteSubscriber.deleteMany({ where: { status: "PENDING", confirmedAt: null, requestedAt: { lt: new Date(now.getTime() - 30 * 86400000) } } });
  await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: "updates:" }, resetAt: { lt: new Date(now.getTime() - 7 * 86400000) } } });
  const confirmation = randomBytes(32).toString("hex");
  const hash = tokenHash(confirmation);
  const subscriber = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`updates:${input.email}`}))`;
    const existing = await tx.websiteSubscriber.findUnique({ where: { email: input.email } });
    if (existing?.status === "ACTIVE" || (existing && existing.lastConfirmationAt > new Date(now.getTime() - 600000))) return null;
    const fields = { name: input.name || null, status: "PENDING", consentVersion: updatesConsentVersion, requestedAt: now, confirmedAt: null, confirmationHash: hash, confirmationExpiresAt: new Date(now.getTime() + 86400000), lastConfirmationAt: now };
    return tx.websiteSubscriber.upsert({ where: { email: input.email }, create: { ...fields, email: input.email, unsubscribeToken: randomBytes(32).toString("hex") }, update: fields });
  });
  if (!subscriber) return;
  const confirmUrl = `https://sheetomatic.com/updates/manage?action=confirm&token=${confirmation}`;
  const unsubscribeUrl = `https://sheetomatic.com/updates/manage?action=unsubscribe&token=${subscriber.unsubscribeToken}`;
  const result = await send({ toEmail: input.email, subject: "Confirm your Sheetomatic product updates", text: `Please confirm that you want Sheetomatic's monthly email digest and occasional new-feature announcements.\n\nConfirm within 24 hours:\n${confirmUrl}\n\nIf you did not request this, ignore this email. No updates will be sent without confirmation.\n\nUnsubscribe or cancel this request:\n${unsubscribeUrl}\n\nSheetomatic Technologies\nShop No. 2 & 3, SH 16, Near Dinesh Cycle Store, Kalmi, Sakti, Chhattisgarh 495691, India\nPrivacy: https://sheetomatic.com/privacy` });
  if (!result.sent) throw Error("Confirmation email unavailable");
}

export async function manageWebsiteUpdates(action: "confirm" | "unsubscribe", token: string) {
  const now = new Date();
  if (action === "unsubscribe") {
    await prisma.websiteSubscriber.updateMany({ where: { unsubscribeToken: token }, data: { status: "UNSUBSCRIBED", unsubscribedAt: now, confirmationHash: null, confirmationExpiresAt: null } });
    return true; // Idempotent and does not disclose whether an address exists.
  }
  const result = await prisma.websiteSubscriber.updateMany({ where: { confirmationHash: tokenHash(token), status: "PENDING", confirmationExpiresAt: { gt: now } }, data: { status: "ACTIVE", confirmedAt: now, unsubscribedAt: null, confirmationHash: null, confirmationExpiresAt: null } });
  return result.count === 1;
}
