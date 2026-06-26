import type { MisDetailRow } from "@/lib/mis/reports-data";
import { buildChecklistMisRows, type ChecklistMisRow } from "@/lib/checklists/mis";

export type PcPersonMisRow = {
  owner: string;
  total: number;
  delayed: number;
  avgScore: number;
  deficitPct: number;
};

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

export function buildPcPersonMisRows(rows: ChecklistMisRow[]): PcPersonMisRow[] {
  const byOwner = new Map<string, ChecklistMisRow[]>();

  for (const row of rows) {
    const list = byOwner.get(row.owner) ?? [];
    list.push(row);
    byOwner.set(row.owner, list);
  }

  return Array.from(byOwner.entries())
    .map(([owner, items]) => {
      const delayed = items.filter((item) => item.delayed).length;
      const avgScore =
        items.length > 0
          ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length)
          : 100;
      return {
        owner,
        total: items.length,
        delayed,
        avgScore,
        deficitPct: Math.max(0, 100 - avgScore),
      };
    })
    .sort((a, b) => b.deficitPct - a.deficitPct);
}
