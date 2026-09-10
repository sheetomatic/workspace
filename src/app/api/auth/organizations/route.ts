import { NextResponse } from "next/server";
import { resolveOrganizationsForCredentials } from "@/lib/auth-orgs";
import { checkRateLimit, rateLimitKeyFromHeaders } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = await checkRateLimit(
    rateLimitKeyFromHeaders("auth-organizations", request.headers),
    10,
    15 * 60_000,
  );
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const organizations = await resolveOrganizationsForCredentials(email, password);
    if (!organizations) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    return NextResponse.json({ organizations });
  } catch (error) {
    console.error(
      "[auth/organizations]",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "Could not load workspaces." },
      { status: 503 },
    );
  }
}
