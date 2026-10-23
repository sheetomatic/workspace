import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";

export default async function ApprovalsPage() {
  await requireSession("MANAGER", { module: "APPROVALS" });
  redirect("/app/field/conveyance");
}
