import { NextResponse } from "next/server";
import {
  addUserCity,
  addUserCountry,
  addUserIndustry,
  addUserState,
} from "@/lib/geo/masters";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return `geo-add:${ip}`;
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(clientKey(request), 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: `Too many adds. Try again in ${rate.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  let body: {
    kind?: string;
    name?: string;
    countryId?: string;
    stateId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = body.name ?? "";
  const kind = body.kind?.trim();

  const result =
    kind === "country"
      ? await addUserCountry(name)
      : kind === "state"
        ? await addUserState(body.countryId ?? "", name)
        : kind === "city"
          ? await addUserCity(body.stateId ?? "", name)
          : kind === "industry"
            ? await addUserIndustry(name)
            : { ok: false as const, message: "Unknown kind." };

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }
  return NextResponse.json(result);
}
