import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ find: vi.fn(), upsert: vi.fn(), update: vi.fn(), execute: vi.fn(), query: vi.fn(), remove: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { websiteSubscriber: { updateMany: mocks.update, deleteMany: mocks.remove }, rateLimitBucket: { deleteMany: mocks.remove }, $queryRaw: mocks.query, $transaction: (fn: (tx: unknown) => unknown) => fn({ $executeRaw: mocks.execute, websiteSubscriber: { findUnique: mocks.find, upsert: mocks.upsert } }) } }));
vi.mock("@/lib/integrations/email", () => ({ sendPlainEmail: mocks.send }));
import { allowUpdatesRequest, manageWebsiteUpdates, requestWebsiteUpdates, tokenHash } from "./website-updates";
import { updatesManageSchema, updatesSignupSchema } from "./website-updates-input";
import { readUpdatesBody } from "./website-updates-http";
beforeEach(() => { vi.clearAllMocks();mocks.find.mockResolvedValue(null);mocks.upsert.mockResolvedValue({ unsubscribeToken: "a".repeat(64) });mocks.send.mockResolvedValue({ sent: true });mocks.update.mockResolvedValue({ count: 1 });mocks.query.mockResolvedValue([{ count: 1 }]); });
describe("explicit updates signup", () => {
  it("normalizes email and requires separate positive consent", () => {
    expect(updatesSignupSchema.parse({ email: " A@EXAMPLE.COM ", consent: true }).email).toBe("a@example.com");
    expect(updatesSignupSchema.safeParse({ email: "a@example.com", consent: false }).success).toBe(false);
    expect(updatesSignupSchema.safeParse({ email: "a@example.com", consent: true, website: "bot" }).success).toBe(false);
  });
  it("stores pending consent and only sends a confirmation, not a campaign", async () => {
    await requestWebsiteUpdates({ email: "a@example.com", name: "A" });
    const fields = mocks.upsert.mock.calls[0][0].create;
    expect(fields).toMatchObject({ status: "PENDING", consentVersion: "monthly-digest-features-v1", email: "a@example.com", confirmedAt: null });
    const mail=mocks.send.mock.calls[0][0];const token=mail.text.match(/action=confirm&token=([a-f0-9]+)/)[1];
    expect(fields.confirmationHash).toBe(tokenHash(token));expect(fields.confirmationHash).not.toBe(token);
    expect(mail.text).toContain("action=unsubscribe");expect(mail.text).toContain("24 hours");expect(mocks.send).toHaveBeenCalledTimes(1);
  });
  it.each(["ACTIVE", "PENDING"])("does not resend for duplicate %s", async status => {
    mocks.find.mockResolvedValue({ status, lastConfirmationAt: new Date() });await requestWebsiteUpdates({ email: "a@example.com" });expect(mocks.send).not.toHaveBeenCalled();expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("requires fresh confirmation after unsubscribing", async () => {
    mocks.find.mockResolvedValue({ status: "UNSUBSCRIBED", lastConfirmationAt: new Date(0) });await requestWebsiteUpdates({ email: "a@example.com" });expect(mocks.upsert.mock.calls[0][0].update.status).toBe("PENDING");
  });
  it("does not report success if email fails", async () => {
    mocks.send.mockResolvedValue({ sent: false });await expect(requestWebsiteUpdates({ email: "a@example.com" })).rejects.toThrow("unavailable");expect(mocks.update).not.toHaveBeenCalled();
  });
  it("confirms only an unexpired pending token, then invalidates it", async () => {
    expect(await manageWebsiteUpdates("confirm", "b".repeat(64))).toBe(true);
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ where: { status: "PENDING", confirmationHash: tokenHash("b".repeat(64)), confirmationExpiresAt: { gt: expect.any(Date) } }, data: { status: "ACTIVE", confirmationHash: null } });
    mocks.update.mockResolvedValue({ count: 0 });expect(await manageWebsiteUpdates("confirm", "b".repeat(64))).toBe(false);
  });
  it("unsubscribes idempotently and invalidates pending confirmation", async () => {
    mocks.update.mockResolvedValue({ count: 0 });expect(await manageWebsiteUpdates("unsubscribe", "a".repeat(64))).toBe(true);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ status: "UNSUBSCRIBED", confirmationHash: null });expect(mocks.send).not.toHaveBeenCalled();
  });
  it("fails closed on rate-store failure", async () => {
    mocks.query.mockRejectedValue(Error("offline"));await expect(allowUpdatesRequest("test", 3)).rejects.toThrow("offline");
  });
  it("blocks requests above the atomic limit", async () => {
    mocks.query.mockResolvedValue([{ count: 4 }]);expect(await allowUpdatesRequest("test", 3)).toBe(false);
  });
  it("rejects malformed management tokens", () => expect(updatesManageSchema.safeParse({ action: "confirm", token: "bad" }).success).toBe(false));
});
describe("public signup boundary", () => {
  const request=(body:string,origin="https://sheetomatic.com")=>new Request("https://sheetomatic.com/api/updates/subscribe",{method:"POST",headers:{origin,"content-type":"application/json"},body});
  it("rejects foreign origins", async () => { await expect(readUpdatesBody(request("{}","https://other.example"))).rejects.toMatchObject({status:403}); });
  it("rejects oversized payloads", async () => { await expect(readUpdatesBody(request("x".repeat(2049)))).rejects.toMatchObject({status:413}); });
  it("rejects invalid JSON", async () => { await expect(readUpdatesBody(request("{"))).rejects.toMatchObject({status:400}); });
  it("accepts bounded JSON", async () => { await expect(readUpdatesBody(request('{"consent":true}'))).resolves.toEqual({consent:true}); });
});
