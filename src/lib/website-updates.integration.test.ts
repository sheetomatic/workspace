import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "./db";
import { allowUpdatesRequest, manageWebsiteUpdates, requestWebsiteUpdates } from "./website-updates";
const safe = process.env.DATABASE_URL?.startsWith("postgresql://analytics_test:analytics_local_test@127.0.0.1:55433/analytics_test");
const suite = safe ? describe : describe.skip;
const prefix = `signup-test-${randomUUID()}`;
const emails = [0, 1, 2].map(index => `${prefix}-${index}@example.invalid`);
afterAll(async () => { if (safe) { await prisma.websiteSubscriber.deleteMany({ where: { email: { in: emails } } });await prisma.rateLimitBucket.deleteMany({ where: { key: { startsWith: `updates:${prefix}` } } });await prisma.$disconnect(); } });
suite("isolated subscriber persistence; never sends email", () => {
  it("serializes simultaneous duplicate signups, confirms once, then unsubscribes", async () => {
    const messages: string[] = [];
    const send = async (mail: { text: string }) => { messages.push(mail.text);return { sent: true as const }; };
    await Promise.all([requestWebsiteUpdates({ email: emails[0], name: "Fixture" }, send), requestWebsiteUpdates({ email: emails[0], name: "Fixture" }, send)]);
    expect(messages).toHaveLength(1);
    expect(await prisma.websiteSubscriber.count({ where: { email: emails[0] } })).toBe(1);
    const row = await prisma.websiteSubscriber.findUniqueOrThrow({ where: { email: emails[0] } });expect(row.status).toBe("PENDING");
    const token = messages[0].match(/action=confirm&token=([a-f0-9]+)/)![1];
    expect(await manageWebsiteUpdates("confirm", token)).toBe(true);
    expect(await manageWebsiteUpdates("confirm", token)).toBe(false);
    expect((await prisma.websiteSubscriber.findUniqueOrThrow({ where: { email: emails[0] } })).status).toBe("ACTIVE");
    await manageWebsiteUpdates("unsubscribe", row.unsubscribeToken);await manageWebsiteUpdates("unsubscribe", row.unsubscribeToken);
    expect((await prisma.websiteSubscriber.findUniqueOrThrow({ where: { email: emails[0] } })).status).toBe("UNSUBSCRIBED");
  });
  it("rejects expired tokens and requires fresh proof after opting out", async () => {
    let text = "";const send = async (mail: { text: string }) => {text=mail.text;return { sent: true as const };};
    await requestWebsiteUpdates({ email: emails[1] }, send);
    const token=text.match(/action=confirm&token=([a-f0-9]+)/)![1];
    await prisma.websiteSubscriber.update({ where: { email: emails[1] }, data: { confirmationExpiresAt: new Date(0) } });
    expect(await manageWebsiteUpdates("confirm", token)).toBe(false);
    const row=await prisma.websiteSubscriber.findUniqueOrThrow({ where: { email: emails[1] } });await manageWebsiteUpdates("unsubscribe", row.unsubscribeToken);
    await prisma.websiteSubscriber.update({ where: { email: emails[1] }, data: { lastConfirmationAt: new Date(0) } });
    await requestWebsiteUpdates({ email: emails[1] }, send);
    expect((await prisma.websiteSubscriber.findUniqueOrThrow({ where: { email: emails[1] } })).status).toBe("PENDING");
    expect(await manageWebsiteUpdates("confirm", token)).toBe(false);
  });
  it("does not activate after provider failure", async () => {
    await expect(requestWebsiteUpdates({ email: emails[2] }, async () => ({ sent: false as const, reason: "api_error" as const }))).rejects.toThrow();
    expect((await prisma.websiteSubscriber.findUniqueOrThrow({ where: { email: emails[2] } })).status).toBe("PENDING");
  });
  it("enforces a concurrent atomic rate limit", async () => {
    const results=await Promise.all(Array.from({length:8},()=>allowUpdatesRequest(`${prefix}-rate`,3)));
    expect(results.filter(Boolean)).toHaveLength(3);
  });
});
