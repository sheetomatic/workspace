import "server-only";
import type { LinkedInConfig } from "./config";

type JsonObject = Record<string, unknown>;

export class LinkedInApiError extends Error {
  constructor(public readonly status: number) {
    super(status === 401
      ? "LinkedIn authorisation expired. Reconnect your account."
      : status === 403
        ? "LinkedIn has not granted the required Invitations API access."
        : status === 429
          ? "LinkedIn's request limit was reached. Sync will retry later."
          : "LinkedIn could not complete this sync. Please try again later.");
  }
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject : {};
}

function text(value: unknown, limit = 500): string | null {
  return typeof value === "string" ? value.trim().slice(0, limit) || null : null;
}

function localized(value: unknown): string | null {
  if (typeof value === "string") return text(value);
  const field = object(value);
  const values = object(field.localized);
  const locale = object(field.preferredLocale);
  const preferred = `${String(locale.language ?? "")}_${String(locale.country ?? "")}`;
  return text(values[preferred]) ?? Object.values(values).map((item) => text(item)).find(Boolean) ?? null;
}

async function readJson(response: Response): Promise<JsonObject> {
  if (!response.ok) throw new LinkedInApiError(response.status);
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("LinkedIn returned an unexpected response.");
  }
  return data as JsonObject;
}

export type AcceptedInvitation = {
  invitationUrn: string;
  memberUrn: string;
  name: string | null;
  headline: string | null;
  profileUrl: string | null;
};

export function parseAcceptedInvitation(value: unknown): AcceptedInvitation | null {
  const row = object(value);
  if (row.state !== "ACCEPTED") return null;
  const invitationUrn = text(row.id);
  const memberUrn = text(row.invitee);
  if (!invitationUrn || !/^urn:li:invitation:[A-Za-z0-9_-]+$/.test(invitationUrn) ||
      !memberUrn || !/^urn:li:person:[A-Za-z0-9_-]+$/.test(memberUrn)) return null;
  const person = object(row["invitee~"]);
  const name = [localized(person.firstName), localized(person.lastName)].filter(Boolean).join(" ");
  const vanityName = text(person.vanityName, 200);
  return {
    invitationUrn,
    memberUrn,
    name: name || null,
    headline: localized(person.headline),
    profileUrl: vanityName && /^[\p{L}\p{N}_-]+$/u.test(vanityName)
      ? `https://www.linkedin.com/in/${encodeURIComponent(vanityName)}/` : null,
  };
}

export async function getAcceptedInvitations(
  accessToken: string, config: LinkedInConfig, start: number, count = 50,
) {
  const url = new URL("https://api.linkedin.com/v2/invitations");
  url.searchParams.set("q", "inviter"); // Only invitations sent by this authenticated member.
  url.searchParams.set("states", "ACCEPTED");
  url.searchParams.set("start", String(start));
  url.searchParams.set("count", String(count));
  const decoration = config.profileFields.length
    ? `,invitee~person(${config.profileFields.join(",")})` : "";
  url.searchParams.set("projection", `(elements*(id,state,invitee${decoration}),paging)`);
  const data = await readJson(await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, "X-RestLi-Protocol-Version": "2.0.0" },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
  }));
  if (!Array.isArray(data.elements)) throw new Error("LinkedIn returned an unexpected invitation list.");
  const paging = object(data.paging);
  if (paging.start !== start || typeof paging.count !== "number" ||
      !Number.isSafeInteger(paging.count) || paging.count < 0 ||
      typeof paging.total !== "number" || !Number.isSafeInteger(paging.total) || paging.total < 0) {
    throw new Error("LinkedIn pagination changed. Please retry the sync.");
  }
  const nextStart = start + data.elements.length;
  const complete = nextStart >= paging.total;
  if (!complete && !data.elements.length) throw new Error("LinkedIn returned an incomplete invitation page.");
  const accepted = data.elements.map(parseAcceptedInvitation).filter((item) => item !== null);
  return { accepted, nextStart, complete, skipped: data.elements.length - accepted.length };
}

export async function exchangeLinkedInCode(code: string, config: LinkedInConfig) {
  const data = await readJson(await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: config.redirectUri,
      client_id: config.clientId, client_secret: config.clientSecret,
    }),
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
  }));
  const accessToken = text(data.access_token, 16_384);
  if (!accessToken || typeof data.expires_in !== "number" || !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0 || data.expires_in > 366 * 24 * 3600) {
    throw new Error("LinkedIn did not return a valid access token.");
  }
  // No unverified JWT claims: identity comes from the authenticated userinfo API.
  const profile = await readJson(await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
  }));
  const subjectId = text(profile.sub, 300);
  if (!subjectId) throw new Error("LinkedIn did not identify the connected account.");
  // Sign-in permission is not proof of Invitations API permission.
  await getAcceptedInvitations(accessToken, config, 0, 1);
  return {
    accessToken,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
    subjectId,
    displayName: text(profile.name, 200) ?? "LinkedIn account",
  };
}
