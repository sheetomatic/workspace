import { redirect } from "next/navigation";

export default function LegacyInboxRedirect() {
  redirect("/ai/app/inbox");
}
