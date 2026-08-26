import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  appBuilderGoogleRedirectUri,
  appBuilderOAuthFromTokens,
} from "@/lib/app-builder/google";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const connection = await prisma.appBuilderGoogleConnection.findUnique({
    where: { organizationId: user.organizationId },
  });
  if (!connection) {
    return NextResponse.json({ error: "Connect Google first." }, { status: 400 });
  }
  const oauth2 = appBuilderOAuthFromTokens(
    appBuilderGoogleRedirectUri(request),
    connection,
  );
  if (!oauth2) {
    return NextResponse.json({ error: "Google is not configured." }, { status: 503 });
  }
  const token = await oauth2.getAccessToken();
  const accessToken = token.token || connection.accessToken;
  if (!accessToken) {
    return NextResponse.json({ error: "Reconnect Google." }, { status: 400 });
  }
  const clientId = process.env.AUTH_GOOGLE_ID?.trim() || "";
  const apiKey =
    process.env.GOOGLE_PICKER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_API_KEY?.trim() ||
    "";
  return NextResponse.json({
    accessToken,
    clientId,
    apiKey,
    appId: clientId.split("-")[0] || "",
  });
}
