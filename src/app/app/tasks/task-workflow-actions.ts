"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { TaskRequestType, TaskStatus } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isNextRedirect } from "@/lib/next-redirect";
import {
  computeNextDueAt,
  isRecurringFrequency,
  parseWeeklyDaysFromForm,
} from "@/lib/task-schedule";
import { parseProofFilesFromForm } from "@/lib/task-attachments";
import type { TaskActionState } from "@/lib/task-action-state";
import { notifyTaskAssigner } from "@/lib/task-notifications";
import {
  canManageTaskRequests,
  canUpdateTask,
  isTaskAssignee,
} from "@/lib/tasks";
import {
  canVerifyTask,
  loadReportingManagerContact,
} from "@/lib/task-verification";

function redirectWithToast(message: string): never {
  const toast = encodeURIComponent(message);
  redirect(`/app/tasks?updated=1&toast=${toast}#execution-queue`);
}

async function loadTaskForUser(taskId: string, organizationId: string) {
  return prisma.delegatedTask.findFirst({
    where: { id: taskId, organizationId },
    include: {
      assignee: { select: { id: true, name: true, email: true, phone: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

async function loadVerifierMap(organizationId: string, assigneeUserId: string) {
  const membership = await prisma.membership.findFirst({
    where: { organizationId, userId: assigneeUserId },
    select: { reportingManager: { select: { userId: true } } },
  });
  return new Map<string, string | null>([
    [assigneeUserId, membership?.reportingManager?.userId ?? null],
  ]);
}

async function spawnNextRecurringTask(
  task: NonNullable<Awaited<ReturnType<typeof loadTaskForUser>>>,
) {
  if (!task.isRecurring || !isRecurringFrequency(task.frequency)) {
    return null;
  }

  const recurrenceOptions = {
    weeklyDays:
      task.frequency === "WEEKLY"
        ? parseWeeklyDaysFromForm(task.recurrenceWeeklyDays)
        : undefined,
    monthDay:
      task.frequency === "MONTHLY"
        ? (task.recurrenceMonthDay ?? task.dueAt.getDate())
        : undefined,
  };
  const nextDue = computeNextDueAt(task.frequency, task.dueAt, recurrenceOptions);
  if (!nextDue) {
    return null;
  }

  await prisma.delegatedTask.create({
    data: {
      organizationId: task.organizationId,
      title: task.title,
      instructions: task.instructions,
      assigneeUserId: task.assigneeUserId,
      createdById: task.createdById,
      priority: task.priority,
      department: task.department,
      category: task.category,
      frequency: task.frequency,
      recurrenceWeeklyDays: task.recurrenceWeeklyDays,
      recurrenceMonthDay: task.recurrenceMonthDay,
      isRecurring: true,
      seriesId: task.seriesId ?? task.id,
      occurrenceNumber: task.occurrenceNumber + 1,
      nextOccurrenceAt: computeNextDueAt(task.frequency, nextDue, recurrenceOptions),
      remindViaEmail: task.remindViaEmail,
      remindViaWhatsApp: task.remindViaWhatsApp,
      dueAt: nextDue,
      status: "PENDING",
    },
  });

  return nextDue;
}

export async function completeTaskWithProof(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const task = await loadTaskForUser(taskId, user.organizationId);
    if (!task || !canUpdateTask(user, task)) {
      return { ok: false, message: "You cannot complete this task." };
    }

    if (!isTaskAssignee(user, task) && !canManageTaskRequests(user.role)) {
      return { ok: false, message: "Only the assignee can submit completion proof." };
    }

    if (task.status === "AWAITING_VERIFICATION") {
      return { ok: false, message: "Proof is already awaiting manager verification." };
    }

    const parsed = parseProofFilesFromForm(formData);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }

    const note = formData.get("completionNote")?.toString().trim() || null;
    const submittedAt = new Date();

    await prisma.$transaction(async (tx) => {
      for (const { file, mimeType } of parsed.files) {
        const buffer = Buffer.from(await file.arrayBuffer());
        await tx.taskAttachment.create({
          data: {
            taskId: task.id,
            uploadedById: user.id,
            fileName: file.name,
            mimeType,
            fileSize: file.size,
            data: buffer,
          },
        });
      }

      await tx.delegatedTask.update({
        where: { id: task.id },
        data: {
          status: "AWAITING_VERIFICATION",
          proofSubmittedAt: submittedAt,
          completedAt: null,
          verifiedAt: null,
          verifiedById: null,
          instructions: note
            ? [task.instructions, `Completion note: ${note}`]
                .filter(Boolean)
                .join("\n\n")
            : task.instructions,
        },
      });

      await tx.taskRequest.updateMany({
        where: { taskId: task.id, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolvedAt: submittedAt,
          resolvedById: user.id,
        },
      });
    });

    const assigneeName = task.assignee.name ?? task.assignee.email.split("@")[0];
    const reviewer = await loadReportingManagerContact(
      task.organizationId,
      task.assigneeUserId,
      task.createdBy,
    );

    await notifyTaskAssigner({
      assignerEmail: reviewer.email,
      assignerName: reviewer.name,
      assigneeName,
      taskTitle: task.title,
      organizationName: user.organizationName,
      subject: `Proof submitted for verification: ${task.title}`,
      bodyLines: [
        `${assigneeName} submitted completion proof for this task.`,
        "Review the proof and verify to mark the task complete.",
        ...(note ? [`Assignee note: ${note}`] : []),
      ],
    });

    revalidatePath("/app");
    revalidatePath("/app/tasks");
    redirectWithToast("Proof submitted. Your reporting manager will verify it.");
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("completeTaskWithProof", error);
    return { ok: false, message: "Could not submit proof. Please try again." };
  }
}

export async function verifyTaskProof(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const task = await loadTaskForUser(taskId, user.organizationId);
    if (!task || task.status !== "AWAITING_VERIFICATION") {
      return { ok: false, message: "This task is not awaiting verification." };
    }

    const verifierByAssignee = await loadVerifierMap(
      task.organizationId,
      task.assigneeUserId,
    );
    if (
      !canVerifyTask(
        user,
        {
          assigneeUserId: task.assigneeUserId,
          createdById: task.createdById,
          status: task.status,
        },
        verifierByAssignee,
      )
    ) {
      return { ok: false, message: "You cannot verify this task." };
    }

    const note = formData.get("verificationNote")?.toString().trim() || null;
    const completedAt = new Date();

    await prisma.delegatedTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        completedAt,
        verifiedAt: completedAt,
        verifiedById: user.id,
        instructions: note
          ? [task.instructions, `Verification note: ${note}`]
              .filter(Boolean)
              .join("\n\n")
          : task.instructions,
      },
    });

    const nextDue = await spawnNextRecurringTask(task);
    const message = nextDue
      ? "Task verified and completed. Next recurring run scheduled."
      : "Task verified and marked complete.";

    revalidatePath("/app");
    revalidatePath("/app/tasks");
    redirectWithToast(message);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("verifyTaskProof", error);
    return { ok: false, message: "Could not verify task." };
  }
}

