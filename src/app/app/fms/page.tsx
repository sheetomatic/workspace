import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";

export default async function FmsIndexPage() {
  const user = await requireSession(undefined, { module: "FMS" });

  if (hasMinimumRole(user.role, "MANAGER")) {
    redirect("/app/fms/lines");
  }

  redirect("/app/fms/my-stops");
}
