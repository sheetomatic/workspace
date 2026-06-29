import { prisma } from "@/lib/db";
import { ensureChecklistOccurrence } from "@/lib/checklists/queries";
import {
  accountsFreqToChecklistFrequency,
  flattenAccountsCatalog,
} from "@/lib/checklists/accounts-checklist-catalog";

export async function deployAccountsChecklistPack(params: {
  organizationId: string;
  createdById: string;
  assigneeUserId: string;
  complianceAssigneeUserId?: string;
}) {
  const { organizationId, createdById, assigneeUserId, complianceAssigneeUserId } =
    params;

  const existing = await prisma.checklistTemplate.findMany({
    where: { organizationId, team: "ACCOUNTS", isActive: true },
    select: { title: true },
  });
  const existingTitles = new Set(existing.map((row) => row.title.toLowerCase()));

  let created = 0;
  let skipped = 0;

  for (const entry of flattenAccountsCatalog()) {
    if (existingTitles.has(entry.particular.toLowerCase())) {
      skipped += 1;
      continue;
    }

    const assignee =
      entry.group.id === "accounts-compliance" && complianceAssigneeUserId
        ? complianceAssigneeUserId
        : assigneeUserId;

    const frequency = accountsFreqToChecklistFrequency(entry.freq);

    const template = await prisma.checklistTemplate.create({
      data: {
        organizationId,
        title: entry.particular,
        instructions: entry.instructions ?? null,
        team: "ACCOUNTS",
        frequency,
        dueMonthDay: entry.dueMonthDay ?? 1,
        dueWeekday: 1,
        dueMonth: entry.dueMonth ?? 4,
        anchorDate: frequency === "FORTNIGHTLY" ? new Date() : null,
        dueHour: 18,
        dueMinute: 0,
        assigneeUserId: assignee,
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
    existingTitles.add(entry.particular.toLowerCase());
    created += 1;
  }

  return { created, skipped, total: flattenAccountsCatalog().length };
}