export async function rejectTaskProof(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const task = await loadTaskForUser(taskId, user.organizationId);
    if (!task || task.status !== "AWAITING_VERIFICATION") {
      return { ok: false, message: "This task is not awaiting verification." };
    }

    const verifierByAssignee = await loadVerifierMap(
      task.organizationId,
      task.assigneeUserId,
    );
    if (
      !canVerifyTask(
        user,
        {
          assigneeUserId: task.assigneeUserId,
          createdById: task.createdById,
          status: task.status,
        },
        verifierByAssignee,
      )
    ) {
      return { ok: false, message: "You cannot review this task." };
    }

    const note = formData.get("verificationNote")?.toString().trim();
    if (!note || note.length < 5) {
      return {
        ok: false,
        message: "Add a short reason so the assignee knows what to fix.",
      };
    }

    await prisma.delegatedTask.update({
      where: { id: task.id },
      data: {
        status: "IN_PROGRESS",
        proofSubmittedAt: null,
        instructions: [task.instructions, `Proof rejected: ${note}`]
          .filter(Boolean)
          .join("\n\n"),
      },
    });

    revalidatePath("/app");
    revalidatePath("/app/tasks");
    redirectWithToast("Proof sent back to assignee for rework.");
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("rejectTaskProof", error);
    return { ok: false, message: "Could not reject proof." };
  }
}

