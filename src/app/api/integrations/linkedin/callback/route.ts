import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { hasLinkedInWorkspaceAccess } from "@/lib/leads/linkedin/access";
import { exchangeLinkedInCode } from "@/lib/leads/linkedin/api";
import { getLinkedInConfig, LINKEDIN_SETTINGS_PATH, LINKEDIN_STATE_COOKIE } from "@/lib/leads/linkedin/config";
import { encryptLinkedInToken, hashState, sameSecret } from "@/lib/leads/linkedin/security";
import { tokenContext } from "@/lib/leads/linkedin/sync";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const config = getLinkedInConfig();
  if (!config) return NextResponse.json({ error: "Official LinkedIn access is not configured." }, { status: 503 });
  let returnUrl = new URL(LINKEDIN_SETTINGS_PATH, new URL(config.redirectUri).origin).toString();
  function finish(status: string) {
    const destination = new URL(returnUrl);
    destination.searchParams.set("linkedin", status);
    const response = NextResponse.redirect(destination);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(LINKEDIN_STATE_COOKIE, "", {
      httpOnly: true, secure: true, sameSite: "lax", maxAge: 0,
      path: "/api/integrations/linkedin/callback", domain: new URL(config!.redirectUri).hostname,
    });
    return response;
  }
  const state = request.nextUrl.searchParams.get("state") ?? "";
  const browserState = request.cookies.get(LINKEDIN_STATE_COOKIE)?.value ?? "";
  if (!state || state.length > 100 || !sameSecret(state, browserState)) return finish("invalid_state");
  const saved = await prisma.linkedInOAuthState.findUnique({ where: { stateHash: hashState(state) } });
  const session = await auth();
  if (!saved || saved.expiresAt <= new Date() || session?.user?.id !== saved.userId) return finish("expired");
  returnUrl = saved.returnUrl;
  // Atomically consume the state before exchanging any code; concurrent callbacks fail closed.
  const consumed = await prisma.linkedInOAuthState.deleteMany({
    where: { stateHash: saved.stateHash, expiresAt: { gt: new Date() } },
  });
  if (!consumed.count) return finish("expired");
  if (!(await hasLinkedInWorkspaceAccess(saved.organizationId, saved.userId))) return finish("access");
  if (request.nextUrl.searchParams.has("error")) return finish("cancelled");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 8192) return finish("invalid_state");
  try {
    const linkedIn = await exchangeLinkedInCode(code, config);
    const existing = await prisma.linkedInAccount.findUnique({
      where: {
        organizationId_appId_subjectId: {
          organizationId: saved.organizationId, appId: config.clientId, subjectId: linkedIn.subjectId,
        },
      },
    });
    if (existing && existing.ownerUserId !== saved.userId) return finish("account_owner");
    if (existing?.lockExpiresAt && existing.lockExpiresAt > new Date()) return finish("busy");
    const id = existing?.id ?? randomUUID();
    const encrypted = encryptLinkedInToken(linkedIn.accessToken, tokenContext({
      id, organizationId: saved.organizationId, appId: config.clientId,
    }), config);
    await prisma.linkedInAccount.upsert({
      where: { id },
      create: {
        id, organizationId: saved.organizationId, ownerUserId: saved.userId,
        appId: config.clientId, subjectId: linkedIn.subjectId, displayName: linkedIn.displayName,
        accessTokenEncrypted: encrypted, accessTokenExpiresAt: linkedIn.expiresAt, enabled: true,
      },
      update: {
        displayName: linkedIn.displayName, accessTokenEncrypted: encrypted,
        accessTokenExpiresAt: linkedIn.expiresAt, enabled: true, lastSyncError: null,
        scanStart: 0, nextSyncAt: new Date(), lockToken: null, lockExpiresAt: null,
      },
    });
    return finish("connected");
  } catch {
    // Provider error bodies can contain sensitive account/token details.
    return finish("permission");
  }
}
