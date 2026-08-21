import { createHmac, timingSafeEqual } from "crypto";
import { google } from "googleapis";
import type { CellValue, SheetTab, SheetWorkbook } from "@/lib/app-builder";

export const APP_BUILDER_GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
] as const;

export const APP_BUILDER_GOOGLE_COOKIE = "ab_google_oauth";

type OAuthState = {
  orgId: string;
  nonce: string;
  exp: number;
};

export function isAppBuilderGoogleConfigured() {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim(),
  );
}

export function appBuilderGoogleRedirectUri(request: Request) {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || url.host;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    url.protocol.replace(":", "");
  return `${proto}://${host}/api/app-builder/google/callback`;
}

export function createAppBuilderOAuthClient(redirectUri: string) {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim();
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return null;
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function appBuilderOAuthFromTokens(
  redirectUri: string,
  tokens: {
    refreshToken: string;
    accessToken?: string | null;
    accessTokenExpiresAt?: Date | null;
  },
) {
  const client = createAppBuilderOAuthClient(redirectUri);
  if (!client) return null;
  client.setCredentials({
    refresh_token: tokens.refreshToken,
    access_token: tokens.accessToken ?? undefined,
    expiry_date: tokens.accessTokenExpiresAt?.getTime(),
  });
  return client;
}

function signingSecret() {
  return (
    process.env.AUTH_SECRET?.trim() ||
    process.env.AUTH_GOOGLE_SECRET?.trim() ||
    "app-builder-google"
  );
}

export function signAppBuilderGoogleState(payload: OAuthState) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", signingSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyAppBuilderGoogleState(raw: string | null): OAuthState | null {
  if (!raw || !raw.includes(".")) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", signingSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as OAuthState;
    if (!payload.orgId || !payload.nonce || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function newAppBuilderGoogleState(organizationId: string) {
  const nonce = crypto.randomUUID();
  return {
    nonce,
    signed: signAppBuilderGoogleState({
      orgId: organizationId,
      nonce,
      exp: Date.now() + 10 * 60 * 1000,
    }),
  };
}

export type AppBuilderDriveFile = {
  id: string;
  name: string;
};

function coerceCell(value: unknown): CellValue {
  if (value == null) return "";
  const text = String(value);
  if (text === "") return "";
  const num = Number(text.replace(/,/g, ""));
  if (text.trim() !== "" && Number.isFinite(num) && /^-?[\d,.]+$/.test(text.trim())) {
    return num;
  }
  return text;
}

export function valuesToTab(name: string, values: unknown[][]): SheetTab {
  const headerRow = (values[0] ?? []).map((cell, index) => {
    const label = String(cell ?? "").trim();
    return label || `Col ${index + 1}`;
  });
  const headers = headerRow.length > 0 ? headerRow : ["Column"];
  const rows = values.slice(1, 201).map((line, index) => ({
    _row: index + 2,
    cells: Object.fromEntries(
      headers.map((header, col) => [header, coerceCell(line?.[col])]),
    ),
  }));
  return { name, headers, rows };
}

export async function listAppBuilderSpreadsheets(
  oauth2: InstanceType<typeof google.auth.OAuth2>,
): Promise<AppBuilderDriveFile[]> {
  const drive = google.drive({ version: "v3", auth: oauth2 });
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    orderBy: "modifiedTime desc",
    pageSize: 25,
    fields: "files(id,name)",
    spaces: "drive",
  });
  return (res.data.files ?? [])
    .filter((file): file is { id: string; name: string } => Boolean(file.id && file.name))
    .map((file) => ({ id: file.id, name: file.name }));
}

export async function loadAppBuilderWorkbook(
  oauth2: InstanceType<typeof google.auth.OAuth2>,
  spreadsheetId: string,
): Promise<SheetWorkbook> {
  const sheets = google.sheets({ version: "v4", auth: oauth2 });
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "properties.title,sheets.properties.title",
  });
  const title = meta.data.properties?.title?.trim() || "Google Sheet";
  const tabNames = (meta.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 12);

  const tabs: Record<string, SheetTab> = {};
  for (const tabName of tabNames) {
    const values = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${tabName.replace(/'/g, "''")}'!A1:Z200`,
      majorDimension: "ROWS",
    });
    tabs[tabName] = valuesToTab(tabName, (values.data.values ?? []) as unknown[][]);
  }

  return { title, tabs };
}
