"use server";

import { revalidatePath } from "next/cache";
import type { ChecklistFrequency, ChecklistTeam } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getChecklistActor } from "@/lib/checklists/session";
import { canConfigureChecklists } from "@/lib/checklists/access";
import {
  ensureChecklistOccurrence,
  ensureNextChecklistOccurrence,
} from "@/lib/checklists/queries";
import type { FmsActionState } from "@/lib/fms-action-state";
import {
  importChecklistTemplates,
  type ChecklistTemplateImportRow,
} from "@/lib/checklists/template-import";
import { resolveChecklistAssigneeForOrg, activeAssigneeMembershipWhere } from "@/lib/checklists/assignee-validation";
import { deployAccountsChecklistPack } from "@/lib/checklists/accounts-deploy";
import { canCreateTasks } from "@/lib/tasks";

const fmsInitialState: FmsActionState = { ok: false };

function parseTeam(value: string): ChecklistTeam {
  const teams: ChecklistTeam[] = [
    "ACCOUNTS",
    "HR",
    "MAINTENANCE",
    "QUALITY",
    "STORE",
    "GENERAL",
  ];
  return teams.includes(value as ChecklistTeam) ? (value as ChecklistTeam) : "GENERAL";
}

function parseFrequency(value: string): ChecklistFrequency {
  const frequencies: ChecklistFrequency[] = [
    "WEEKLY",
    "FORTNIGHTLY",
    "MONTHLY",
    "QUARTERLY",
    "HALF_YEARLY",
    "YEARLY",
  ];
  return frequencies.includes(value as ChecklistFrequency)
    ? (value as ChecklistFrequency)
    : "MONTHLY";
}

export async function createChecklistTemplateAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getChecklistActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const user = actor.user;
    if (!canConfigureChecklists(user)) {
      return {
        ok: false,
        message: "PC does not create assignments. Ask your admin to enable checklists, or assign ad-hoc work in Tasks.",
      };
    }

    const title = formData.get("title")?.toString().trim() ?? "";
    const assigneeUserIdRaw = formData.get("assigneeUserId")?.toString() ?? "";
    if (!title) {
      return { ok: false, message: "Title and doer are required." };
    }

    const assigneeResult = await resolveChecklistAssigneeForOrg(
      user.organizationId,
      assigneeUserIdRaw,
      (args) =>
        prisma.membership.findFirst({
          where: {
            organizationId: args.organizationId,
            userId: args.userId,
            ...activeAssigneeMembershipWhere,
          },
          select: { id: true, deactivatedAt: true },
        }),
    );
    if (!assigneeResult.ok) {
      return { ok: false, message: assigneeResult.message };
    }
    const assigneeUserId = assigneeResult.assigneeUserId;

    const frequency = parseFrequency(formData.get("frequency")?.toString() ?? "MONTHLY");
    const dueMonthDay = Number.parseInt(formData.get("dueMonthDay")?.toString() ?? "1", 10);
    const dueWeekday = Number.parseInt(formData.get("dueWeekday")?.toString() ?? "1", 10);
    const dueMonth = Number.parseInt(formData.get("dueMonth")?.toString() ?? "4", 10);

    const template = await prisma.checklistTemplate.create({
      data: {
        organizationId: user.organizationId,
        title,
        instructions: formData.get("instructions")?.toString().trim() || null,
        team: parseTeam(formData.get("team")?.toString() ?? "GENERAL"),
        frequency,
        dueMonthDay: Number.isFinite(dueMonthDay) ? dueMonthDay : 1,
        dueWeekday: Number.isFinite(dueWeekday) ? dueWeekday : 1,
        dueMonth: Number.isFinite(dueMonth) ? dueMonth : 4,
        anchorDate: frequency === "FORTNIGHTLY" ? new Date() : null,
        assigneeUserId,
        createdById: user.id,
        remindViaEmail: formData.get("remindViaEmail") === "on",
      },
      include: {
        assignee: { select: { name: true, email: true } },
        references: { orderBy: { sortOrder: "asc" } },
      },
    });

    await ensureChecklistOccurrence(template);

    revalidatePath("/app/checklists");
    revalidatePath("/app/checklists/my-tasks");
    return { ok: true, message: "Checklist created." };
  } catch (error) {
    console.error("createChecklistTemplateAction", error);
    return { ok: false, message: "Could not create checklist." };
  }
}

export async function completeChecklistOccurrenceAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getChecklistActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const user = actor.user;

    const occurrenceId = formData.get("occurrenceId")?.toString() ?? "";
    const notes = formData.get("notes")?.toString().trim() || null;

    const occurrence = await prisma.checklistOccurrence.findFirst({
      where: {
        id: occurrenceId,
        organizationId: user.organizationId,
      },
      include: {
        template: {
          include: {
            assignee: { select: { name: true, email: true } },
            references: true,
          },
        },
      },
    });

    if (!occurrence) {
      return { ok: false, message: "Checklist not found." };
    }

    if (occurrence.assigneeUserId !== user.id) {
      return { ok: false, message: "Only the assigned doer can mark this checklist done." };
    }

    if (occurrence.status === "DONE") {
      return { ok: false, message: "Already marked done." };
    }

    const actualAt = new Date();
    const delayMinutes = Math.max(
      0,
      Math.round((actualAt.getTime() - occurrence.plannedAt.getTime()) / 60000),
    );

    await prisma.checklistOccurrence.update({
      where: { id: occurrence.id },
      data: {
        status: "DONE",
        actualAt,
        delayMinutes: actualAt.getTime() > occurrence.plannedAt.getTime() ? delayMinutes : 0,
        notes,
        completedById: user.id,
      },
    });

    await ensureNextChecklistOccurrence(occurrence.template, occurrence.plannedAt);

    revalidatePath("/app/checklists");
    revalidatePath("/app/checklists/my-tasks");
    revalidatePath("/app/today");
    revalidatePath("/app/em");
    return { ok: true, message: "Checklist marked done." };
  } catch (error) {
    console.error("completeChecklistOccurrenceAction", error);
    return { ok: false, message: "Could not complete checklist." };
  }
}

export async function importChecklistTemplatesAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getChecklistActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const user = actor.user;
    if (!canConfigureChecklists(user)) {
      return {
        ok: false,
        message: "You cannot import checklist templates in this workspace.",
      };
    }

    let rows: ChecklistTemplateImportRow[] = [];
    try {
      rows = JSON.parse(formData.get("rows")?.toString() ?? "[]");
    } catch {
      return { ok: false, message: "Could not read the rows to import." };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, message: "No valid rows to import." };
    }

    const result = await importChecklistTemplates(
      user.organizationId,
      user.id,
      rows,
    );

    revalidatePath("/app/checklists");
    revalidatePath("/app/checklists/setup");
    revalidatePath("/app/checklists/my-tasks");
    return {
      ok: true,
      message: `Imported ${result.total} checklist template${
        result.total === 1 ? "" : "s"
      }.`,
    };
  } catch (error) {
    console.error("importChecklistTemplatesAction", error);
    const message =
      error instanceof Error ? error.message : "Could not import checklists.";
    return { ok: false, message };
  }
}

export async function deployAccountsChecklistAction(
  _prev: FmsActionState,
  formData: FormData,
): Promise<FmsActionState> {
  try {
    const actor = await getChecklistActor();
    if (!actor.ok) {
      return { ok: false, message: actor.message };
    }
    const user = actor.user;
    if (!canCreateTasks(user.role)) {
      return { ok: false, message: "Only managers can deploy the accounts checklist." };
    }

    const assigneeUserId = formData.get("assigneeUserId")?.toString().trim() ?? "";
    const complianceAssigneeUserId =
      formData.get("complianceAssigneeUserId")?.toString().trim() || undefined;

    const assigneeResult = await resolveChecklistAssigneeForOrg(
      user.organizationId,
      assigneeUserId,
      (args) =>
        prisma.membership.findFirst({
          where: {
            organizationId: args.organizationId,
            userId: args.userId,
            ...activeAssigneeMembershipWhere,
          },
          select: { id: true, deactivatedAt: true },
        }),
    );
    if (!assigneeResult.ok) {
      return { ok: false, message: assigneeResult.message };
    }

    let complianceUserId: string | undefined;
    if (complianceAssigneeUserId) {
      const complianceResult = await resolveChecklistAssigneeForOrg(
        user.organizationId,
        complianceAssigneeUserId,
        (args) =>
          prisma.membership.findFirst({
            where: {
              organizationId: args.organizationId,
              userId: args.userId,
              ...activeAssigneeMembershipWhere,
            },
            select: { id: true, deactivatedAt: true },
          }),
      );
      if (!complianceResult.ok) {
        return { ok: false, message: complianceResult.message };
      }
      complianceUserId = complianceResult.assigneeUserId;
    }

    const result = await deployAccountsChecklistPack({
      organizationId: user.organizationId,
      createdById: user.id,
      assigneeUserId: assigneeResult.assigneeUserId,
      complianceAssigneeUserId: complianceUserId,
    });

    [
      "/app/checklists",
      "/app/checklists/accounts",
      "/app/checklists/setup",
      "/app/checklists/my-tasks",
    ].forEach((path) => revalidatePath(path));

    return {
      ok: true,
      message: `Accounts checklist deployed: ${result.created} created, ${result.skipped} already existed.`,
    };
  } catch (error) {
    console.error("deployAccountsChecklistAction", error);
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not deploy accounts checklist.",
    };
  }
}

export { fmsInitialState as checklistInitialState };
