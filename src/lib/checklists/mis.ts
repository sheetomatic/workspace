import type { ChecklistOccurrenceStatus } from "@prisma/client";
import { checklistOccurrenceMisScore } from "@/lib/mis/score";

export type ChecklistMisRow = {
  id: string;
  title: string;
  owner: string;
  ownerId: string;
  team: string;
  status: string;
  score: number;
  delayed: boolean;
  plannedAt: Date;
  actualAt: Date | null;
  href: string;
};

export function buildChecklistMisRows(
  occurrences: Array<{
    id: string;
    plannedAt: Date;
    actualAt: Date | null;
    status: ChecklistOccurrenceStatus;
    template: {
      title: string;
      team: string;
    };
    assignee: { id: string; name: string | null; email: string };
  }>,
): ChecklistMisRow[] {
  return occurrences.map((row) => {
    const score = checklistOccurrenceMisScore({
      status: row.status,
      plannedAt: row.plannedAt,
      actualAt: row.actualAt,
    });
    const owner = row.assignee.name ?? row.assignee.email.split("@")[0];
    const delayed = score.score < 100;

    return {
      id: row.id,
      title: row.template.title,
      owner,
      ownerId: row.assignee.id,
      team: row.template.team,
      status: row.status,
      score: score.score,
      delayed,
      plannedAt: row.plannedAt,
      actualAt: row.actualAt,
      href: `/app/checklists/my-tasks?occurrence=${row.id}`,
    };
  });
}
