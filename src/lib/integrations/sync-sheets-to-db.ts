import type { ApprovalStatus } from "@prisma/client";
import { fetchDashboardRowsFromGoogleSheets } from "@/lib/integrations/google-sheets-dashboard";
import { prisma } from "@/lib/db";

async function upsertApprovalsFromSheet(
  organizationId: string,
  approvals: Array<{
    sheetRowKey: string;
    title: string;
    department: string;
    status: ApprovalStatus;
    minRole: import("@prisma/client").Role;
    pendingSince: Date;
  }>,
) {
  for (const row of approvals) {
    await prisma.workspaceApproval.upsert({
      where: {
        organizationId_sheetRowKey: {
          organizationId,
          sheetRowKey: row.sheetRowKey,
        },
      },
      create: {
        organizationId,
        sheetRowKey: row.sheetRowKey,
        title: row.title,
        department: row.department,
        status: row.status,
        minRole: row.minRole,
        pendingSince: row.pendingSince,
      },
      update: {
        title: row.title,
        department: row.department,
        status: row.status,
        minRole: row.minRole,
        pendingSince: row.pendingSince,
      },
    });
  }
}

export async function syncWorkspaceDashboardFromGoogleSheets(
  organizationId: string,
) {
  const fetched = await fetchDashboardRowsFromGoogleSheets(organizationId);
  if (!fetched) {
    throw new Error(
      "Google Sheets is not configured. Add service account credentials and a spreadsheet ID in Settings.",
    );
  }

  const { rows } = fetched;

  await prisma.$transaction([
    prisma.workspaceMetricCard.deleteMany({ where: { organizationId } }),
    prisma.workspaceFollowUp.deleteMany({ where: { organizationId } }),
    prisma.workspacePendingPayment.deleteMany({ where: { organizationId } }),
  ]);

  if (rows.metricCards.length > 0) {
    await prisma.workspaceMetricCard.createMany({
      data: rows.metricCards.map((card) => ({
        organizationId,
        label: card.label,
        value: card.value,
        tone: card.tone,
        minRole: card.minRole,
        actionLabel: card.actionLabel,
        actionHref: card.actionHref,
        sortOrder: card.sortOrder,
      })),
    });
  }

  if (rows.followUps.length > 0) {
    await prisma.workspaceFollowUp.createMany({
      data: rows.followUps.map((row, index) => ({
        organizationId,
        clientName: row.clientName,
        followUpAt: row.followUpAt,
        remarks: row.remarks,
        minRole: row.minRole,
        assigneeUserId: row.assigneeUserId,
        sortOrder: index,
      })),
    });
  }

  if (rows.pendingPayments.length > 0) {
    await prisma.workspacePendingPayment.createMany({
      data: rows.pendingPayments.map((row, index) => ({
        organizationId,
        clientName: row.clientName,
        amount: row.amount,
        dueAt: row.dueAt,
        minRole: row.minRole,
        sortOrder: index,
      })),
    });
  }

  if (rows.approvals.length > 0) {
    await upsertApprovalsFromSheet(organizationId, rows.approvals);
  }

  return {
    spreadsheetId: fetched.spreadsheetId,
    counts: {
      metrics: rows.metricCards.length,
      followUps: rows.followUps.length,
      payments: rows.pendingPayments.length,
      approvals: rows.approvals.length,
    },
  };
}

export async function syncApprovalsFromGoogleSheets(organizationId: string) {
  const fetched = await fetchDashboardRowsFromGoogleSheets(organizationId);
  if (!fetched) {
    return null;
  }

  if (fetched.rows.approvals.length > 0) {
    await upsertApprovalsFromSheet(organizationId, fetched.rows.approvals);
  }

  return fetched.rows.approvals.filter((row) => row.status === "PENDING").length;
}
