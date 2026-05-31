import { prisma } from "@/lib/db";

const SHEET_ID_PATTERN =
  /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)|^([a-zA-Z0-9-_]{20,})$/;

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

export async function resolveSpreadsheetIdForOrganization(
  organizationId: string,
): Promise<string | null> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { googleSheetId: true, slug: true },
  });

  if (!organization) {
    return null;
  }

  const fromOrg = extractSpreadsheetId(organization.googleSheetId);
  if (fromOrg) {
    return fromOrg;
  }

  const envBySlug = process.env[`GOOGLE_SHEETS_ID_${organization.slug.toUpperCase().replace(/-/g, "_")}`];
  const fromEnvSlug = extractSpreadsheetId(envBySlug);
  if (fromEnvSlug) {
    return fromEnvSlug;
  }

  // Dev-only fallback: never share one sheet across tenants in production.
  if (process.env.NODE_ENV !== "production") {
    const globalEnv = extractSpreadsheetId(
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    );
    if (globalEnv) {
      return globalEnv;
    }
  }

  const sheetLink = await prisma.workspaceLink.findFirst({
    where: {
      organizationId,
      type: "GOOGLE_SHEET",
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { url: true },
  });

  return extractSpreadsheetId(sheetLink?.url ?? null);
}