async function createAssigneeRequest(
  taskId: string,
  type: TaskRequestType,
  status: TaskStatus,
  formData: FormData,
): Promise<TaskActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, message: "Sign in required." };
  }

  const task = await loadTaskForUser(taskId, user.organizationId);
  if (!task || !isTaskAssignee(user, task)) {
    return { ok: false, message: "Only the assignee can submit this request." };
  }

  if (task.status === "COMPLETED") {
    return { ok: false, message: "This task is already completed." };
  }

  if (task.status === "AWAITING_VERIFICATION") {
    return {
      ok: false,
      message: "Wait for your reporting manager to verify the submitted proof.",
    };
  }

  const message = formData.get("message")?.toString().trim() || "";
  if (message.length < 5) {
    return { ok: false, message: "Please add a short message (at least 5 characters)." };
  }

  let proposedDueAt: Date | null = null;
  if (type === "EXTENSION") {
    const raw = formData.get("proposedDueAt")?.toString() ?? "";
    proposedDueAt = raw ? new Date(raw) : null;
    if (!proposedDueAt || Number.isNaN(proposedDueAt.getTime())) {
      return { ok: false, message: "Pick a valid new due date." };
    }
    if (proposedDueAt.getTime() <= Date.now()) {
      return { ok: false, message: "New due date must be in the future." };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.taskRequest.updateMany({
      where: { taskId: task.id, status: "OPEN" },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedById: user.id },
    });

    await tx.taskRequest.create({
      data: {
        organizationId: user.organizationId,
        taskId: task.id,
        type,
        status: "OPEN",
        message,
        proposedDueAt,
        requestedById: user.id,
      },
    });

    await tx.delegatedTask.update({
      where: { id: task.id },
      data: { status },
    });
  });

  const assigneeName = user.name ?? user.email.split("@")[0];
  const subject =
    type === "REVISION"
      ? `Revision requested: ${task.title}`
      : type === "EXTENSION"
        ? `Due date extension requested: ${task.title}`
        : `Help requested: ${task.title}`;

  await notifyTaskAssigner({
    assignerEmail: task.createdBy.email,
    assignerName: task.createdBy.name,
    assigneeName,
    taskTitle: task.title,
    organizationName: user.organizationName,
    subject,
    bodyLines: [
      type === "REVISION"
        ? `${assigneeName} asked for a revision on this task.`
        : type === "EXTENSION"
          ? `${assigneeName} requested a new due date${
              proposedDueAt
                ? `: ${proposedDueAt.toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}`
                : ""
            }.`
          : `${assigneeName} could not complete the task and needs your help.`,
      "",
      message,
    ],
  });

  revalidatePath("/app");
  revalidatePath("/app/tasks");

  const toastMessage =
    type === "REVISION"
      ? "Revision request sent to your manager."
      : type === "EXTENSION"
        ? "Extension request sent for approval."
        : "Help request sent to the task assigner.";

  redirectWithToast(toastMessage);
}

export async function submitTaskRevisionRequest(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    return await createAssigneeRequest(
      taskId,
      "REVISION",
      "REVISION_REQUESTED",
      formData,
    );
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("submitTaskRevisionRequest", error);
    return { ok: false, message: "Could not send revision request." };
  }
}

export async function submitTaskExtensionRequest(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    return await createAssigneeRequest(
      taskId,
      "EXTENSION",
      "EXTENSION_REQUESTED",
      formData,
    );
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("submitTaskExtensionRequest", error);
    return { ok: false, message: "Could not send extension request." };
  }
}

