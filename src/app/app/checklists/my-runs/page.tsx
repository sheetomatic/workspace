import { redirect } from "next/navigation";

export default function ChecklistMyRunsRedirectPage() {
  redirect("/app/checklists/my-tasks");
}
