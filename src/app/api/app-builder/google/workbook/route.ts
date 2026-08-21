import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  appBuilderGoogleRedirectUri,
  appBuilderOAuthFromTokens,
  loadAppBuilderWorkbook,
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
  const requestedId = new URL(request.url).searchParams.get("id")?.trim();
  const spreadsheetId = requestedId || connection?.spreadsheetId;
  if (!connection || !spreadsheetId) {
    return NextResponse.json({ error: "Connect a Google Sheet first." }, { status: 400 });
  }

  const oauth2 = appBuilderOAuthFromTokens(
    appBuilderGoogleRedirectUri(request),
    connection,
  );
  if (!oauth2) {
    return NextResponse.json(
      { error: "Google connect is not configured." },
      { status: 503 },
    );
  }

  try {
    const workbook = await loadAppBuilderWorkbook(oauth2, spreadsheetId);
    if (!connection.spreadsheetId || connection.spreadsheetId === spreadsheetId) {
      await prisma.appBuilderGoogleConnection.update({
        where: { organizationId: user.organizationId },
        data: {
          spreadsheetId,
          spreadsheetTitle: workbook.title,
        },
      });
    }
    return NextResponse.json({ workbook });
  } catch (error) {
    console.error("[app-builder google workbook]", error);
    return NextResponse.json(
      { error: "Could not read that Sheet. Reconnect Google and try again." },
      { status: 400 },
    );
  }
}
