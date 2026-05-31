import { redirect } from "next/navigation";

export default function LegacyContactsRedirect() {
  redirect("/ai/app/contacts");
}
