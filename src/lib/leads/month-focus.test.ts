import { describe, expect, it, vi } from "vitest";
import { currentLeadMonth, olderLeadWhere } from "./month-focus";
import { leadCapturedAtWhere } from "./period";

describe("month-to-date CRM focus", () => {
  it("starts at midnight India time and ends now", () => {
    const now = new Date("2026-10-26T08:00:00Z");
    const range = currentLeadMonth(now);
    expect(range.start.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(range.end).toEqual(now);
    expect(range.month).toBe("2026-10");
  });
  it("rolls over at India midnight including a year boundary", () => {
    expect(currentLeadMonth(new Date("2026-10-31T18:29:59Z")).month).toBe("2026-10");
    expect(currentLeadMonth(new Date("2026-10-31T18:30:00Z")).month).toBe("2026-11");
    expect(currentLeadMonth(new Date("2026-12-31T18:30:00Z")).month).toBe("2027-01");
  });
  it("uses captured date with created date fallback and preserves parked leads", () => {
    const now = new Date("2026-10-26T08:00:00Z");
    const range = currentLeadMonth(now);
    expect(olderLeadWhere(now)).toEqual({ OR: [
      { capturedAt: { lt: range.start } },
      { capturedAt: null, createdAt: { lt: range.start } },
      { status: "LOST" },
    ] });
    expect(leadCapturedAtWhere(range)).toEqual({ OR: [
      { capturedAt: { gte: range.start, lte: now } },
      { capturedAt: null, createdAt: { gte: range.start, lte: now } },
    ] });
  });
});

const { count, findMany } = vi.hoisted(() => ({ count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) }));
vi.mock("@/lib/db", () => ({ prisma: { inboundLead: { count, findMany } } }));
vi.mock("@/lib/leads/fms-bridge", () => ({ getFmsStepSummaryForLead: vi.fn() }));
import { listInboundLeadsForPeriodPaginated, getInboundLeadWorkspaceTotal } from "./queries";
it("search cannot escape the month, staff scope, archive or parked exclusions", async () => {
  const period = currentLeadMonth(new Date("2026-10-26T08:00:00Z"));
  await listInboundLeadsForPeriodPaginated("org", period, {
    page: 1, pageSize: 50, sort: "newest", q: "908", assignedToId: "staff",
    status: "LOST", excludeStatuses: ["LOST"],
  });
  const where = count.mock.calls.at(-1)![0].where;
  expect(where.organizationId).toBe("org");
  expect(where.assignedToId).toBe("staff");
  expect(where.AND).toContainEqual(leadCapturedAtWhere(period));
  expect(where.AND).toContainEqual({ status: { notIn: ["LOST"] } });
  expect(where.AND).toContainEqual({ archivedAt: null, mergedIntoId: null });
  expect(findMany.mock.calls.at(-1)![0].where).toEqual(where);
});
it("workspace total is month-scoped too", async () => {
  await getInboundLeadWorkspaceTotal("org", { assignedToId: "staff" });
  const where = count.mock.calls.at(-1)![0].where;
  expect(where.OR[0].capturedAt.gte).toEqual(currentLeadMonth().start);
  expect(where.assignedToId).toBe("staff");
});
