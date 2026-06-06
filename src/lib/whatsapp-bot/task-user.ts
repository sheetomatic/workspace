import type { Role, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { notifyTaskAssigner } from "@/lib/task-notifications";
import {
  ACTIVE_TASK_STATUSES,
  formatTaskDue,
  getTaskChartData,
  getTaskStats,
  TASK_STATUS_LABELS,
  type TaskChartData,
} from "@/lib/tasks";
import { isTaskActiveStatus } from "@/lib/task-due-urgency";
import type { SessionUser } from "@/lib/auth";

export const WA_TASK_ACTION = {
  PREFIX: "task_",
  START: "task_start:",
  DONE: "task_done:",
  HELP: "task_help:",
  PICK: "task_pick:",
} as const;

export type WhatsAppTeamMember = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userId: string;
  userName: string;
  role: Role;
  phone: string;
};

function toSessionUser(member: WhatsAppTeamMember): SessionUser {
  return {
    id: member.userId,
    email: "",
    name: member.userName,
    role: member.role,
    organizationId: member.organizationId,
    organizationName: member.organizationName,
    organizationSlug: member.organizationSlug,
    isSuperAdmin: false,
    isDepartmentHead: false,
    modules: [],
  };
}

export function parseTaskActionButtonId(id: string | undefined | null) {
  if (!id?.startsWith(WA_TASK_ACTION.PREFIX)) {
    return null;
  }

  if (id.startsWith(WA_TASK_ACTION.START)) {
    return { action: "start" as const, taskId: id.slice(WA_TASK_ACTION.START.length) };
  }
  if (id.startsWith(WA_TASK_ACTION.DONE)) {
    return { action: "done" as const, taskId: id.slice(WA_TASK_ACTION.DONE.length) };
  }
  if (id.startsWith(WA_TASK_ACTION.HELP)) {
    return { action: "help" as const, taskId: id.slice(WA_TASK_ACTION.HELP.length) };
  }
  if (id.startsWith(WA_TASK_ACTION.PICK)) {
    return { action: "pick" as const, taskId: id.slice(WA_TASK_ACTION.PICK.length) };
  }

  return null;
}

export function parseTaskTextCommand(text: string) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "my tasks" || lower === "tasks" || lower === "mytasks") {
    return { kind: "my_tasks" as const };
  }

  if (
    lower === "performance" ||
    lower === "stats" ||
    lower === "report" ||
    lower === "team performance" ||
    lower === "team stats"
  ) {
    return { kind: "performance" as const };
  }

  const actionMatch = lower.match(
    /^(start|done|complete|help|update)\s+([a-f0-9]{6,})(?:\s+([\s\S]+))?$/,
  );
  if (actionMatch) {
    const verb = actionMatch[1];
    const shortId = actionMatch[2];
    const note = actionMatch[3]?.trim() || null;
    const action: "start" | "done" | "help" | "update" =
      verb === "start"
        ? "start"
        : verb === "done" || verb === "complete"
          ? "done"
          : verb === "help"
            ? "help"
            : "update";
    return { kind: "task_action" as const, action, shortId, note };
  }

  return null;
}

