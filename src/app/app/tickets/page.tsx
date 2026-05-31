import { redirect } from "next/navigation";

export default function LegacyTicketsRedirect() {
  redirect("/ai/app/tickets");
}
