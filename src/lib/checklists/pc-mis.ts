import type { MisDetailRow } from "@/lib/mis/reports-data";
import { buildChecklistMisRows, type ChecklistMisRow } from "@/lib/checklists/mis";

export type PcViolationKind = "onTime" | "pending" | "overdue" | "doneLate";

export type PcPersonMisRow = {
  owner: string;
  total: number;
  pending: number;
  overdue: number;
  doneLate: number;
  onTime: number;
  delayed: number;
  avgScore: number;
  deficitPct: number;
};

export type PcExceptionRow = {
  id: string;
  title: string;
  owner: string;
  kind: Exclude<PcViolationKind, "onTime">;
  status: string;
  href: string;
};

export function classifyChecklistMisRow(
  row: Pick<ChecklistMisRow, "status" | "plannedAt" | "delayed">,
  now = new Date(),
): PcViolationKind {
  const status = row.status.toUpperCase();
  if (status === "DONE") {
    return row.delayed ? "doneLate" : "onTime";
  }
  if (status === "OVERDUE" || row.plannedAt.getTime() < now.getTime()) {
    return "overdue";
  }
  return "pending";
}

export function buildPcMisDetailRows(
  occurrences: Parameters<typeof buildChecklistMisRows>[0],
): MisDetailRow[] {
  return buildChecklistMisRows(occurrences).map((row) => ({
    id: row.id,
    category: "PC",
    title: row.title,
    owner: row.owner,
    ownerId: row.ownerId,
    status: row.status,
    score: row.score,
    delayed: row.delayed,
    href: row.href,
  }));
}

export function buildPcPersonMisRows(
  rows: ChecklistMisRow[],
  now = new Date(),
): PcPersonMisRow[] {
  const byOwner = new Map<string, ChecklistMisRow[]>();

  for (const row of rows) {
    const list = byOwner.get(row.owner) ?? [];
    list.push(row);
    byOwner.set(row.owner, list);
  }

  return Array.from(byOwner.entries())
    .map(([owner, items]) => {
      let pending = 0;
      let overdue = 0;
      let doneLate = 0;
      let onTime = 0;
      for (const item of items) {
        const kind = classifyChecklistMisRow(item, now);
        if (kind === "pending") pending += 1;
        else if (kind === "overdue") overdue += 1;
        else if (kind === "doneLate") doneLate += 1;
        else onTime += 1;
      }
      const delayed = pending + overdue + doneLate;
      const avgScore =
        items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
          : 100;
      const deficitPct =
        items.length > 0 ? Math.round((delayed * 100) / items.length) : 0;
      return {
        owner,
        total: items.length,
        pending,
        overdue,
        doneLate,
        onTime,
        delayed,
        avgScore,
        deficitPct,
      };
    })
    .sort((a, b) => b.deficitPct - a.deficitPct);
}

export function buildPcExceptionRows(
  rows: ChecklistMisRow[],
  now = new Date(),
): PcExceptionRow[] {
  const order: Record<Exclude<PcViolationKind, "onTime">, number> = {
    overdue: 0,
    pending: 1,
    doneLate: 2,
  };

  return rows
    .map((row) => {
      const kind = classifyChecklistMisRow(row, now);
      if (kind === "onTime") {
        return null;
      }
      return {
        id: row.id,
        title: row.title,
        owner: row.owner,
        kind,
        status: row.status,
        href: row.href,
      };
    })
    .filter((row): row is PcExceptionRow => row !== null)
    .sort((a, b) => order[a.kind] - order[b.kind] || a.title.localeCompare(b.title));
}
