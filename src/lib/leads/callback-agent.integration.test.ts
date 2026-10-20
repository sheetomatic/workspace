import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db";
import { callbackRecordId, ensureCallbackAssignment, runCallbackAgent, sendCallbackAcknowledgement } from "./callback-agent";
import { deliverWhatsAppMessage } from "@/lib/integrations/whatsapp-provider";
import { resolveWorkspaceWhatsAppCredentials } from "@/lib/whatsapp-settings";
import { hasActiveWhatsAppSession } from "@/lib/whatsapp-session";
import { GET } from "@/app/api/cron/crm-callbacks/route";
import { ingestInboundLead } from "./ingest";
import { triggerLeadNurtureEvent } from "./nurture/run";

vi.mock("./nurture/run", () => ({ triggerLeadNurtureEvent: vi.fn(async () => ({ sent: true })) }));
vi.mock("./notify", () => ({ notifyOwnersNewLead: vi.fn(async () => undefined), notifyLeadAssigned: vi.fn(async () => undefined) }));

vi.mock("@/lib/whatsapp-settings", () => ({ resolveWorkspaceWhatsAppCredentials: vi.fn() }));
vi.mock("@/lib/whatsapp-session", () => ({ hasActiveWhatsAppSession: vi.fn() }));
vi.mock("@/lib/integrations/whatsapp-provider", async (original) => ({
  ...await original<typeof import("@/lib/integrations/whatsapp-provider")>(), deliverWhatsAppMessage: vi.fn(),
}));
const run = randomBytes(6).toString("hex");
// Isolated test-only slug prevents touching an existing primary tenant in local fixtures.
vi.mock("@/lib/platform", () => ({ PRIMARY_ORG_SLUG: "callback-integration-only" }));
const orgId = `callback-org-${run}`;
const sumit = `callback-sumit-${run}`;
const owner = `callback-owner-${run}`;
const other = `callback-other-${run}`;
const receivedAt = new Date("2026-10-20T10:00:00+05:30");
const local = process.env.DATABASE_URL === "postgresql://postgres@127.0.0.1:55439/template_checkout_test";
let sequence = 0;
async function lead(extra: Record<string, unknown> = {}) {
  return prisma.inboundLead.create({ data: { organizationId: orgId, channel: "WHATSAPP",
    name: "Test enquiry", phone: "919999999999", createdAt: receivedAt, ...extra } });
}

