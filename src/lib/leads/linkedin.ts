import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { asConfigRecord, readString } from "@/lib/leads/connection-config";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function signingKey() {
  return requiredEnv("LINKEDIN_STATE_SECRET");
}

function tokenKey() {
  return createHmac("sha256", signingKey()).update("linkedin-token-v1").digest();
}

export function linkedinRedirectUri() {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://sheetomatic.com").replace(/\/$/, "");
  return `${origin}/api/integrations/linkedin/callback`;
}

export function createLinkedInState(input: { organizationId: string; userId: string }) {
  const payload = Buffer.from(JSON.stringify({ ...input, createdAt: Date.now() })).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyLinkedInState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", signingKey()).update(payload).digest();
  const supplied = Buffer.from(signature, "base64url");
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      organizationId?: string;
      userId?: string;
      createdAt?: number;
    };
    if (!parsed.organizationId || !parsed.userId || !parsed.createdAt) return null;
    if (Date.now() - parsed.createdAt > 10 * 60 * 1000) return null;
    return parsed as { organizationId: string; userId: string; createdAt: number };
  } catch {
    return null;
  }
}

export function linkedInAuthorizationUrl(state: string) {
  const scopes = (process.env.LINKEDIN_OAUTH_SCOPES ?? "openid profile email")
    .split(/[ ,]+/).filter(Boolean).join(" ");
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", requiredEnv("LINKEDIN_CLIENT_ID"));
  url.searchParams.set("redirect_uri", linkedinRedirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scopes);
  return url.toString();
}

function encryptToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptLinkedInToken(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== "v1" || !iv || !tag || !encrypted) throw new Error("Invalid LinkedIn token.");
  const decipher = createDecipheriv("aes-256-gcm", tokenKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

export async function completeLinkedInOAuth(input: { organizationId: string; code: string }) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: input.code,
      client_id: requiredEnv("LINKEDIN_CLIENT_ID"),
      client_secret: requiredEnv("LINKEDIN_CLIENT_SECRET"),
      redirect_uri: linkedinRedirectUri(),
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`LinkedIn token exchange failed (${response.status}).`);
  const token = await response.json() as { access_token?: string; expires_in?: number; scope?: string };
  if (!token.access_token) throw new Error("LinkedIn did not return an access token.");

  const profileResponse = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
    cache: "no-store",
  });
  if (!profileResponse.ok) throw new Error(`LinkedIn profile check failed (${profileResponse.status}).`);
  const profile = await profileResponse.json() as { sub?: string; name?: string; email?: string };
  if (!profile.sub) throw new Error("LinkedIn did not return an account ID.");

  const existing = await prisma.leadIngestConnection.findUnique({
    where: { organizationId_channel: { organizationId: input.organizationId, channel: "LINKEDIN" } },
  });
  const current = asConfigRecord(existing?.config);
  await prisma.leadIngestConnection.upsert({
    where: { organizationId_channel: { organizationId: input.organizationId, channel: "LINKEDIN" } },
    create: {
      organizationId: input.organizationId,
      channel: "LINKEDIN",
      label: "LinkedIn connections",
      enabled: true,
      config: {
        accountId: profile.sub,
        accountName: profile.name ?? "LinkedIn account",
        accountEmail: profile.email ?? null,
        encryptedAccessToken: encryptToken(token.access_token),
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
        grantedScopes: token.scope ?? process.env.LINKEDIN_OAUTH_SCOPES ?? "openid profile email",
      },
    },
    update: {
      enabled: true,
      lastSyncError: null,
      config: {
        ...current,
        accountId: profile.sub,
        accountName: profile.name ?? "LinkedIn account",
        accountEmail: profile.email ?? null,
        encryptedAccessToken: encryptToken(token.access_token),
        expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
        grantedScopes: token.scope ?? process.env.LINKEDIN_OAUTH_SCOPES ?? "openid profile email",
      },
    },
  });
}

export function linkedInConnectionFields(config: unknown) {
  const record = asConfigRecord(config);
  return {
    accountId: readString(record, "accountId"),
    accountName: readString(record, "accountName"),
    accountEmail: readString(record, "accountEmail"),
    grantedScopes: readString(record, "grantedScopes"),
    hasToken: Boolean(readString(record, "encryptedAccessToken")),
  };
}
