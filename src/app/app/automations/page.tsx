import { redirect } from "next/navigation";

export default function LegacyAutomationsRedirect() {
  redirect("/ai/app/automations");
}