describe.skipIf(!local)("callback agent — isolated PostgreSQL, mocked WhatsApp", () => {
  beforeAll(async () => {
    // Refuse collisions rather than deleting or adopting fixtures from another run.
    await prisma.organization.create({ data: { id: orgId, name: "Callback Test Only", slug: "callback-integration-only" } });
    for (const [id, name, role] of [[sumit, "Sumit Chandra", "STAFF"], [owner, "Test Owner", "OWNER"], [other, "Other Staff", "STAFF"]] as const) {
      await prisma.user.create({ data: { id, name, email: `${id}@example.test` } });
      await prisma.membership.create({ data: { organizationId: orgId, userId: id, role } });
    }
  });
  beforeEach(() => {
    vi.stubEnv("CRM_CALLBACK_ENABLED", "true"); vi.stubEnv("CRM_CALLBACK_ORGANIZATION_ID", orgId);
    vi.stubEnv("CRM_CALLBACK_ASSIGNEE_ID", sumit); vi.stubEnv("CRM_CALLBACK_OWNER_ID", owner);
    vi.stubEnv("CRM_CALLBACK_ENABLED_SINCE", "2026-10-20T00:00:00Z");
    vi.mocked(resolveWorkspaceWhatsAppCredentials).mockReset().mockResolvedValue({
      businessPhone: "919685788980", whatsappProvider: "sheetomatic", redlavaApiKey: "test-only",
      redlavaPhoneId: "test-phone-id", metaAccessToken: null, metaBusinessId: null, metaWabaId: null,
      masApiKey: null, masUsername: null, masPassword: null, source: "workspace",
    });
    vi.mocked(deliverWhatsAppMessage).mockReset().mockResolvedValue({ sent: true, messageId: `test-${++sequence}` });
    vi.mocked(hasActiveWhatsAppSession).mockReset().mockResolvedValue(true);
  });
  afterAll(async () => {
    // Only this run's explicitly scoped fixtures; no production connection allowed above.
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { id: { in: [sumit, owner, other] } } });
    await prisma.cronHeartbeat.deleteMany({ where: { jobKey: `crm-callbacks:${orgId}` } });
    vi.unstubAllEnvs(); await prisma.$disconnect();
  });
  it("atomically assigns once, including concurrent workers, and creates task/follow-up", async () => {
    const row = await lead();
    await Promise.all(Array.from({ length: 5 }, () => ensureCallbackAssignment(orgId, row.id)));
    const current = await prisma.inboundLead.findUniqueOrThrow({ where: { id: row.id } });
    expect(current.assignedToId).toBe(sumit);
    expect(current.nextFollowUpAt?.toISOString()).toBe("2026-10-20T04:45:00.000Z");
    expect(await prisma.delegatedTask.count({ where: { id: callbackRecordId(orgId, row.id, "task") } })).toBe(1);
    expect(await prisma.inboundLeadFollowUp.count({ where: { leadId: row.id } })).toBe(1);
    expect(deliverWhatsAppMessage).not.toHaveBeenCalled();
  });
  it("does not change manually assigned leads or other tenants", async () => {
    const assigned = await lead({ assignedToId: other });
    expect(await ensureCallbackAssignment(orgId, assigned.id)).toBe(false);
    expect(await ensureCallbackAssignment("wrong-org", assigned.id)).toBe(false);
    expect((await prisma.inboundLead.findUniqueOrThrow({ where: { id: assigned.id } })).assignedToId).toBe(other);
  });
  it("skips historic, imported, archived and closed enquiries", async () => {
    for (const extra of [{ createdAt: new Date("2026-10-19") }, { capturedAt: new Date("2026-10-19") },
      { channel: "GOOGLE_SHEETS" }, { archivedAt: receivedAt }, { status: "WON" }]) {
      const row = await lead(extra); expect(await ensureCallbackAssignment(orgId, row.id)).toBe(false);
    }
    const excluded = await lead();
    await prisma.inboundLeadActivity.create({ data: { id: callbackRecordId(orgId, excluded.id, "excluded"), organizationId: orgId, leadId: excluded.id, type: "NOTE" } });
    expect(await ensureCallbackAssignment(orgId, excluded.id)).toBe(false);
  });
  it("requires an active verified Sumit membership", async () => {
    const row = await lead();
    vi.stubEnv("CRM_CALLBACK_ASSIGNEE_ID", other);
    expect(await ensureCallbackAssignment(orgId, row.id)).toBe(false);
    vi.stubEnv("CRM_CALLBACK_ASSIGNEE_ID", sumit);
    await prisma.membership.update({ where: { userId_organizationId: { userId: sumit, organizationId: orgId } }, data: { deactivatedAt: receivedAt } });
    try { expect(await ensureCallbackAssignment(orgId, row.id)).toBe(false); }
    finally { await prisma.membership.update({ where: { userId_organizationId: { userId: sumit, organizationId: orgId } }, data: { deactivatedAt: null } }); }
  });
  it("only acknowledges persisted assignment and sends once under concurrency", async () => {
    const row = await lead();
    expect(await sendCallbackAcknowledgement(orgId, row.id, receivedAt)).toBe("not_applicable");
    await ensureCallbackAssignment(orgId, row.id);
    await Promise.all(Array.from({ length: 4 }, () => sendCallbackAcknowledgement(orgId, row.id, receivedAt)));
    expect(deliverWhatsAppMessage).toHaveBeenCalledTimes(1);
    const call = vi.mocked(deliverWhatsAppMessage).mock.calls[0][0];
    expect(JSON.stringify(call.message)).toContain("Sumit Chandra");
    expect(JSON.stringify(call.message)).toContain("10:15");
    expect(call.credentials?.whatsappProvider).toBe("sheetomatic");
    expect(call.credentials?.masApiKey).toBeNull();
  });
  it("blocks wrong sender, no session and overdue promises without sending", async () => {
    const row = await lead(); await ensureCallbackAssignment(orgId, row.id);
    vi.mocked(hasActiveWhatsAppSession).mockResolvedValue(false);
    expect(await sendCallbackAcknowledgement(orgId, row.id, receivedAt)).toContain("approved_template");
    vi.mocked(hasActiveWhatsAppSession).mockResolvedValue(true);
    const credentials = await resolveWorkspaceWhatsAppCredentials(orgId);
    vi.mocked(resolveWorkspaceWhatsAppCredentials).mockResolvedValue({ ...credentials, businessPhone: "919329103106" });
    expect(await sendCallbackAcknowledgement(orgId, row.id, receivedAt)).toContain("sender_not_verified");
    expect(await sendCallbackAcknowledgement(orgId, row.id, new Date("2026-10-20T10:16:00+05:30"))).toBe("callback_already_overdue");
    expect(deliverWhatsAppMessage).not.toHaveBeenCalled();
  });
  it("never blindly retries a timeout; preserves uncertain delivery for review", async () => {
    const row = await lead(); await ensureCallbackAssignment(orgId, row.id);
    vi.mocked(deliverWhatsAppMessage).mockRejectedValue(new Error("provider timeout"));
    expect(await sendCallbackAcknowledgement(orgId, row.id, receivedAt)).toBe("unknown");
    expect(await sendCallbackAcknowledgement(orgId, row.id, receivedAt)).toBe("already_attempted");
    expect(deliverWhatsAppMessage).toHaveBeenCalledTimes(1);
  });
  it("does not send after manual reassignment or task completion", async () => {
    const row = await lead(); await ensureCallbackAssignment(orgId, row.id);
    await prisma.inboundLead.update({ where: { id: row.id }, data: { assignedToId: other } });
    expect(await sendCallbackAcknowledgement(orgId, row.id, receivedAt)).toBe("not_applicable");
    const done = await lead(); await ensureCallbackAssignment(orgId, done.id);
    await prisma.delegatedTask.update({ where: { id: callbackRecordId(orgId, done.id, "task") }, data: { status: "COMPLETED", completedAt: receivedAt } });
    expect(await sendCallbackAcknowledgement(orgId, done.id, receivedAt)).toBe("not_applicable");
  });
  it("escalates once to Sumit and owner, not Sunday or completed tasks", async () => {
    const row = await lead(); await ensureCallbackAssignment(orgId, row.id);
    await runCallbackAgent(new Date("2026-10-25T12:00:00+05:30"));
    expect(await prisma.userAppNotification.count({ where: { id: callbackRecordId(orgId, row.id, `overdue-${owner}`) } })).toBe(0);
    await runCallbackAgent(new Date("2026-10-26T09:16:00+05:30"));
    await runCallbackAgent(new Date("2026-10-26T09:17:00+05:30"));
    for (const id of [owner, sumit]) expect(await prisma.userAppNotification.count({ where: { id: callbackRecordId(orgId, row.id, `overdue-${id}`) } })).toBe(1);
  });
  it("cron rejects missing secrets and unauthorized requests", async () => {
    vi.stubEnv("CRON_SECRET", ""); expect((await GET(new Request("http://localhost/api/cron/crm-callbacks"))).status).toBe(503);
    vi.stubEnv("CRON_SECRET", "fixture-secret"); expect((await GET(new Request("http://localhost/api/cron/crm-callbacks"))).status).toBe(401);
    vi.stubEnv("CRM_CALLBACK_ENABLED", "false");
    const response = await GET(new Request("http://localhost/api/cron/crm-callbacks", { headers: { authorization: "Bearer fixture-secret" } }));
    expect(await response.json()).toEqual({ enabled: false, processed: 0 });
  });
  it("runs through actual CRM intake, including inferred FMS stage and webhook retry", async () => {
    vi.mocked(triggerLeadNurtureEvent).mockClear();
    const input = { organizationId: orgId, channel: "WHATSAPP" as const, externalId: `callback-${run}`,
      name: "FMS enquiry", phone: "918888888888", requirement: "I need FMS and IMS for my business",
      skipConnectionSetup: true, connectionId: null };
    const first = await ingestInboundLead(input);
    expect(first.created).toBe(true);
    expect(first.lead?.status).toBe("SCHEDULE_MEETING");
    expect(first.lead?.assignedToId).toBe(sumit);
    const retry = await ingestInboundLead(input);
    expect(retry.created).toBe(false);
    expect(retry.lead?.id).toBe(first.lead?.id);
    expect(await prisma.inboundLeadFollowUp.count({ where: { leadId: first.lead!.id } })).toBe(1);
    expect(deliverWhatsAppMessage).toHaveBeenCalledTimes(1);
    expect(triggerLeadNurtureEvent).not.toHaveBeenCalled();
  });
});
