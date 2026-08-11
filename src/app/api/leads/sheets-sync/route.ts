import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import { syncLeadsTwoWay } from "@/lib/leads/google-sheets-export";
import {
  formatLeadSyncCounts,
  formatLeadSyncError,
} from "@/lib/leads/sync-messages";
import { hasMinimumRole } from "@/lib/permissions";
import { hasWorkspaceModule } from "@/lib/workspace-modules";

/**
 * Interactive Google Sheets sync via Route Handler (clear maxDuration).
 * Server Actions that ran past ~60s were killed mid-flight → CRM "unexpected
 * response" + Neon pool exhaustion.
 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Sign in required." },
        { status: 401 },
      );
    }
    if (!hasWorkspaceModule(user, "CRM")) {
      return NextResponse.json(
        { ok: false, message: "CRM module not available." },
        { status: 403 },
      );
    }
    if (!hasMinimumRole(user.role, "ADMIN")) {
      return NextResponse.json(
        { ok: false, message: "Admin only." },
        { status: 403 },
      );
    }

    let forceFull = false;
    try {
      const body = (await request.json()) as { forceFull?: unknown };
      forceFull = body?.forceFull === true;
    } catch {
      forceFull = false;
    }

    const result = await syncLeadsTwoWay(user.organizationId, {
      forceFull,
      interactive: true,
      exportBack: false,
    });

    revalidatePath("/app/leads");
    revalidatePath("/app/leads/settings");

    if (!result.ok) {
      const exportMessage =
        result.reason === "export_failed" &&
        "message" in result &&
        typeof result.message === "string"
          ? result.message
          : null;

      return NextResponse.json({
        ok: false,
        message: exportMessage ?? formatLeadSyncError(result.reason),
      });
    }

    const exported =
      "exported" in result && typeof result.exported === "number"
        ? result.exported
        : 0;
    const baseMessage = formatLeadSyncCounts(result.counts, result.partial);
    const message =
      exported > 0
        ? `${baseMessage} · Pushed ${exported} row${exported === 1 ? "" : "s"} to sheet`
        : baseMessage;

    return NextResponse.json({
      ok: true,
      message,
      imported: result.imported,
      counts: result.counts,
      partial: result.partial ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Sync failed. Try again in a moment.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
