import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  appBuilderGoogleRedirectUri,
  appBuilderOAuthFromTokens,
  listAppBuilderTabs,
  loadAppBuilderWorkbook,
  mutateAppBuilderSheet,
} from "@/lib/app-builder/google";
import type { CellValue } from "@/lib/app-builder";
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
  const search = new URL(request.url).searchParams;
  const requestedId = search.get("id")?.trim();
  const spreadsheetId = requestedId || connection?.spreadsheetId;
  if (!connection || !spreadsheetId) {
    return NextResponse.json({ error: "Connect a Google Sheet first." }, { status: 400 });
  }
  const metaOnly = search.get("meta") === "1";
  const tab = search.get("tab")?.trim() || null;
  const headerRow = Number(search.get("headerRow") || "1");

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
    if (metaOnly) {
      const meta = await listAppBuilderTabs(oauth2, spreadsheetId);
      return NextResponse.json(meta);
    }
    const workbook = await loadAppBuilderWorkbook(oauth2, spreadsheetId, {
      tab,
      headerRow: Number.isFinite(headerRow) ? headerRow : 1,
    });
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

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const connection = await prisma.appBuilderGoogleConnection.findUnique({
    where: { organizationId: user.organizationId },
  });
  const body = (await request.json().catch(() => null)) as {
    spreadsheetId?: string;
    action?: "append" | "update" | "delete";
    tab?: string;
    headers?: string[];
    cells?: Record<string, CellValue>;
    row?: number;
  } | null;
  const spreadsheetId = body?.spreadsheetId?.trim() || connection?.spreadsheetId;
  if (!connection || !spreadsheetId || !body?.action || !body.tab) {
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
    if (body.action === "append") {
      await mutateAppBuilderSheet(oauth2, spreadsheetId, {
        action: "append",
        tab: body.tab,
        headers: body.headers || Object.keys(body.cells || {}),
        cells: body.cells || {},
      });
    } else if (body.action === "update") {
      if (!body.row) {
        return NextResponse.json({ error: "Missing row." }, { status: 400 });
      }
      await mutateAppBuilderSheet(oauth2, spreadsheetId, {
        action: "update",
        tab: body.tab,
        headers: body.headers || Object.keys(body.cells || {}),
        row: body.row,
        cells: body.cells || {},
      });
    } else {
      if (!body.row) {
        return NextResponse.json({ error: "Missing row." }, { status: 400 });
      }
      await mutateAppBuilderSheet(oauth2, spreadsheetId, {
        action: "delete",
        tab: body.tab,
        row: body.row,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[app-builder google mutate]", error);
    return NextResponse.json(
      { error: "Could not write to that Sheet. Reconnect Google and allow edit access." },
      { status: 400 },
    );
  }
}
