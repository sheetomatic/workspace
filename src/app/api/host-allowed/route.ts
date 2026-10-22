import { NextResponse } from "next/server";

/** Caddy asks this before issuing a certificate. Only our domain. */
export function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain")?.toLowerCase() ?? "";
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "sheetomatic.com").toLowerCase();
  const allowed =
    domain === root ||
    (domain.endsWith(`.${root}`) && !domain.startsWith("wa."));
  return new NextResponse(allowed ? "ok" : "no", { status: allowed ? 200 : 400 });
}
