import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";

export default async function MySpaceSocialRedirectPage() {
  await requireSession("STAFF", { module: "SOCIAL" });
  redirect("/app/social");
}
