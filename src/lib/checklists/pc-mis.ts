import type { MisDetailRow } from "@/lib/mis/reports-data";
import { buildChecklistMisRows, type ChecklistMisRow } from "@/lib/checklists/mis";

export type PcPersonMisRow = {
  owner: string;
  role: "Doer" | "PC";
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
        role: "Doer" as const,
        total: items.length,
        delayed,
        avgScore,
        deficitPct: Math.max(0, 100 - avgScore),
      };
    })
    .sort((a, b) => b.deficitPct - a.deficitPct);
}

export function buildPcChasePersonRows(
  items: Array<{
    pcUserIds: string[];
    overdue: boolean;
    pcJobDoneAt?: Date | null;
  }>,
  pcNames: Record<string, string>,
): PcPersonMisRow[] {
  const byPc = new Map<string, { delayed: number; total: number }>();

  for (const item of items) {
    for (const pcId of item.pcUserIds) {
      const row = byPc.get(pcId) ?? { delayed: 0, total: 0 };
      row.total += 1;
      if (item.overdue && !item.pcJobDoneAt) {
        row.delayed += 1;
      }
      byPc.set(pcId, row);
    }
  }

  return Array.from(byPc.entries())
    .map(([pcId, stats]) => {
      const avgScore =
        stats.total > 0
          ? Math.round(((stats.total - stats.delayed) / stats.total) * 100)
          : 100;
      return {
        owner: pcNames[pcId] ?? "PC",
        role: "PC" as const,
        total: stats.total,
        delayed: stats.delayed,
        avgScore,
        deficitPct: Math.max(0, 100 - avgScore),
      };
    })
    .sort((a, b) => b.deficitPct - a.deficitPct);
}
