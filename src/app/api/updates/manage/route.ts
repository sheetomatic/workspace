import { readUpdatesBody } from "@/lib/website-updates-http";
import { updatesManageSchema } from "@/lib/website-updates-input";
import { manageWebsiteUpdates } from "@/lib/website-updates";
export async function POST(request: Request) {
  try {
    const input = updatesManageSchema.safeParse(await readUpdatesBody(request));
    if (!input.success) return Response.json({ error: "This link is invalid." }, { status: 400 });
    const ok = await manageWebsiteUpdates(input.data.action, input.data.token);
    return Response.json(ok ? { message: input.data.action === "confirm" ? "You're subscribed to the monthly digest and new-feature announcements." : "You're unsubscribed. You will not receive product-update emails." } : { error: "This confirmation link has expired or was already used. If you haven't confirmed, please sign up again." }, { status: ok ? 200 : 400 });
  } catch (error) { return error instanceof Response ? error : Response.json({ error: "We couldn't save your choice. Please try again." }, { status: 503 }); }
}
