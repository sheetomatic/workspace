import { isEmailConfigured } from "@/lib/integrations/email";
import { readUpdatesBody } from "@/lib/website-updates-http";
import { updatesSignupSchema } from "@/lib/website-updates-input";
import { allowUpdatesRequest, requestWebsiteUpdates, tokenHash } from "@/lib/website-updates";
export async function POST(request: Request) {
  try {
    const input = updatesSignupSchema.safeParse(await readUpdatesBody(request));
    if (!input.success) return Response.json({ error: "Enter a valid email and agree to receive updates." }, { status: 400 });
    if (!isEmailConfigured()) return Response.json({ error: "Email signup is temporarily unavailable. Please try later." }, { status: 503 });
    const network = tokenHash(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown");
    if (!(await allowUpdatesRequest(`network:${network}`, 20)) || !(await allowUpdatesRequest(`email:${tokenHash(input.data.email)}`, 3))) return Response.json({ error: "Please wait before trying again." }, { status: 429 });
    await requestWebsiteUpdates(input.data);
    return Response.json({ message: "If confirmation is needed, check your inbox and spam folder. Confirm your email to receive updates; you can retry after 10 minutes." });
  } catch (error) {
    if (error instanceof Response) return error;
    return Response.json({ error: "We couldn't complete your signup. Please try again later." }, { status: 503 });
  }
}