export async function submitTaskHelpRequest(
  taskId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    return await createAssigneeRequest(taskId, "HELP", "HELP_REQUESTED", formData);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("submitTaskHelpRequest", error);
    return { ok: false, message: "Could not send help request." };
  }
}

export async function resolveTaskRequest(
  requestId: string,
  formData: FormData,
): Promise<TaskActionState> {
  try {
    const user = await getSessionUser();
    if (!user || !canManageTaskRequests(user.role)) {
      return { ok: false, message: "You cannot resolve task requests." };
    }

    const action = formData.get("action")?.toString() ?? "";
    const resolutionNote = formData.get("resolutionNote")?.toString().trim() || null;

    const request = await prisma.taskRequest.findFirst({
      where: { id: requestId, organizationId: user.organizationId, status: "OPEN" },
      include: {
        task: {
          include: {
            assignee: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!request) {
      return { ok: false, message: "Request not found or already handled." };
    }

    const now = new Date();

    if (action === "approve-extension" && request.type === "EXTENSION") {
      const newDueRaw = formData.get("approvedDueAt")?.toString() ?? "";
      const approvedDueAt = newDueRaw
        ? new Date(newDueRaw)
        : request.proposedDueAt;
      if (!approvedDueAt || Number.isNaN(approvedDueAt.getTime())) {
        return { ok: false, message: "Pick a valid approved due date." };
      }

      await prisma.$transaction(async (tx) => {
        await tx.taskRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED",
            resolvedAt: now,
            resolvedById: user.id,
            resolutionNote,
          },
        });
        await tx.delegatedTask.update({
          where: { id: request.taskId },
          data: {
            status: "IN_PROGRESS",
            dueAt: approvedDueAt,
            emailReminderSentAt: null,
            whatsappReminderSentAt: null,
          },
        });
      });

      revalidatePath("/app/tasks");
      redirectWithToast("Extension approved. Due date updated.");
    }

    if (action === "reject") {
      await prisma.$transaction(async (tx) => {
        await tx.taskRequest.update({
          where: { id: request.id },
          data: {
            status: "REJECTED",
            resolvedAt: now,
            resolvedById: user.id,
            resolutionNote,
          },
        });
        await tx.delegatedTask.update({
          where: { id: request.taskId },
          data: { status: "IN_PROGRESS" },
        });
      });

      revalidatePath("/app/tasks");
      redirectWithToast("Request rejected. Assignee can continue working.");
    }

    if (action === "resolve") {
      await prisma.$transaction(async (tx) => {
        await tx.taskRequest.update({
          where: { id: request.id },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolvedById: user.id,
            resolutionNote,
          },
        });
        await tx.delegatedTask.update({
          where: { id: request.taskId },
          data: { status: "IN_PROGRESS" },
        });
      });

      revalidatePath("/app/tasks");
      redirectWithToast("Request marked resolved.");
    }

    return { ok: false, message: "Unknown action." };
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("resolveTaskRequest", error);
    return { ok: false, message: "Could not update request." };
  }
}

export async function cancelAssigneeRequest(taskId: string): Promise<TaskActionState> {
  try {
    const user = await getSessionUser();
    if (!user) {
      return { ok: false, message: "Sign in required." };
    }

    const task = await loadTaskForUser(taskId, user.organizationId);
    if (!task || !isTaskAssignee(user, task)) {
      return { ok: false, message: "You cannot cancel this request." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.taskRequest.updateMany({
        where: { taskId: task.id, status: "OPEN", requestedById: user.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedById: user.id,
          resolutionNote: "Cancelled by assignee",
        },
      });
      await tx.delegatedTask.update({
        where: { id: task.id },
        data: { status: "IN_PROGRESS" },
      });
    });

    revalidatePath("/app/tasks");
    redirectWithToast("Request cancelled.");
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    console.error("cancelAssigneeRequest", error);
    return { ok: false, message: "Could not cancel request." };
  }
}
