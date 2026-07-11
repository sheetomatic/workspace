import { prisma } from "@/lib/db";
import { ensureChecklistOccurrence } from "@/lib/checklists/queries";
import { flattenHrCatalog } from "@/lib/checklists/hr-checklist-catalog";

export async function deployHrChecklistPack(params: {
  organizationId: string;
  createdById: string;
  assigneeUserId: string;
  /** Optional: only deploy one focus group. */
  focusId?: string;
}) {
  const { organizationId, createdById, assigneeUserId, focusId } = params;

  const catalog = flattenHrCatalog().filter((entry) =>
    focusId ? entry.group.id === focusId : true,
  );

  const existing = await prisma.checklistTemplate.findMany({
    where: { organizationId, team: "HR", isActive: true },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((row) => row.title.toLowerCase()));

  let created = 0;
  let skipped = 0;

  for (const entry of catalog) {
    if (existingTitles.has(entry.title.toLowerCase())) {
      skipped += 1;
      continue;
    }

    const template = await prisma.checklistTemplate.create({
      data: {
        organizationId,
        title: entry.title,
        instructions: entry.instructions ?? null,
        team: "HR",
        frequency: entry.frequency,
        dueMonthDay: entry.dueMonthDay ?? 1,
        dueWeekday: entry.dueWeekday ?? 1,
        dueMonth: 4,
        anchorDate: entry.frequency === "FORTNIGHTLY" ? new Date() : null,
        dueHour: 18,
        dueMinute: 0,
        assigneeUserId,
        createdById,
        isActive: true,
        remindViaEmail: true,
      },
      include: {
        assignee: { select: { name: true, email: true } },
        references: { orderBy: { sortOrder: "asc" } },
      },
    });

    await ensureChecklistOccurrence(template);
    existingTitles.add(entry.title.toLowerCase());
    created += 1;
  }

  return { created, skipped, total: catalog.length };
}
