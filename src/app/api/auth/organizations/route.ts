import { NextResponse } from "next/server";
import { resolveOrganizationsForCredentials } from "@/lib/auth-orgs";

export async function POST(request: Request) {
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
    console.error("[auth/organizations]", error);
    return NextResponse.json(
      { error: "Could not reach the database. Restart the dev server if this persists." },
      { status: 503 },
    );
  }
}