export async function findTaskForMember(
  member: WhatsAppTeamMember,
  taskIdOrShort: string,
) {
  const needle = taskIdOrShort.toLowerCase();
  const visibility = hasMinimumRole(member.role, "MANAGER")
    ? { organizationId: member.organizationId }
    : { organizationId: member.organizationId, assigneeUserId: member.userId };

  if (needle.length >= 20) {
    return prisma.delegatedTask.findFirst({
      where: { ...visibility, id: taskIdOrShort },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  const tasks = await prisma.delegatedTask.findMany({
    where: {
      ...visibility,
      id: { startsWith: needle },
    },
    take: 5,
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { dueAt: "asc" },
  });

  if (tasks.length === 1) {
    return tasks[0];
  }

  return null;
}

export async function listActiveTasksForMember(member: WhatsAppTeamMember) {
  const where = hasMinimumRole(member.role, "MANAGER")
    ? {
        organizationId: member.organizationId,
        status: { in: ACTIVE_TASK_STATUSES },
      }
    : {
        organizationId: member.organizationId,
        assigneeUserId: member.userId,
        status: { in: ACTIVE_TASK_STATUSES },
      };

  return prisma.delegatedTask.findMany({
    where,
    include: {
      assignee: { select: { name: true, email: true } },
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: 10,
  });
}

export function formatMyTasksReply(
  member: WhatsAppTeamMember,
  tasks: Awaited<ReturnType<typeof listActiveTasksForMember>>,
) {
  const scope = hasMinimumRole(member.role, "MANAGER") ? "Team tasks" : "Your tasks";

  if (tasks.length === 0) {
    return [
      `*${scope}*`,
      "",
      hasMinimumRole(member.role, "MANAGER")
        ? "No active tasks in the workspace right now."
        : "You have no active tasks. Reply *menu* for options.",
    ].join("\n");
  }

  const lines = tasks.map((task, index) => {
    const assignee =
      hasMinimumRole(member.role, "MANAGER") && task.assignee
        ? ` - ${task.assignee.name ?? task.assignee.email.split("@")[0]}`
        : "";
    return [
      `${index + 1}. ${task.title}`,
      `   ${TASK_STATUS_LABELS[task.status]} | Due ${formatTaskDue(task.dueAt)}${assignee}`,
      `   ID: ${task.id.slice(0, 8)}`,
    ].join("\n");
  });

  return [
    `*${scope}* (${tasks.length} active)`,
    "",
    ...lines,
    "",
    "Update a task:",
    "- start <id> - mark in progress",
    "- done <id> - mark complete",
    "- help <id> - ask assigner for help",
    "",
    "Example: done abc12345 finished the edit",
  ].join("\n");
}

export function formatPerformanceReply(
  member: WhatsAppTeamMember,
  stats: Awaited<ReturnType<typeof getTaskStats>>,
  charts: TaskChartData,
) {
  const scope = hasMinimumRole(member.role, "MANAGER")
    ? "Team performance"
    : "Your performance";

  const statusLines =
    charts.statusBreakdown.length > 0
      ? charts.statusBreakdown
          .slice(0, 5)
          .map((row) => `- ${row.name}: ${row.value}`)
          .join("\n")
      : "- No tasks yet";

  const weekTotal = charts.weeklyCompleted.reduce((sum, row) => sum + row.completed, 0);
  const weekLine = charts.weeklyCompleted
    .map((row) => `${row.label}: ${row.completed}`)
    .join(" | ");

  return [
    `*${scope}*`,
    "",
    "*Today*",
    `Pending: ${stats.pending}`,
    `In progress: ${stats.inProgress}`,
    `Completed today: ${stats.completedToday}`,
    `Overdue: ${stats.overdue}`,
    "",
    "*By status*",
    statusLines,
    "",
    `*Last 7 days:* ${weekTotal} completed`,
    weekLine,
    "",
    hasMinimumRole(member.role, "MANAGER")
      ? "Open the Tasks workspace for charts and export."
      : "Reply *my tasks* to see what needs action.",
  ].join("\n");
}

export async function getPerformanceForMember(member: WhatsAppTeamMember) {
  const user = toSessionUser(member);
  const [stats, charts] = await Promise.all([
    getTaskStats(user),
    getTaskChartData(user),
  ]);
  return formatPerformanceReply(member, stats, charts);
}

export async function updateTaskStatusForMember(
  member: WhatsAppTeamMember,
  taskId: string,
  status: TaskStatus,
  note?: string | null,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const task = await prisma.delegatedTask.findFirst({
    where: { id: taskId, organizationId: member.organizationId },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  if (!task) {
    return { ok: false, message: "Task not found. Check the ID and try again." };
  }

  const isAssignee = task.assigneeUserId === member.userId;
  const isManager = hasMinimumRole(member.role, "MANAGER");

  if (!isAssignee && !isManager) {
    return { ok: false, message: "You can only update tasks assigned to you." };
  }

  if (task.status === "COMPLETED" && status !== "COMPLETED") {
    return { ok: false, message: "This task is already completed." };
  }

  if (status === "COMPLETED") {
    const completedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.delegatedTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completedAt,
          instructions: note
            ? [task.instructions, `WhatsApp completion: ${note}`]
                .filter(Boolean)
                .join("\n\n")
            : task.instructions
              ? task.instructions
              : note
                ? `WhatsApp completion: ${note}`
                : task.instructions,
        },
      });
      await tx.taskRequest.updateMany({
        where: { taskId: task.id, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolvedAt: completedAt,
          resolvedById: member.userId,
        },
      });
    });

    return {
      ok: true,
      message: `*Done* - "${task.title}" marked complete.${note ? `\nNote saved.` : ""}`,
    };
  }

  if (status === "IN_PROGRESS" && !isTaskActiveStatus(task.status)) {
    return {
      ok: false,
      message: `Task is ${TASK_STATUS_LABELS[task.status].toLowerCase()}. Resolve that request on the web app first.`,
    };
  }

  if (status === "HELP_REQUESTED") {
    const message =
      note?.trim() ||
      "I need help completing this task. Please advise on WhatsApp or the workspace.";

    await prisma.$transaction(async (tx) => {
      await tx.taskRequest.updateMany({
        where: { taskId: task.id, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedById: member.userId,
        },
      });
      await tx.taskRequest.create({
        data: {
          organizationId: member.organizationId,
          taskId: task.id,
          type: "HELP",
          status: "OPEN",
          message,
          requestedById: member.userId,
        },
      });
      await tx.delegatedTask.update({
        where: { id: task.id },
        data: { status: "HELP_REQUESTED" },
      });
    });

    const assigneeName = member.userName;
    await notifyTaskAssigner({
      assignerEmail: task.createdBy.email,
      assignerName: task.createdBy.name,
      assigneeName,
      taskTitle: task.title,
      organizationName: member.organizationName,
      subject: `Help requested: ${task.title}`,
      bodyLines: [
        `${assigneeName} could not complete the task and needs your help (via WhatsApp).`,
        "",
        message,
      ],
    });

    return {
      ok: true,
      message: `*Help sent* - your manager was notified about "${task.title}".`,
    };
  }

  await prisma.delegatedTask.update({
    where: { id: task.id },
    data: { status },
  });

  return {
    ok: true,
    message: `*Updated* - "${task.title}" is now ${TASK_STATUS_LABELS[status].toLowerCase()}.`,
  };
}

export async function runTaskActionForMember(
  member: WhatsAppTeamMember,
  action: "start" | "done" | "help" | "update",
  taskIdOrShort: string,
  note?: string | null,
) {
  const task = await findTaskForMember(member, taskIdOrShort);
  if (!task) {
    return {
      ok: false as const,
      message:
        "Task not found or ambiguous ID. Reply *my tasks* to see IDs, then use start/done/help <id>.",
    };
  }

  const statusMap = {
    start: "IN_PROGRESS" as const,
    done: "COMPLETED" as const,
    help: "HELP_REQUESTED" as const,
    update: task.status,
  };

  if (action === "update") {
    return {
      ok: false as const,
      message: `Task "${task.title}" is ${TASK_STATUS_LABELS[task.status].toLowerCase()}.\nUse: start ${task.id.slice(0, 8)} | done ${task.id.slice(0, 8)} | help ${task.id.slice(0, 8)}`,
    };
  }

  return updateTaskStatusForMember(member, task.id, statusMap[action], note);
}

export function buildTaskActionButtons(taskId: string, taskTitle: string) {
  const shortTitle = taskTitle.length > 48 ? `${taskTitle.slice(0, 45)}...` : taskTitle;

  return {
    type: "button" as const,
    body: {
      text: [`*${shortTitle}*`, "", "What would you like to do?"].join("\n"),
    },
    action: {
      buttons: [
        {
          type: "reply" as const,
          reply: {
            id: `${WA_TASK_ACTION.START}${taskId}`,
            title: "Start",
          },
        },
        {
          type: "reply" as const,
          reply: {
            id: `${WA_TASK_ACTION.DONE}${taskId}`,
            title: "Mark done",
          },
        },
        {
          type: "reply" as const,
          reply: {
            id: `${WA_TASK_ACTION.HELP}${taskId}`,
            title: "Need help",
          },
        },
      ],
    },
  };
}

export function buildMyTasksList(
  member: WhatsAppTeamMember,
  tasks: Awaited<ReturnType<typeof listActiveTasksForMember>>,
) {
  const firstName = member.userName.split(/\s+/)[0] || member.userName;
  const title = hasMinimumRole(member.role, "MANAGER") ? "Team tasks" : "My tasks";

  if (tasks.length === 0) {
    return null;
  }

  return {
    type: "list" as const,
    header: { type: "text" as const, text: "Sheetomatic Tasks" },
    body: {
      text: `${firstName}, pick a task to update.`,
    },
    footer: { text: "Start, complete, or ask for help" },
    action: {
      button: "View tasks",
      sections: [
        {
          title: title.slice(0, 24),
          rows: tasks.slice(0, 10).map((task) => ({
            id: `${WA_TASK_ACTION.PICK}${task.id}`,
            title: task.title.slice(0, 24),
            description: `${TASK_STATUS_LABELS[task.status]} | ${formatTaskDue(task.dueAt)}`.slice(
              0,
              72,
            ),
          })),
        },
      ],
    },
  };
}
