import type { Prisma } from "@prisma/client";
import type { LeadsPeriodRange } from "./period";

/** Calendar month in India, not the server's timezone. No record mutation. */
export function currentLeadMonth(now = new Date()): LeadsPeriodRange {
  const local = new Date(now.getTime() + 330 * 60_000);
  const month = local.toISOString().slice(0, 7);
  const start = new Date(`${month}-01T00:00:00+05:30`);
  return { type: "monthly", start, end: now, startIso: `${month}-01`,
    endIso: local.toISOString().slice(0, 10), month,
    periodLabel: "This month to date · IST" };
}

export function olderLeadWhere(now = new Date()): Prisma.InboundLeadWhereInput {
  const { start } = currentLeadMonth(now);
  return { OR: [
    { capturedAt: { lt: start } },
    { capturedAt: null, createdAt: { lt: start } },
    { status: "LOST" },
  ] };
}
