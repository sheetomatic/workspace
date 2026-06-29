import { NextResponse } from "next/server";
import { getWorkspaceLogoForOrganization } from "@/lib/workspace-logo";
import { requireSession } from "@/lib/require-session";

export async function GET() {
  try {
    const user = await requireSession();
    const logo = await getWorkspaceLogoForOrganization(user.organizationId);
    return new NextResponse(new Uint8Array(logo.buffer), {
      headers: {
        "Content-Type": logo.mime,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
