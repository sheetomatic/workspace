import { google } from "googleapis";

export type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
};

export function getGoogleSheetsCredentials(): ServiceAccountCredentials | null {
  const rawJson = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as ServiceAccountCredentials;
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {
      return null;
    }
  }

  const email = process.env.GOOGLE_SHEETS_CLIENT_EMAIL?.trim();
  const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (email && key) {
    return { client_email: email, private_key: key };
  }

  return null;
}

export function isGoogleSheetsAuthConfigured() {
  return getGoogleSheetsCredentials() !== null;
}

export function getGoogleSheetsServiceAccountEmail() {
  return getGoogleSheetsCredentials()?.client_email ?? null;
}

export function createGoogleSheetsClient() {
  return createGoogleSheetsClientWithScope([
    "https://www.googleapis.com/auth/spreadsheets.readonly",
  ]);
}

export function createGoogleSheetsWriteClient() {
  return createGoogleSheetsClientWithScope([
    "https://www.googleapis.com/auth/spreadsheets",
  ]);
}

/**
 * Mint a short-lived, read-only Calendar token from the service account that is
 * already configured for Google integrations. The target calendar still has
 * to be explicitly shared with that service-account address.
 */
export async function getGoogleCalendarReadAccessToken() {
  const credentials = getGoogleSheetsCredentials();
  if (!credentials) return null;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });
  const token = await auth.getAccessToken();
  return typeof token === "string" && token.trim() ? token : null;
}

function createGoogleSheetsClientWithScope(scopes: string[]) {
  const credentials = getGoogleSheetsCredentials();
  if (!credentials) {
    return null;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes,
  });

  return google.sheets({ version: "v4", auth });
}
