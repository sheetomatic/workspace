import { prisma } from "@/lib/db";

const SHEET_ID_PATTERN =
  /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)|^([a-zA-Z0-9-_]{20,})$/;

const GID_PATTERN = /[?#&]gid=(\d+)/;

export function extractSpreadsheetId(input: string | null | undefined) {
  const raw = (input ?? "").trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(SHEET_ID_PATTERN);
  if (match) {
    return match[1] ?? match[2] ?? null;
  }

  return null;
}

export function extractSheetGid(input: string | null | undefined) {
  const raw = (input ?? "").trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(GID_PATTERN);
  return match?.[1] ?? null;
}

export type LegalSheetConfig = {
  spreadsheetId: string;
  gid: string | null;
};

export async function resolveLegalSheetConfig(
  organizationId: string,
): Promise<LegalSheetConfig | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { googleSheetId: true, googleSheetGid: true, slug: true },
  });

  if (!organization) {
    return null;
  }

  const spreadsheetId = extractSpreadsheetId(organization.googleSheetId);
  if (spreadsheetId) {
    return {
      spreadsheetId,
      gid:
        organization.googleSheetGid ??
        extractSheetGid(organization.googleSheetId),
    };
  }

  const envBySlug =
    process.env[
      `GOOGLE_SHEETS_ID_${organization.slug.toUpperCase().replace(/-/g, "_")}`
    ];
  const fromEnv = extractSpreadsheetId(envBySlug);
  if (fromEnv) {
    return { spreadsheetId: fromEnv, gid: extractSheetGid(envBySlug) };
  }

  if (process.env.NODE_ENV !== "production") {
    const globalEnv = extractSpreadsheetId(
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    );
    if (globalEnv) {
      return {
        spreadsheetId: globalEnv,
        gid: extractSheetGid(process.env.GOOGLE_SHEETS_SPREADSHEET_ID),
      };
    }
  }

  const sheetLink = await prisma.workspaceLink.findFirst({
    where: { organizationId, type: "GOOGLE_SHEET" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { url: true },
  });

  const fromLink = extractSpreadsheetId(sheetLink?.url ?? null);
  if (fromLink) {
    return { spreadsheetId: fromLink, gid: extractSheetGid(sheetLink?.url) };
  }

  return null;
}

export async function resolveSpreadsheetIdForOrganization(
  organizationId: string,
): Promise<string | null> {
  const config = await resolveLegalSheetConfig(organizationId);
  return config?.spreadsheetId ?? null;
}
