import { redirect } from "next/navigation";

export default function ChecklistLibraryRedirectPage() {
  redirect("/app/checklists/setup");
}
