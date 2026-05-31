import type { MetricTone, Role } from "@prisma/client";
import {
  createGoogleSheetsClient,
  isGoogleSheetsAuthConfigured,
} from "@/lib/integrations/google-sheets-auth";
import {
  cellAt,
  isEmptySheetRow,
  parseSheetDate,
  parseSheetInt,
  parseSheetRole,
  parseSheetTone,
} from "@/lib/integrations/google-sheets-parse";
import { resolveSpreadsheetIdForOrganization } from "@/lib/integrations/resolve-sheet-id";
import { prisma } from "@/lib/db";

export const SHEET_TABS = {
  metrics: "Metrics",
  followUps: "FollowUps",
  payments: "Payments",
  approvals: "Approvals",
} as const;

export type SheetDashboardRow = {
  metricCards: Array<{
    id: string;
    label: string;
    value: string;
    tone: MetricTone;
    minRole: Role;
    actionLabel: string;
    actionHref: string | null;
    sortOrder: number;
  }>;
  followUps: Array<{
    id: string;
    clientName: string;
    followUpAt: Date;
    remarks: string | null;
    minRole: Role;
    assigneeUserId: string | null;
  }>;
  pendingPayments: Array<{
    id: string;
    clientName: string;
    amount: string;
    dueAt: Date;
    minRole: Role;
  }>;
  approvals: Array<{
    sheetRowKey: string;
    title: string;
    department: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    minRole: Role;
    pendingSince: Date;
  }>;
};

export type GoogleSheetsConnectionStatus = {
  authConfigured: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  ready: boolean;
};

export function getGoogleSheetsConnectionStatus(
  spreadsheetId: string | null,
): GoogleSheetsConnectionStatus {
  const authConfigured = isGoogleSheetsAuthConfigured();
  const spreadsheetUrl = spreadsheetId
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    : null;

  return {
    authConfigured,
    spreadsheetId,
    spreadsheetUrl,
    ready: authConfigured && Boolean(spreadsheetId),
  };
}

async function loadAssigneeEmailMap(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, email: true } } },
  });

  const map = new Map<string, string>();
  for (const membership of memberships) {
    map.set(membership.user.email.toLowerCase(), membership.user.id);
  }
  return map;
}

function parseMetricsRows(rows: string[][]): SheetDashboardRow["metricCards"] {
  const cards: SheetDashboardRow["metricCards"] = [];

  rows.forEach((row, index) => {
    if (isEmptySheetRow(row)) {
      return;
    }

    const label = cellAt(row, 0);
    const value = cellAt(row, 1);
    if (!label || !value) {
      return;
    }

    cards.push({
      id: `sheet-metric-${index}`,
      label,
      value,
      tone: parseSheetTone(cellAt(row, 2)),
      minRole: parseSheetRole(cellAt(row, 3), "VIEWER"),
      actionLabel: cellAt(row, 4) || "Update",
      actionHref: cellAt(row, 5) || null,
      sortOrder: parseSheetInt(cellAt(row, 6), index),
    });
  });

  return cards.sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseFollowUpRows(
  rows: string[][],
  assignees: Map<string, string>,
): SheetDashboardRow["followUps"] {
  const items: SheetDashboardRow["followUps"] = [];

  rows.forEach((row, index) => {
    if (isEmptySheetRow(row)) {
      return;
    }

    const clientName = cellAt(row, 0);
    const followUpAt = parseSheetDate(cellAt(row, 1));
    if (!clientName || !followUpAt) {
      return;
    }

    const assigneeEmail = cellAt(row, 3).toLowerCase();
    const assigneeUserId = assigneeEmail
      ? (assignees.get(assigneeEmail) ?? null)
      : null;

    items.push({
      id: `sheet-followup-${index}`,
      clientName,
      followUpAt,
      remarks: cellAt(row, 2) || null,
      minRole: parseSheetRole(cellAt(row, 4), "STAFF"),
      assigneeUserId,
    });
  });

  return items;
}

function parsePaymentRows(rows: string[][]): SheetDashboardRow["pendingPayments"] {
  const items: SheetDashboardRow["pendingPayments"] = [];

  rows.forEach((row, index) => {
    if (isEmptySheetRow(row)) {
      return;
    }

    const clientName = cellAt(row, 0);
    const amount = cellAt(row, 1);
    const dueAt = parseSheetDate(cellAt(row, 2));
    if (!clientName || !amount || !dueAt) {
      return;
    }

    items.push({
      id: `sheet-payment-${index}`,
      clientName,
      amount,
      dueAt,
      minRole: parseSheetRole(cellAt(row, 3), "STAFF"),
    });
  });

  return items;
}

function parseApprovalStatus(value: string): "PENDING" | "APPROVED" | "REJECTED" {
  const normalized = value.trim().toUpperCase();
  if (normalized === "APPROVED") {
    return "APPROVED";
  }
  if (normalized === "REJECTED" || normalized === "REJECT") {
    return "REJECTED";
  }
  return "PENDING";
}

function parseApprovalRows(rows: string[][]): SheetDashboardRow["approvals"] {
  const items: SheetDashboardRow["approvals"] = [];

  rows.forEach((row, index) => {
    if (isEmptySheetRow(row)) {
      return;
    }

    const title = cellAt(row, 0);
    const department = cellAt(row, 1);
    if (!title || !department) {
      return;
    }

    const pendingSince =
      parseSheetDate(cellAt(row, 3)) ?? new Date(Date.now() - index * 3600000);

    items.push({
      sheetRowKey: `row-${index + 2}`,
      title,
      department,
      status: parseApprovalStatus(cellAt(row, 2)),
      minRole: parseSheetRole(cellAt(row, 4), "MANAGER"),
      pendingSince,
    });
  });

  return items;
}

export async function fetchDashboardRowsFromGoogleSheets(
  organizationId: string,
): Promise<{ spreadsheetId: string; rows: SheetDashboardRow } | null> {
  if (!isGoogleSheetsAuthConfigured()) {
    return null;
  }

  const spreadsheetId = await resolveSpreadsheetIdForOrganization(organizationId);
  if (!spreadsheetId) {
    return null;
  }

  const sheets = createGoogleSheetsClient();
  if (!sheets) {
    return null;
  }

  const ranges = [
    `${SHEET_TABS.metrics}!A2:G500`,
    `${SHEET_TABS.followUps}!A2:E500`,
    `${SHEET_TABS.payments}!A2:D500`,
    `${SHEET_TABS.approvals}!A2:E500`,
  ];

  let response;
  try {
    response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sheets API error";
    throw new Error(`Google Sheets: ${message}`);
  }

  const valueRanges = response.data.valueRanges ?? [];
  const [metricsRaw = [], followUpsRaw = [], paymentsRaw = [], approvalsRaw = []] =
    valueRanges.map((range) => (range.values ?? []) as string[][]);

  const assignees = await loadAssigneeEmailMap(organizationId);

  return {
    spreadsheetId,
    rows: {
      metricCards: parseMetricsRows(metricsRaw),
      followUps: parseFollowUpRows(followUpsRaw, assignees),
      pendingPayments: parsePaymentRows(paymentsRaw),
      approvals: parseApprovalRows(approvalsRaw),
    },
  };
}

export async function getSpreadsheetIdForOrganization(organizationId: string) {
  return resolveSpreadsheetIdForOrganization(organizationId);
}
